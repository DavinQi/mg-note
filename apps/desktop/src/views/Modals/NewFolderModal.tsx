import React, { useState } from 'react';

interface NewFolderModalProps {
  categories: string[];
  onConfirm: (parent: string, name: string) => void;
  onClose: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  categories,
  onConfirm,
  onClose,
}) => {
  const [parent, setParent] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('文件夹名称不能为空');
      return;
    }
    if (/[/\\:*?"<>|]/.test(trimmed)) {
      setError('名称不能包含 / \\ : * ? " < > | 等非法字符');
      return;
    }
    onConfirm(parent, trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span>📁</span> 新建文件夹
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1.5">上级分类</label>
            <select
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="">（无 - 创建一级分类）</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              遵循规范：系统严格限制最多 2 级目录（一级分类 / 二级文件夹），更细颗粒度交由标签管理
            </p>
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1.5">文件夹名称</label>
            <input
              type="text"
              maxLength={40}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="如：DevOps、读书笔记"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
              autoFocus
            />
            {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow"
              style={{ background: 'var(--accent-600, #059669)' }}
            >
              创建文件夹
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
