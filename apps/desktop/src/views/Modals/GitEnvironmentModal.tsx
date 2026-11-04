import React, { useState } from 'react';

export interface GitEnvironmentStatus {
  isInstalled: boolean;
  version?: string;
  binaryPath?: string;
  canAutoInstall: boolean;
  errorMessage?: string;
}

interface GitEnvironmentModalProps {
  status: GitEnvironmentStatus;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => Promise<GitEnvironmentStatus>;
}

export const GitEnvironmentModal: React.FC<GitEnvironmentModalProps> = ({
  status,
  isOpen,
  onClose,
  onRefresh,
}) => {
  const [installing, setInstalling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleAutoInstall = async () => {
    setInstalling(true);
    setError('');
    setMessage('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res: string = await invoke('install_git_environment');
      setMessage(res || '已启动安装向导，请根据系统弹窗提示完成安装。');
    } catch (err) {
      console.error('Failed to trigger git install:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInstalling(false);
    }
  };

  const handleOpenDownload = async () => {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl('https://git-scm.com/downloads');
    } catch (err) {
      window.open('https://git-scm.com/downloads', '_blank');
    }
  };

  const handleRecheck = async () => {
    setChecking(true);
    setError('');
    setMessage('');
    try {
      const res = await onRefresh();
      if (res.isInstalled) {
        setMessage(`✓ 检测成功！已找到 Git: ${res.version || res.binaryPath || ''}`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError('系统尚未检测到 Git，如果刚完成安装，请等待安装器结束或稍后重试。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs select-none p-4">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-xl">
            🛠️
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              系统 Git 环境检测
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              mg-node 需要 Git 命令支持以实现笔记版本同步与拉取
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 leading-relaxed">
            <div className="font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-1.5">
              <span>⚠️</span> 当前系统尚未检测到 Git 命令行工具
            </div>
            <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
              mg-node 采用基于 Git 的去中心化同步架构。在未安装 Git 的情况下，您仍然可以在本地创建并编辑离线笔记，但无法进行远程 GitHub / Gitee 的克隆、拉取与推送。
            </p>
          </div>

          {/* Installation Options */}
          <div className="space-y-2 pt-1">
            <div className="font-semibold text-slate-700 dark:text-slate-200 text-xs">
              推荐安装方式：
            </div>

            {status.canAutoInstall ? (
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1.5">
                    <span>⚡</span> 一键安装 Xcode Command Line Tools
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    macOS 官方原生开发者套件，内置完整 Git 环境，点击后系统将弹出官方安装向导。
                  </div>
                </div>
                <button
                  onClick={handleAutoInstall}
                  disabled={installing}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs whitespace-nowrap shadow-xs transition-colors disabled:opacity-50"
                >
                  {installing ? '正在启动…' : '一键安装'}
                </button>
              </div>
            ) : null}

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                  <span>🌐</span> 官网下载独立安装包
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  前往 Git 官方网站（git-scm.com）下载对应系统的最新稳定版安装器。
                </div>
              </div>
              <button
                onClick={handleOpenDownload}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium text-xs whitespace-nowrap transition-colors"
              >
                前往官网 ↗
              </button>
            </div>
          </div>

          {/* Feedback & Alerts */}
          {message && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300 animate-in fade-in">
              {message}
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-600 dark:text-red-400 animate-in fade-in">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium disabled:opacity-50 transition-colors"
          >
            <span className={checking ? 'animate-spin' : ''}>⟳</span>
            {checking ? '正在重新检测…' : '重新检测环境'}
          </button>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
          >
            暂不安装（使用离线模式）
          </button>
        </div>
      </div>
    </div>
  );
};
