import React, { useEffect, useMemo, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import {
  AiConfig,
  AI_PRESETS,
  ChatMessage,
  Citation,
  DEFAULT_AI_CONFIG,
} from '../../types/ai';
import { NoteItem } from '../../types/note';
import {
  askKnowledgeBase,
  generateAiSummary,
  loadAiConfig,
  NoteContextItem,
  saveAiConfig,
  testAiConnection,
} from '../../services/aiService';

export const CartoonAiIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Antenna with golden glowing ball */}
    <path d="M12 2V5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="2" r="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="0.8" />
    {/* Cute Robot Head */}
    <rect x="3.5" y="5.5" width="17" height="13.5" rx="4.5" fill="#ffffff" stroke="#334155" strokeWidth="1.6" />
    {/* Left cute ear */}
    <rect x="1.5" y="9.5" width="2" height="4.5" rx="1" fill="#94a3b8" />
    {/* Right cute ear */}
    <rect x="20.5" y="9.5" width="2" height="4.5" rx="1" fill="#94a3b8" />
    {/* Cute big anime eyes with white catchlight */}
    <circle cx="8" cy="11.5" r="2.2" fill="#1e293b" />
    <circle cx="8.8" cy="10.7" r="0.8" fill="#ffffff" />
    <circle cx="16" cy="11.5" r="2.2" fill="#1e293b" />
    <circle cx="16.8" cy="10.7" r="0.8" fill="#ffffff" />
    {/* Cheerful blush */}
    <ellipse cx="6" cy="14" rx="1.5" ry="0.8" fill="#f472b6" opacity="0.8" />
    <ellipse cx="18" cy="14" rx="1.5" ry="0.8" fill="#f472b6" opacity="0.8" />
    {/* Sweet smile */}
    <path d="M10 14.5C10.8 15.6 13.2 15.6 14 14.5" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
}).use(taskLists);

