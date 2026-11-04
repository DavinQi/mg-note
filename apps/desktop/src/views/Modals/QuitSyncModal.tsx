import React, { useState } from 'react';

interface QuitSyncModalProps {
  onSyncAndExit: () => Promise<void>;
  onSkipAndExit: () => Promise<void>;
  onCancel: () => void;
}

export const QuitSyncModal: React.FC<QuitSyncModalProps> = ({
  onSyncAndExit,
  onSkipAndExit,
  onCancel,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSyncAndExit = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setErrorMessage('');
    try {
      await onSyncAndExit();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in slide-in-from-top-4 duration-200"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <span className="text-lg">🛡</span>
          <h3 className="font-bold text-sm">
            {isSyncing ? '正在同步笔记…' : '退出 mg-node'}
          </h3>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          {isSyncing
            ? '正在保存本地修改，并拉取、合并和推送远程仓库。'
            : '退出前可以先同步笔记；同步失败时，您可以重试、取消退出或跳过同步。'}
        </p>

        {isSyncing && (
          <div className="flex items-center gap-2 py-3 mb-4 text-xs text-emerald-700 dark:text-emerald-300">
            <span className="animate-spin">◌</span>
            <span>正在提交本地更改并同步 Git 远程仓库…</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs break-words">
            ⚠ 同步失败：{errorMessage}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={onCancel}
            disabled={isSyncing}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40"
          >
            取消退出
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onSkipAndExit}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40"
            >
              跳过同步并退出
            </button>
            <button
              onClick={handleSyncAndExit}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
            >
              {errorMessage ? '重试同步' : '同步并退出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
