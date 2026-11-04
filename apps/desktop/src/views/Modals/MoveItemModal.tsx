import React, { useState } from 'react';

interface MoveItemModalProps {
  itemPath: string;
  currentParent: string;
  destinations: string[];
  onConfirm: (destination: string) => Promise<void>;
  onClose: () => void;
}

export const MoveItemModal: React.FC<MoveItemModalProps> = ({
  itemPath,
  currentParent,
  destinations,
  onConfirm,
  onClose,
}) => {
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');
  const [moving, setMoving] = useState(false);
  const itemName = itemPath.split('/').pop() || itemPath;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!destination) {
      setError('请选择目标文件夹。');
      return;
    }
    setMoving(true);
    setError('');
    try {
      await onConfirm(destination === '@root' ? '' : destination);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : String(moveError));
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span>↪</span> 移动项目
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-slate-500 truncate" title={itemPath}>
            移动：<strong className="text-slate-700">{itemName}</strong>
          </p>
          <div>
            <label className="block text-slate-500 font-medium mb-1.5">目标文件夹</label>
            <select
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>请选择目标文件夹</option>
              <option value="@root" disabled={!currentParent}>根目录{!currentParent ? '（当前位置）' : ''}</option>
              {destinations.map((path) => (
                <option key={path} value={path}>
                  📁 {path.split('/').join(' / ')}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-[11px] text-red-500">{error}</p>}
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
              disabled={moving || !destination || (!currentParent && destinations.length === 0)}
              className="px-4 py-2 rounded-lg text-white font-medium shadow-sm disabled:opacity-50"
              style={{ background: 'var(--accent-600, #059669)' }}
            >
              {moving ? '移动中…' : '移动'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
