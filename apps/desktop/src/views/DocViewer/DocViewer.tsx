import React from 'react';
import { NoteKind } from '../../types/note';

interface DocViewerProps {
  title: string;
  kind: NoteKind;
  onOpenExternal: () => void;
}

export const DocViewer: React.FC<DocViewerProps> = ({ title, kind, onOpenExternal }) => {
  const isWord = kind === 'docx';
  const isPpt = kind === 'pptx';
  const isPdf = kind === 'pdf';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950 select-text">
      {/* Top Banner with External Launch */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="text-xl">{isWord ? '📘' : isPpt ? '📙' : '📕'}</span>
          <div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {title}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                {kind.toUpperCase()}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">只读高保真渲染模式 · 批注已分离存储</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPdf ? (
            <button
              onClick={onOpenExternal}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white shadow-sm hover:shadow flex items-center gap-1.5 transition-all"
              style={{ background: 'var(--accent-600, #059669)' }}
            >
              <span>在 {isWord ? 'WPS / Word' : 'Keynote / PPT'} 中编辑</span>
              <span>↗</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-xs">
              <button className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200">
                🖊 画笔
              </button>
              <button className="px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">
                🖍 高亮
              </button>
              <button className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200">
                💬 批注便签
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Document Content Canvas */}
      <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
        <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 min-h-[700px] p-12 flex flex-col">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
            <div className="text-xs text-slate-400 mt-1">
              创建于 2026-11-03 · 外部编辑保存后将通过 macOS FSEvents 自动热刷新
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-center py-12">
            <div className="text-5xl mb-4">{isWord ? '📄' : isPpt ? '📊' : '📑'}</div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
              {isWord
                ? 'DOCX 高保真文档只读预览'
                : isPpt
                ? 'PPTX 演示文稿浏览'
                : 'PDF 矢量文档预览'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
              为了确保文档格式 100% 不发生版面变形与错乱，点击右上角按钮即可无缝调用系统本机应用进行修改并自动写回私有仓库。
            </p>
            {!isPdf && (
              <button
                onClick={onOpenExternal}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                打开本机默认程序编辑 ↗
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
