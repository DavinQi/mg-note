import React, { useEffect, useState } from 'react';

interface QuitSyncModalProps {
  onConfirmExit: () => void;
  onCancel: () => void;
}

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done';
}

export const QuitSyncModal: React.FC<QuitSyncModalProps> = ({ onConfirmExit, onCancel }) => {
  const [countdown, setCountdown] = useState(15);
  const [steps, setSteps] = useState<Step[]>([
    { id: 'save', label: '保存当前所有未保存修改', status: 'running' },
    { id: 'commit', label: '生成本地 Git 自动备份提交', status: 'pending' },
    { id: 'merge', label: '检查并合并云端最新变动', status: 'pending' },
    { id: 'push', label: '安全推送到 GitHub / Gitee 私有仓库', status: 'pending' },
  ]);

  useEffect(() => {
    // Step 1: save
    const t1 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 'save'
            ? { ...s, status: 'done' }
            : s.id === 'commit'
            ? { ...s, status: 'running' }
            : s
        )
      );
    }, 600);

    // Step 2: commit
    const t2 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 'commit'
            ? { ...s, status: 'done' }
            : s.id === 'merge'
            ? { ...s, status: 'running' }
            : s
        )
      );
    }, 1200);

    // Step 3: merge
    const t3 = setTimeout(() => {
      setSteps((prev) =>
        prev.map((s) =>
          s.id === 'merge'
            ? { ...s, status: 'done' }
            : s.id === 'push'
            ? { ...s, status: 'running' }
            : s
        )
      );
    }, 1800);

    // Step 4: push
    const t4 = setTimeout(() => {
      setSteps((prev) => prev.map((s) => ({ ...s, status: 'done' })));
      setTimeout(() => {
        onConfirmExit();
      }, 500);
    }, 2400);

    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          onConfirmExit();
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearInterval(timer);
    };
  }, [onConfirmExit]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in slide-in-from-top-4 duration-200"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-lg">🛡</span>
            <h3 className="font-bold text-sm">正在退出并同步数据…</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{countdown}s</span>
        </div>

        <p className="text-xs text-slate-500 mb-4">
          mg-node 在退出前为您安全提交并推送改动，防止笔记丢失或多设备产生冲突。
        </p>

        <div className="space-y-3 mb-6">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 dark:text-slate-300">{step.label}</span>
              {step.status === 'done' ? (
                <span className="text-emerald-600 font-bold">✓ 完成</span>
              ) : step.status === 'running' ? (
                <span className="animate-spin text-emerald-600">◌</span>
              ) : (
                <span className="text-slate-300 dark:text-slate-600">等待</span>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            取消退出
          </button>
          <button
            onClick={onConfirmExit}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          >
            跳过同步并直接退出
          </button>
        </div>
      </div>
    </div>
  );
};
