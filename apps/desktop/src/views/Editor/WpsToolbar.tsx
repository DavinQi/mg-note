import React from 'react';
import {
  CheckSquareIcon,
  QuoteIcon,
  LinkIcon,
  PhotoIcon,
  TableIcon,
} from '../../components/Icons';

interface WpsToolbarProps {
  onAction: (action: string, value?: string) => void;
  wordCount?: number;
}

export const WpsToolbar: React.FC<WpsToolbarProps> = ({ onAction, wordCount = 0 }) => {
  return (
    <div
      className="wps-ribbon flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 text-xs select-none overflow-x-auto"
      style={{
        background: 'var(--c-surface-2, #fafaf9)',
        minHeight: '40px',
      }}
    >
      <div className="flex items-center gap-2">
        {/* Group 1: 撤销/重做 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-2 gap-0.5">
          <button
            onClick={() => onAction('undo')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            title="撤销 (⌘Z)"
          >
            ↩
          </button>
          <button
            onClick={() => onAction('redo')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            title="重做 (⌘⇧Z)"
          >
            ↪
          </button>
        </div>

        {/* Group 2: 标题/样式 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-2 gap-1">
          <select
            onChange={(e) => onAction('heading', e.target.value)}
            defaultValue="p"
            className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:outline-none"
          >
            <option value="p">正文</option>
            <option value="h1">标题 1</option>
            <option value="h2">标题 2</option>
            <option value="h3">标题 3</option>
          </select>
        </div>

        {/* Group 3: 字体粗细/高亮 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-2 gap-0.5">
          <button
            onClick={() => onAction('bold')}
            className="px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-bold text-slate-700 dark:text-slate-200"
            title="加粗 (⌘B)"
          >
            B
          </button>
          <button
            onClick={() => onAction('italic')}
            className="px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 italic font-serif text-slate-700 dark:text-slate-200"
            title="斜体 (⌘I)"
          >
            I
          </button>
          <button
            onClick={() => onAction('underline')}
            className="px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 underline text-slate-700 dark:text-slate-200"
            title="下划线 (⌘U)"
          >
            U
          </button>
          <button
            onClick={() => onAction('strike')}
            className="px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 line-through text-slate-700 dark:text-slate-200"
            title="删除线"
          >
            S
          </button>
          <button
            onClick={() => onAction('highlight')}
            className="px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 bg-amber-100 text-amber-900 font-medium"
            title="文本高亮"
          >
            HL
          </button>
        </div>

        {/* Group 4: 段落与列表 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-2 gap-0.5">
          <button
            onClick={() => onAction('bullet-list')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            title="无序列表"
          >
            •≡
          </button>
          <button
            onClick={() => onAction('ordered-list')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300"
            title="有序列表"
          >
            1.≡
          </button>
          <button
            onClick={() => onAction('task-list')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            title="任务清单"
          >
            <CheckSquareIcon size={14} />
          </button>
          <button
            onClick={() => onAction('quote')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            title="引用块"
          >
            <QuoteIcon size={13} />
          </button>
        </div>

        {/* Group 5: 插入代码/表格/链接/图片 */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => onAction('code-block')}
            className="px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 font-mono text-[11px] text-slate-600 dark:text-slate-300"
            title="代码块"
          >
            &lt;/&gt;
          </button>
          <button
            onClick={() => onAction('table')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px]"
            title="插入表格"
          >
            <TableIcon size={13} />
            <span>表格</span>
          </button>
          <button
            onClick={() => onAction('link')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            title="超链接"
          >
            <LinkIcon size={13} />
          </button>
          <button
            onClick={() => onAction('image')}
            className="p-1.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center justify-center"
            title="插入图片"
          >
            <PhotoIcon size={14} />
          </button>
        </div>
      </div>

      {/* Right: Word Count */}
      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-3">
        <span>字数: {wordCount}</span>
        <span>阅读约 {Math.ceil(wordCount / 300) || 1} 分钟</span>
      </div>
    </div>
  );
};
