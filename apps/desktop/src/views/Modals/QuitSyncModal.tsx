import React, { useState } from 'react';
import { LockClosedIcon, SyncIcon, AlertTriangleIcon } from '../../components/Icons';

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
  const [isExiting, setIsExiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSyncAndExit = async () => {
    if (isSyncing || isExiting) return;
    setIsSyncing(true);
    setErrorMessage('');

    try {
      // Set a 12s timeout for exit sync to prevent hanging indefinitely on slow network
      const syncPromise = onSyncAndExit();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Git 同步响应超时（网络较慢），建议跳过同步直接退出')), 12000)
      );

      await Promise.race([syncPromise, timeoutPromise]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSkipAndExit = async () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      await onSkipAndExit();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setIsExiting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in slide-in-from-top-4 duration-200"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <LockClosedIcon size={16} className="text-emerald-600" />
          <h3 className="font-bold text-sm">
            {isSyncing ? '正在同步并准备退出…' : '退出 mg-node'}
          </h3>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          {isSyncing
            ? '正在保存未保存的修改并推送到 Git 专用分支…'
            : '退出前建议同步最新笔记；若当前网络不佳，亦可随时跳过同步直接退出。'}
        </p>

        {isSyncing && (
          <div className="flex items-center gap-2 py-3 mb-4 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <SyncIcon size={14} className="animate-spin text-emerald-600 flex-shrink-0" />
            <span>正在连接 Git 仓库同步数据… (随时可点击右下方跳过)</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-2.5 mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs break-words flex items-center gap-1.5">
            <AlertTriangleIcon size={14} className="flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExiting}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-40 transition-colors"
          >
            取消退出
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSkipAndExit}
              disabled={isExiting}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 transition-colors"
            >
              {isExiting ? '正在退出…' : '跳过同步并退出'}
            </button>
            <button
              type="button"
              onClick={handleSyncAndExit}
              disabled={isSyncing || isExiting}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors font-medium"
            >
              {isSyncing ? '同步中…' : errorMessage ? '重试同步' : '同步并退出'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
