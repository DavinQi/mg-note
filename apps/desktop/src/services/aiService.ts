import { AiConfig, AI_PRESETS, Citation, DEFAULT_AI_CONFIG } from '../types/ai';

const AI_CONFIG_KEY = 'mg-note-ai-config';

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_AI_CONFIG, ...parsed };
    }
  } catch (err) {
    console.error('Failed to load AI config from localStorage:', err);
  }
  return { ...DEFAULT_AI_CONFIG };
}

export async function saveAiConfig(config: AiConfig): Promise<void> {
  try {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    // Persist API Key in macOS Keychain if tauri core is available
    if (config.apiKey) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('store_keychain_token', {
          provider: 'ai-assistant',
          username: config.provider,
          token: config.apiKey,
        });
      } catch (_) {
        // Keychain store is optional if running in web preview
      }
    }
  } catch (err) {
    console.error('Failed to save AI config:', err);
  }
}

export async function testAiConnection(
  config: AiConfig
): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
  const startTime = Date.now();
  const baseUrl = config.baseUrl.replace(/\/+$/, '');
  const url = `${baseUrl}/chat/completions`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model: config.chatModel || AI_PRESETS[config.provider].chatModel || 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5,
      }),
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (res.ok) {
      return { ok: true, latencyMs: latency };
    }

    let detail = '';
    try {
      const data = await res.json();
      detail = data?.error?.message || data?.message || JSON.stringify(data);
    } catch (_) {
      detail = await res.text();
    }

    if (res.status === 401) {
      return { ok: false, error: `认证失败 (401)：API Key 无效或已过期。` };
    }
    if (res.status === 404) {
      return { ok: false, error: `未找到模型或接口 (404)：请检查 Base URL 或模型名称「${config.chatModel}」。` };
    }
    if (res.status === 429) {
      return { ok: false, error: `频率限制或额度不足 (429)：${detail || '账户额度耗尽'}` };
    }
    return { ok: false, error: `请求失败 (${res.status})：${detail || res.statusText}` };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: '连接超时（7秒），请检查网络连接或 Base URL 是否可达。' };
    }
    return {
      ok: false,
      error: `连接异常：${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export interface NoteContextItem {
  id: string;
  path: string;
  title: string;
  snippet?: string;
  kind?: string;
  content?: string;
}

export async function askKnowledgeBase(params: {
  question: string;
  candidateNotes: NoteContextItem[];
  config: AiConfig;
  scopeLabel: string;
}): Promise<{ answer: string; citations: Citation[] }> {
  const { question, candidateNotes, config, scopeLabel } = params;
  const qLower = question.toLowerCase();

  // 1. Calculate relevance score for candidate notes
  const scoredNotes = candidateNotes
    .map((note) => {
      let score = 0;
      const titleLower = note.title.toLowerCase();
      const textLower = (note.content || note.snippet || '').toLowerCase();

      // Title matching
      if (titleLower.includes(qLower)) score += 50;
      // Keywords split
      const words = question.split(/[\s,，?？!！、。]+/g).filter((w) => w.length >= 2);
      for (const w of words) {
        const wLower = w.toLowerCase();
        if (titleLower.includes(wLower)) score += 20;
        if (textLower.includes(wLower)) score += 5;
      }
      return { note, score };
    })
    .sort((a, b) => b.score - a.score);

  // Take top 5 notes as context
  const topMatches = scoredNotes.filter((item) => item.score > 0).slice(0, 5);
  const relevantList = topMatches.length > 0 ? topMatches.map((m) => m.note) : candidateNotes.slice(0, 3);

  const citations: Citation[] = relevantList.map((note, idx) => ({
    index: idx + 1,
    notePath: note.path,
    noteTitle: note.title,
    snippet: note.snippet || note.content?.slice(0, 160) || note.title,
  }));

  // 2. If API Key is configured and valid, call real LLM
  if (config.enabled && (config.apiKey || config.baseUrl.includes('127.0.0.1'))) {
    try {
      const contextBlocks = relevantList
        .map((n, i) => `[${i + 1}] 标题：《${n.title}》\n路径：${n.path}\n内容片段：\n${n.content?.slice(0, 1200) || n.snippet || '暂无详细文本'}`)
        .join('\n\n---\n\n');

      const systemPrompt = `你是一个专业的个人知识库 AI 助手（mg-node 笔记助手）。
你将根据用户提供的知识库参考笔记来回答用户的问题。
要求：
1. 回答需专业、结构化（善用 Markdown 标题、加粗和列表），紧扣参考笔记。
2. 结论或引用事实后，必须明确标注来源编号，如 [1] 或 [2]。
3. 若笔记中确实未提及相关内容，请如实回答「知识库中未找到相关记录」，切勿虚构不存在的内容。
4. 当前检索范围：${scopeLabel}。`;

      const userPrompt = `【知识库参考笔记】\n${contextBlocks}\n\n【用户问题】\n${question}`;

      const baseUrl = config.baseUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.chatModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) {
          return { answer: text, citations };
        }
      }
    } catch (err) {
      console.warn('LLM call failed, falling back to local synthesis:', err);
    }
  }

  // 3. Fallback: Intelligent Local Synthesis
  if (topMatches.length === 0 && candidateNotes.length === 0) {
    return {
      answer: `在「${scopeLabel}」范围内暂无任何笔记。\n\n您可以先创建笔记，或在右上方点击「服务商设置」配置 API Key。`,
      citations: [],
    };
  }

  if (topMatches.length === 0) {
    return {
      answer: `在知识库（范围：${scopeLabel}，共检索 ${candidateNotes.length} 篇笔记）中未找到与「**${question}**」直接匹配的内容。\n\n建议：\n- 换个关键词重新提问（例如：缓存、架构、方案）\n- 或在右上方切换到「服务商设置」配置 DeepSeek / OpenAI API Key 开启全能大模型问答。`,
      citations: [],
    };
  }

  // Synthesize local answer based on matched notes
  const noteList = topMatches.map((m, i) => `• **[${i + 1}] ${m.note.title}**\n  ${m.note.snippet || m.note.content?.slice(0, 100) || '包含相关关键词'}`).join('\n');

  const answer = `根据您知识库中检索到的 **${topMatches.length}** 篇相关笔记，整理结论如下：\n\n${noteList}\n\n> **来源引用**：可点击下方来源链接快速跳转至对应笔记进行查阅与编辑。\n*(当前为离线知识库检索模式；如需深层语义问答，可前往设置配置 API Key)*`;

  return { answer, citations };
}

export async function generateAiSummary(params: {
  scope: 'current' | 'week' | 'category';
  notes: NoteContextItem[];
  selectedNote?: NoteContextItem | null;
  activeCategory?: string;
  config: AiConfig;
}): Promise<string> {
  const { scope, notes, selectedNote, activeCategory, config } = params;

  let targetNotes: NoteContextItem[] = [];
  let scopeTitle = '';

  if (scope === 'current') {
    if (!selectedNote) return '请先在中间列表中选中一篇笔记后再生成单篇总结。';
    targetNotes = [selectedNote];
    scopeTitle = `笔记《${selectedNote.title}》`;
  } else if (scope === 'category') {
    targetNotes = activeCategory
      ? notes.filter((n) => n.path.startsWith(`${activeCategory}/`) || n.path === activeCategory)
      : notes;
    scopeTitle = `分类「${activeCategory || '根目录'}」下的 ${targetNotes.length} 篇笔记`;
  } else {
    // Week notes
    targetNotes = notes.slice(0, 10);
    scopeTitle = `本周近期 ${targetNotes.length} 篇笔记`;
  }

  if (targetNotes.length === 0) {
    return `所选范围（${scopeTitle}）下暂无笔记内容。`;
  }

  // If API Key is configured, use real LLM
  if (config.enabled && (config.apiKey || config.baseUrl.includes('127.0.0.1'))) {
    try {
      const summaryContext = targetNotes
        .map((n, i) => `[${i + 1}] 标题：《${n.title}》\n内容：${n.content?.slice(0, 800) || n.snippet || ''}`)
        .join('\n\n');

      const systemPrompt = `你是一个高级笔记与知识管理助手。请针对用户提供的笔记列表生成一份结构清晰、高可读性的 Markdown 总结或周报。
输出必须包含以下部分：
## 核心要点
## 待办与行动项 (Todo Checklist)
## 涉及笔记与进展
## 改进与思考建议`;

      const userPrompt = `请对以下【${scopeTitle}】进行整理总结：\n\n${summaryContext}`;

      const baseUrl = config.baseUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (config.apiKey) headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;

      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.chatModel || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.4,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (err) {
      console.warn('LLM summary failed, using local generator:', err);
    }
  }

  // Local rule-based summary generator
  const dateStr = new Date().toISOString().slice(0, 10);
  const noteItems = targetNotes.map((n, i) => `- [${i + 1}] **${n.title}** (${n.path})`).join('\n');

  return `# AI 知识库总结报告 · ${scopeTitle}
> 生成日期：${dateStr} · 共涵盖 ${targetNotes.length} 篇笔记

## 核心要点
- 本周期重点围绕知识库中关于 **${targetNotes[0]?.title || '关键业务'}** 等模块展开沉淀。
- 笔记结构完整，覆盖架构方案、问题排查与技术笔记。

## 待办与行动项
- [ ] 复核 ${targetNotes[0]?.title || '当前重点'} 的遗留待办事项 [1]
- [ ] 针对关键改动进行 git 同步与远端私有仓库备份
- [ ] 补充压测数据与边界条件验证

## 涉及笔记列表
${noteItems}

## 建议与规划
建议保持良好的两级目录归档习惯，及时将零散的碎片笔记整理至对应主题文件夹中。`;
}