interface AiAssistantDrawerProps {
  notes: NoteItem[];
  activeCategory: string;
  selectedNote: NoteItem | null;
  activeContent?: string;
  initialTab?: 'chat' | 'summary' | 'settings';
  onClose: () => void;
  onSelectNote: (path: string) => void;
  onCreateNote: (title: string, content: string) => Promise<void>;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  notes,
  activeCategory,
  selectedNote,
  activeContent,
  initialTab = 'chat',
  onClose,
  onSelectNote,
  onCreateNote,
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'summary' | 'settings'>(initialTab);
  const [config, setConfig] = useState<AiConfig>(() => loadAiConfig());
  const [showApiKey, setShowApiKey] = useState(false);
  const [testState, setTestState] = useState<{ loading: boolean; ok?: boolean; text?: string }>({
    loading: false,
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Chat Tab state
  const [chatScope, setChatScope] = useState<'all' | 'category' | 'current'>('all');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 你好！我是你的 **AI 知识库助手**。\n\n我会基于你在仓库里的笔记内容进行智能回答，并标明来源出处。您可以直接提问，或点击下方快捷问题试试看！`,
      timestamp: Date.now(),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Summary Tab state
  const [summaryScope, setSummaryScope] = useState<'current' | 'week' | 'category'>('current');
  const [summaryContent, setSummaryContent] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Convert note tree into flat candidate notes
  const candidateNotes: NoteContextItem[] = useMemo(() => {
    const list: NoteContextItem[] = [];
    const flatten = (items: NoteItem[]) => {
      for (const item of items) {
        if (!item.isFolder) {
          list.push({
            id: item.id,
            path: item.path,
            title: item.title,
            kind: item.kind,
            snippet: item.content?.slice(0, 300) || '',
            content: item.id === selectedNote?.id ? activeContent || item.content : item.content,
          });
        }
        if (item.children) flatten(item.children);
      }
    };
    flatten(notes);
    return list;
  }, [notes, selectedNote, activeContent]);

  // Scope label for UI
  const scopeLabel = useMemo(() => {
    if (chatScope === 'current') return `当前笔记: ${selectedNote?.title || '未选中'}`;
    if (chatScope === 'category') return `当前分类: ${activeCategory || '根目录'}`;
    return `全库笔记 (${candidateNotes.length} 篇)`;
  }, [chatScope, selectedNote, activeCategory, candidateNotes.length]);

  // Handle Chat Submit
  const handleSend = async (questionText?: string) => {
    const q = (questionText || inputVal).trim();
    if (!q || isGenerating) return;

    setInputVal('');
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    try {
      // Filter notes based on scope
      let filteredNotes = candidateNotes;
      if (chatScope === 'current') {
        filteredNotes = selectedNote
          ? [
              {
                id: selectedNote.id,
                path: selectedNote.path,
                title: selectedNote.title,
                content: activeContent || selectedNote.content,
              },
            ]
          : [];
      } else if (chatScope === 'category') {
        filteredNotes = activeCategory
          ? candidateNotes.filter((n) => n.path.startsWith(`${activeCategory}/`) || n.path === activeCategory)
          : candidateNotes;
      }

      const res = await askKnowledgeBase({
        question: q,
        candidateNotes: filteredNotes,
        config,
        scopeLabel,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ 生成回答时出现错误：${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Summary Generation
  const handleGenerateSummary = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setSummaryContent('');

    try {
      const summary = await generateAiSummary({
        scope: summaryScope,
        notes: candidateNotes,
        selectedNote: selectedNote
          ? {
              id: selectedNote.id,
              path: selectedNote.path,
              title: selectedNote.title,
              content: activeContent || selectedNote.content,
            }
          : null,
        activeCategory,
        config,
      });
      setSummaryContent(summary);
    } catch (err) {
      setSummaryContent(`⚠️ 生成失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Save summary as a new note in repository
  const handleSaveSummaryAsNote = async () => {
    if (!summaryContent || isSavingSummary) return;
    setIsSavingSummary(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const title = `AI-总结-${dateStr}`;
      await onCreateNote(title, summaryContent);
      alert(`✓ 已成功保存为新笔记：《${title}.md》`);
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Copy summary to clipboard
  const handleCopySummary = async () => {
    if (!summaryContent) return;
    try {
      await navigator.clipboard.writeText(summaryContent);
      setSummaryCopied(true);
      setTimeout(() => setSummaryCopied(false), 2000);
    } catch (_) {}
  };

  // Test connection
  const handleTestConnection = async () => {
    setTestState({ loading: true });
    const res = await testAiConnection(config);
    if (res.ok) {
      setTestState({ loading: false, ok: true, text: `✓ 连接成功 (耗时 ${res.latencyMs}ms)` });
    } else {
      setTestState({ loading: false, ok: false, text: `✗ ${res.error}` });
    }
  };

  // Save config
  const handleSaveConfig = async () => {
    await saveAiConfig(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div
      className="wb-ai-drawer"
      style={{
        width: '380px',
        minWidth: '340px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--c-surface, #ffffff)',
        borderLeft: '1px solid var(--c-line, #e2e8f0)',
        boxShadow: '-8px 0 24px rgba(0, 0, 0, 0.05)',
        zIndex: 40,
        position: 'relative',
      }}
    >
      {/* 1. Header */}
      <div
        className="wb-ai-header"
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--c-line, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--c-surface-2, #fafaf9)',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #fef08a 0%, #fbcfe8 50%, #fed7aa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
          }}
        >
          <CartoonAiIcon size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--c-text, #1e293b)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>AI 知识库助手</span>
            <span
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                borderRadius: '999px',
                fontWeight: 600,
                background: config.enabled ? 'var(--accent-100, #d1fae5)' : 'var(--c-surface-3, #f1f5f9)',
                color: config.enabled ? 'var(--accent-700, #047857)' : 'var(--c-muted, #64748b)',
              }}
            >
              {config.enabled ? config.provider : '已关闭'}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--c-muted, #64748b)', marginTop: '1px' }}>
            {candidateNotes.length} 篇笔记已索引 · 支持引用溯源
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="hover:bg-slate-200 dark:hover:bg-slate-700 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          title="关闭 (Esc / ⌘J)"
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      {/* 2. Tab Navigation */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--c-line, #e2e8f0)',
          padding: '4px 10px',
          gap: '6px',
          background: 'var(--c-surface, #ffffff)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: activeTab === 'chat' ? 700 : 500,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'chat' ? 'var(--accent-50, #ecfdf5)' : 'transparent',
            color: activeTab === 'chat' ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #64748b)',
            transition: 'all 0.15s ease',
          }}
        >
          💬 知识库问答
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('summary')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: activeTab === 'summary' ? 700 : 500,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'summary' ? 'var(--accent-50, #ecfdf5)' : 'transparent',
            color: activeTab === 'summary' ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #64748b)',
            transition: 'all 0.15s ease',
          }}
        >
          📝 总结与周报
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          style={{
            flex: 1,
            padding: '6px 8px',
            fontSize: '12px',
            fontWeight: activeTab === 'settings' ? 700 : 500,
            borderRadius: '7px',
            border: 'none',
            cursor: 'pointer',
            background: activeTab === 'settings' ? 'var(--accent-50, #ecfdf5)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #64748b)',
            transition: 'all 0.15s ease',
          }}
        >
          ⚙️ 服务商设置
        </button>
      </div>

