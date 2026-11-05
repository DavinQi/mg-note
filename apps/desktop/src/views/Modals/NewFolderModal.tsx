import React, { useState } from 'react';
import { FolderPlusIcon, CloseIcon } from '../../components/Icons';

interface NewFolderModalProps {
  categories: string[];
  initialParent?: string;
  onConfirm: (parent: string, name: string) => Promise<void>;
  onClose: () => void;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  categories,
  initialParent = '',
  onConfirm,
  onClose,
}) => {
  const [parent, setParent] = useState(initialParent);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    setSaving(true);
    setError('');
    try {
      await onConfirm(parent, trimmed);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FolderPlusIcon size={16} />
            <span>新建文件夹</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1">
            <CloseIcon size={12} />
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
                  {cat.split('/').join(' / ')}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              支持多级分类与子文件夹层级组织。
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
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow"
              style={{ background: 'var(--accent-600, #059669)' }}
            >
              {saving ? '创建中…' : '创建文件夹'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
