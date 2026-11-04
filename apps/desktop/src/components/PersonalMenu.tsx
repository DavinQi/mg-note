import React, { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Avatar } from './Avatar';
import { CustomizePanel } from './CustomizePanel';

interface PersonalMenuProps {
  repoName: string;
  username: string;
  currentBranch?: string;
  onSwitchRepo: () => void;
  onOpenBranchModal?: () => void;
  onLogout: () => void | Promise<void>;
  onOpenAiSettings: () => void;
}

export const PersonalMenu: React.FC<PersonalMenuProps> = ({
  repoName,
  username,
  currentBranch = 'my-git-note',
  onSwitchRepo,
  onOpenBranchModal,
  onLogout,
  onOpenAiSettings,
}) => {
  const { settings, updateSettings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [showSubCustomize, setShowSubCustomize] = useState(false);

  const handleToggleAvatar = () => {
    setShowSubCustomize(false);
    setIsOpen((prev) => !prev);
  };

  return (
    <div className="relative w-full">
      {/* Sidebar Bottom Profile Card */}
      <div
        onClick={handleToggleAvatar}
        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800/60 cursor-pointer select-none transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
      >
        <Avatar size={34} />
        <div className="flex-1 min-w-0 leading-tight">
          <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate flex items-center justify-between">
            <span>{settings.nickname || 'Alex'}</span>
            <span className="text-[11px] opacity-60">🎨</span>
          </div>
          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1">
            <span>@{username}</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono truncate">🌿 {currentBranch}</span>
          </div>
        </div>
      </div>

      {/* 1st Level Popover: Pops Upward */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setShowSubCustomize(false);
            }}
          />

          <div
            className="absolute left-0 bottom-12 w-64 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none text-xs"
            style={{ background: 'var(--c-surface, #ffffff)' }}
          >
            {/* Popover Header */}
            <div className="flex items-center gap-2.5 p-2 mb-1 border-b border-slate-100 dark:border-slate-800">
              <Avatar size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs truncate">{settings.nickname || 'Alex'}</div>
                <div className="text-[10px] text-slate-400 truncate">GitHub · {username}</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center justify-between gap-1 mt-0.5">
                  <span className="truncate">📦 {repoName} 🔒</span>
                  <span className="shrink-0 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 rounded text-[9px] border border-emerald-200/50">
                    🌿 {currentBranch}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSubCustomize(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            {/* Menu Items */}
            <div className="space-y-0.5 py-1">
              {onOpenBranchModal && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowSubCustomize(false);
                    onOpenBranchModal();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors text-slate-700 dark:text-slate-200 font-medium"
                >
                  <span className="flex items-center gap-2">
                    <span>🌿</span> 切换 / 管理分支
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-200/40 max-w-[80px] truncate">
                    {currentBranch}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubCustomize((prev) => !prev);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-colors font-medium ${
                  showSubCustomize
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>🎨</span> 个性化设置
                </span>
                <span className="text-slate-400 font-bold text-sm">
                  {showSubCustomize ? '‹' : '›'}
                </span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSubCustomize(false);
                  onSwitchRepo();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors text-slate-700 dark:text-slate-200"
              >
                <span>📦</span> 切换笔记仓库
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSubCustomize(false);
                  onOpenAiSettings();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors text-slate-700 dark:text-slate-200"
              >
                <span>✨</span> AI 知识库设置
              </button>

              <button
                onClick={() => updateSettings({ darkMode: !settings.darkMode })}
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors text-slate-700 dark:text-slate-200"
              >
                <span className="flex items-center gap-2">
                  <span>🌓</span> {settings.darkMode ? '切换为亮色' : '切换为暗色'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {settings.darkMode ? 'Dark' : 'Light'}
                </span>
              </button>
            </div>

            <div className="pt-1 mt-1 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSubCustomize(false);
                  void onLogout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 text-left transition-colors font-medium"
              >
                <span>⎋</span> 退出登录
              </button>
            </div>

            {/* 2nd Level Flyout Menu (To the right of the 1st level popover) */}
            {showSubCustomize && (
              <div
                className="absolute left-full bottom-0 ml-2 w-80 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
                style={{
                  background: 'var(--c-surface, #ffffff)',
                  height: 'min(580px, calc(100vh - 32px))',
                }}
              >
                <CustomizePanel showArt={true} onClose={() => setShowSubCustomize(false)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