      {/* 3. Tab Contents */}
      {/* TAB 1: Chat */}
      {activeTab === 'chat' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Scope selection chip bar */}
          <div
            style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--c-line, #f1f5f9)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              background: 'var(--c-surface-2, #fafaf9)',
            }}
          >
            <span style={{ color: 'var(--c-muted, #64748b)', fontWeight: 600 }}>检索范围:</span>
            <button
              type="button"
              onClick={() => setChatScope('all')}
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: chatScope === 'all' ? 'var(--accent-500, #10b981)' : 'var(--c-line, #cbd5e1)',
                background: chatScope === 'all' ? 'var(--accent-50, #ecfdf5)' : 'transparent',
                color: chatScope === 'all' ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #475569)',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
              }}
            >
              全库 ({candidateNotes.length})
            </button>
            <button
              type="button"
              onClick={() => setChatScope('category')}
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: chatScope === 'category' ? 'var(--accent-500, #10b981)' : 'var(--c-line, #cbd5e1)',
                background: chatScope === 'category' ? 'var(--accent-50, #ecfdf5)' : 'transparent',
                color: chatScope === 'category' ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #475569)',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                maxWidth: '120px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={activeCategory ? `分类: ${activeCategory}` : '根目录'}
            >
              📁 {activeCategory ? activeCategory.split('/').pop() : '根目录'}
            </button>
            <button
              type="button"
              onClick={() => setChatScope('current')}
              disabled={!selectedNote}
              style={{
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: chatScope === 'current' ? 'var(--accent-500, #10b981)' : 'var(--c-line, #cbd5e1)',
                background: chatScope === 'current' ? 'var(--accent-50, #ecfdf5)' : 'transparent',
                color: chatScope === 'current' ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #475569)',
                opacity: selectedNote ? 1 : 0.45,
                cursor: selectedNote ? 'pointer' : 'not-allowed',
                fontSize: '10px',
                fontWeight: 600,
                maxWidth: '110px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={selectedNote?.title || '未选中笔记'}
            >
              📄 当前篇
            </button>
          </div>

          {/* Messages list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '92%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    background: msg.role === 'user' ? 'var(--accent-600, #059669)' : 'var(--c-surface-2, #f8fafc)',
                    color: msg.role === 'user' ? '#ffffff' : 'var(--c-text, #1e293b)',
                    fontSize: '12.5px',
                    lineHeight: '1.6',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--c-line, #e2e8f0)',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div
                      className="wb-ai-rendered-markdown"
                      dangerouslySetInnerHTML={{ __html: md.render(msg.content) }}
                    />
                  )}
                </div>

                {/* Citations if available */}
                {msg.citations && msg.citations.length > 0 && (
                  <div
                    style={{
                      marginTop: '4px',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      background: 'var(--c-surface-3, #f1f5f9)',
                      border: '1px dashed var(--c-line, #cbd5e1)',
                      fontSize: '11px',
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--c-muted, #64748b)', marginBottom: '4px' }}>
                      🔗 来源引用笔记（点击跳转）：
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {msg.citations.map((c) => (
                        <button
                          key={c.index}
                          type="button"
                          onClick={() => onSelectNote(c.notePath)}
                          style={{
                            textAlign: 'left',
                            background: 'none',
                            border: 'none',
                            padding: '2px 0',
                            color: 'var(--accent-700, #047857)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>[{c.index}]</span>
                          <span style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}>{c.noteTitle}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: 'var(--c-surface-2, #f8fafc)',
                  border: '1px solid var(--c-line, #e2e8f0)',
                  fontSize: '12px',
                  color: 'var(--c-muted, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="animate-spin inline-block">✨</span>
                <span>正在检索相关笔记并生成回答…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions Chips */}
          <div
            style={{
              padding: '6px 12px',
              borderTop: '1px solid var(--c-line, #f1f5f9)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              background: 'var(--c-surface, #ffffff)',
            }}
          >
            {[
              '缓存穿透怎么解决？',
              '总结我的知识库',
              '有哪些重点待办？',
              '提取核心架构要点',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void handleSend(q)}
                disabled={isGenerating}
                style={{
                  padding: '4px 9px',
                  borderRadius: '999px',
                  border: '1px solid var(--accent-200, #a7f3d0)',
                  background: 'var(--accent-50, #ecfdf5)',
                  color: 'var(--accent-700, #047857)',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                💡 {q}
              </button>
            ))}
          </div>

          {/* Bottom input area */}
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--c-line, #e2e8f0)',
              background: 'var(--c-surface, #ffffff)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="问问你的笔记… (↵ 回车发送)"
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '9px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '12.5px',
                  outline: 'none',
                  background: 'var(--c-surface, #ffffff)',
                  color: 'var(--c-text, #1e293b)',
                }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isGenerating || !inputVal.trim()}
                style={{
                  padding: '8px 14px',
                  borderRadius: '9px',
                  border: 'none',
                  background: 'var(--accent-600, #059669)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: inputVal.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                  opacity: inputVal.trim() && !isGenerating ? 1 : 0.6,
                }}
              >
                发送
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: 'var(--c-muted, #94a3b8)' }}>
              <span>范围: {scopeLabel}</span>
              <button
                type="button"
                onClick={() => setMessages([])}
                style={{ background: 'none', border: 'none', color: 'var(--c-muted, #94a3b8)', cursor: 'pointer' }}
                title="清空当前问答历史"
              >
                清空对话
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Summary */}
      {activeTab === 'summary' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: '14px', gap: '12px', overflowY: 'auto' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--c-text, #1e293b)', marginBottom: '6px' }}>
              总结范围选择
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
              {[
                { id: 'current', label: '📄 当前笔记' },
                { id: 'week', label: '📅 本周笔记' },
                { id: 'category', label: `📁 ${activeCategory ? activeCategory.split('/').pop() : '当前分类'}` },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSummaryScope(item.id as 'current' | 'week' | 'category')}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: summaryScope === item.id ? 'var(--accent-500, #10b981)' : 'var(--c-line, #cbd5e1)',
                    background: summaryScope === item.id ? 'var(--accent-50, #ecfdf5)' : 'var(--c-surface, #ffffff)',
                    color: summaryScope === item.id ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #475569)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateSummary}
            disabled={isSummarizing}
            style={{
              width: '100%',
              padding: '9px 0',
              borderRadius: '9px',
              border: 'none',
              background: 'var(--accent-600, #059669)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSummarizing ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
            }}
          >
            <span>{isSummarizing ? '⟳' : '⚡'}</span>
            <span>{isSummarizing ? '正在智能整理生成中…' : '开始生成总结与周报'}</span>
          </button>

          {/* Generated Result */}
          {summaryContent && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                background: 'var(--c-surface-2, #fafaf9)',
                border: '1px solid var(--c-line, #e2e8f0)',
                borderRadius: '10px',
                padding: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--c-line, #e2e8f0)', paddingBottom: '6px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--c-text, #1e293b)' }}>生成的总结内容</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--c-line, #cbd5e1)',
                      background: '#ffffff',
                      fontSize: '10.5px',
                      cursor: 'pointer',
                    }}
                  >
                    {summaryCopied ? '✓ 已复制' : '📋 复制'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSummaryAsNote}
                    disabled={isSavingSummary}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--accent-600, #059669)',
                      color: '#ffffff',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    💾 存为新笔记
                  </button>
                </div>
              </div>

              <div
                className="wb-ai-rendered-markdown"
                style={{ fontSize: '12px', lineHeight: '1.6', overflowY: 'auto', maxHeight: '360px' }}
                dangerouslySetInnerHTML={{ __html: md.render(summaryContent) }}
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Settings */}
      {activeTab === 'settings' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Enable toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '9px',
              background: 'var(--c-surface-2, #fafaf9)',
              border: '1px solid var(--c-line, #e2e8f0)',
            }}
          >
            <div>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--c-text, #1e293b)' }}>启用 AI 知识库助手</div>
              <div style={{ fontSize: '10.5px', color: 'var(--c-muted, #64748b)' }}>支持引用问答、总结与周报生成</div>
            </div>
            <button
              type="button"
              onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
              style={{
                width: '42px',
                height: '24px',
                borderRadius: '999px',
                background: config.enabled ? 'var(--accent-600, #059669)' : '#cbd5e1',
                border: 'none',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: config.enabled ? '20px' : '2px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {/* Provider selector */}
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '6px' }}>
              模型服务商 (OpenAI 协议兼容)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {(['DeepSeek', 'OpenAI', '通义千问', 'Ollama 本地', '自定义'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const preset = AI_PRESETS[p];
                    setConfig((prev) => ({
                      ...prev,
                      provider: p,
                      baseUrl: preset.baseUrl || prev.baseUrl,
                      chatModel: preset.chatModel || prev.chatModel,
                      embeddingModel: preset.embeddingModel || prev.embeddingModel,
                    }));
                  }}
                  style={{
                    padding: '6px 4px',
                    borderRadius: '7px',
                    border: '1px solid',
                    borderColor: config.provider === p ? 'var(--accent-500, #10b981)' : 'var(--c-line, #cbd5e1)',
                    background: config.provider === p ? 'var(--accent-50, #ecfdf5)' : '#ffffff',
                    color: config.provider === p ? 'var(--accent-700, #047857)' : 'var(--c-text-2, #475569)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '4px' }}>
              Base URL
            </div>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '7px',
                border: '1px solid var(--c-line, #cbd5e1)',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* API Key */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text-2, #475569)' }}>API Key</span>
              <button
                type="button"
                onClick={() => setShowApiKey((prev) => !prev)}
                style={{ background: 'none', border: 'none', color: 'var(--c-muted, #64748b)', fontSize: '10.5px', cursor: 'pointer' }}
              >
                {showApiKey ? '隐藏 Key' : '显示 Key'}
              </button>
            </div>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
              placeholder={AI_PRESETS[config.provider].placeholderKey}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '7px',
                border: '1px solid var(--c-line, #cbd5e1)',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
            <div style={{ fontSize: '10px', color: 'var(--c-muted, #94a3b8)', marginTop: '3px' }}>
              🔒 仅保存在本机钥匙串与配置中，永远不会写入 Git 仓库。
            </div>
          </div>

          {/* Model selection */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '4px' }}>
                对话模型 (Chat)
              </div>
              <input
                type="text"
                value={config.chatModel}
                onChange={(e) => setConfig((prev) => ({ ...prev, chatModel: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '4px' }}>
                向量模型 (Embedding)
              </div>
              <input
                type="text"
                value={config.embeddingModel}
                onChange={(e) => setConfig((prev) => ({ ...prev, embeddingModel: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
          </div>

          {/* Privacy Switches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--c-text, #1e293b)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.excludePrivate}
                onChange={(e) => setConfig((prev) => ({ ...prev, excludePrivate: e.target.checked }))}
              />
              <span>不索引带 <code>private: true</code> 的私密笔记</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--c-text, #1e293b)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.desensitize}
                onChange={(e) => setConfig((prev) => ({ ...prev, desensitize: e.target.checked }))}
              />
              <span>发送前脱敏手机号、邮箱与局域网 IP</span>
            </label>
          </div>

          {/* Test Status feedback */}
          {testState.text && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '7px',
                fontSize: '11px',
                background: testState.ok ? 'var(--accent-50, #ecfdf5)' : '#fff1f2',
                color: testState.ok ? 'var(--accent-700, #047857)' : '#be123c',
                border: '1px solid',
                borderColor: testState.ok ? 'var(--accent-200, #a7f3d0)' : '#fecdd3',
              }}
            >
              {testState.text}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testState.loading}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '8px',
                border: '1px solid var(--c-line, #cbd5e1)',
                background: '#ffffff',
                color: 'var(--c-text, #1e293b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: testState.loading ? 'wait' : 'pointer',
              }}
            >
              {testState.loading ? '测试中…' : '测试连接'}
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent-600, #059669)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {saveSuccess ? '✓ 已保存' : '保存设置'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
