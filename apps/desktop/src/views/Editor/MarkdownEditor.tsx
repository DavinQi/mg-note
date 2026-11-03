import React, { useEffect, useRef, useState } from 'react';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import hljs from 'highlight.js';
import { ViewMode } from '../../types/note';
import { WpsToolbar } from './WpsToolbar';

interface MarkdownEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  title: string;
}

const mdParser: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (_) {}
    }
    return `<pre class="hljs"><code>${mdParser.utils.escapeHtml(str)}</code></pre>`;
  },
});
mdParser.use(taskLists);

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent,
  onSave,
  title,
}) => {
  const [content, setContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // Global hotkeys: ⌘1 (Preview), ⌘2 (Edit), ⌘3 (Split)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '1') {
          e.preventDefault();
          setViewMode('preview');
        } else if (e.key === '2') {
          e.preventDefault();
          setViewMode('edit');
        } else if (e.key === '3') {
          e.preventDefault();
          setViewMode('split');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced auto-save (800ms)
  const handleContentChange = (newVal: string) => {
    setContent(newVal);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(newVal);
    }, 800);
  };

  // Dual scroll sync
  const handleScroll = () => {
    if (viewMode !== 'split' || !textareaRef.current || !previewRef.current) return;
    const textarea = textareaRef.current;
    const preview = previewRef.current;
    const ratio = textarea.scrollTop / (textarea.scrollHeight - textarea.clientHeight || 1);
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
  };

  // WPS Ribbon Toolbar actions
  const handleToolbarAction = (action: string, value?: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end);

    let replacement = '';
    switch (action) {
      case 'bold':
        replacement = `**${selected || '加粗文本'}**`;
        break;
      case 'italic':
        replacement = `*${selected || '斜体文本'}*`;
        break;
      case 'underline':
        replacement = `<u>${selected || '下划线文本'}</u>`;
        break;
      case 'strike':
        replacement = `~~${selected || '删除线文本'}~~`;
        break;
      case 'highlight':
        replacement = `<mark>${selected || '高亮文本'}</mark>`;
        break;
      case 'heading':
        if (value === 'h1') replacement = `# ${selected || '一级标题'}\n`;
        else if (value === 'h2') replacement = `## ${selected || '二级标题'}\n`;
        else if (value === 'h3') replacement = `### ${selected || '三级标题'}\n`;
        break;
      case 'bullet-list':
        replacement = `\n- ${selected || '列表项'}\n`;
        break;
      case 'ordered-list':
        replacement = `\n1. ${selected || '列表项'}\n`;
        break;
      case 'task-list':
        replacement = `\n- [ ] ${selected || '任务待办'}\n`;
        break;
      case 'quote':
        replacement = `\n> ${selected || '引用内容'}\n`;
        break;
      case 'code-block':
        replacement = `\n\`\`\`javascript\n${selected || '// 代码片段'}\n\`\`\`\n`;
        break;
      case 'table':
        replacement = `\n| 列 1 | 列 2 | 列 3 |\n| --- | --- | --- |\n| 内容 A | 内容 B | 内容 C |\n`;
        break;
      case 'link':
        replacement = `[${selected || '链接文字'}](https://example.com)`;
        break;
      case 'image':
        replacement = `![${selected || '图片描述'}](https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c)`;
        break;
      default:
        return;
    }

    const updated = content.slice(0, start) + replacement + content.slice(end);
    handleContentChange(updated);
  };

  const renderedHtml = mdParser.render(content);
  const wordCount = content.replace(/\s+/g, '').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 select-text">
      {/* View Mode Switcher Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="font-semibold text-sm truncate max-w-sm text-slate-800 dark:text-slate-100">
          {title}
        </div>

        {/* ⌘1 / ⌘2 / ⌘3 Segments */}
        <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium">
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100 font-bold'
                : 'text-slate-500'
            }`}
            title="预览模式 (⌘1)"
          >
            <span>👁 预览</span>
            <kbd className="text-[10px] opacity-50 font-mono">⌘1</kbd>
          </button>
          <button
            onClick={() => setViewMode('edit')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'edit'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100 font-bold'
                : 'text-slate-500'
            }`}
            title="源码编辑模式 (⌘2)"
          >
            <span>✎ 编辑</span>
            <kbd className="text-[10px] opacity-50 font-mono">⌘2</kbd>
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-100 font-bold'
                : 'text-slate-500'
            }`}
            title="实时双栏模式 (⌘3)"
          >
            <span>◫ 双栏</span>
            <kbd className="text-[10px] opacity-50 font-mono">⌘3</kbd>
          </button>
        </div>
      </div>

      {/* WPS Ribbon Toolbar (available in edit and split modes) */}
      {viewMode !== 'preview' && (
        <WpsToolbar onAction={handleToolbarAction} wordCount={wordCount} />
      )}

      {/* Main Editing / Preview Canvas */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Source Textarea (Edit & Split) */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`flex-1 min-w-0 h-full overflow-hidden flex flex-col ${
              viewMode === 'split' ? 'border-r border-slate-200 dark:border-slate-800' : ''
            }`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onScroll={handleScroll}
              placeholder="在此开始记录你的思考... 支持 Markdown 与 `/` 快捷插入"
              className="flex-1 w-full p-6 text-sm font-mono leading-relaxed bg-transparent resize-none focus:outline-none text-slate-800 dark:text-slate-200"
              style={{
                fontFamily: 'var(--f-mono, monospace)',
                lineHeight: '1.7',
              }}
            />
          </div>
        )}

        {/* Rendered HTML (Preview & Split) */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            ref={previewRef}
            className="flex-1 min-w-0 h-full overflow-y-auto p-8 prose dark:prose-invert max-w-none preview-body"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
            onDoubleClick={() => {
              if (viewMode === 'preview') {
                setViewMode('edit');
              }
            }}
          />
        )}
      </div>
    </div>
  );
};
