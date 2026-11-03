import React, { useState } from 'react';
import { Avatar } from '../components/Avatar';
import { useSettings } from '../context/SettingsContext';

interface RepoSelectViewProps {
  provider: string;
  username: string;
  onRepoSelected: (repoName: string) => void;
  onBack: () => void;
}

interface RepoOption {
  name: string;
  description: string;
  isPrivate: boolean;
  updatedAt: string;
}

export const RepoSelectView: React.FC<RepoSelectViewProps> = ({
  provider,
  username,
  onRepoSelected,
  onBack,
}) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'notes' | 'pages'>('notes');
  const [selectedRepo, setSelectedRepo] = useState('my-git-note');
  const [newRepoName, setNewRepoName] = useState('my-git-note');
  const [isCreatingNew, setIsCreatingNew] = useState(true);
  const [loading, setLoading] = useState(false);

  const mockRepos: RepoOption[] = [
    {
      name: 'personal-vault',
      description: '日常碎片记录与备忘',
      isPrivate: true,
      updatedAt: '2 天前',
    },
    {
      name: 'backend-knowledge',
      description: '后端架构设计与微服务笔记',
      isPrivate: true,
      updatedAt: '3 周前',
    },
    {
      name: 'open-source-demos',
      description: '公开开源代码样例（公开仓库不可作为笔记库）',
      isPrivate: false,
      updatedAt: '1 个月前',
    },
  ];

  const handleStart = () => {
    setLoading(true);
    const repoToUse = isCreatingNew ? newRepoName : selectedRepo;
    setTimeout(() => {
      setLoading(false);
      onRepoSelected(repoToUse);
    }, 1000);
  };

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-6 select-none"
      style={{ background: 'var(--c-bg, #f5f5f4)', overflow: 'auto' }}
    >
      <div
        className="w-full max-w-[840px] rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col"
        style={{
          background: 'var(--c-surface, #ffffff)',
          minHeight: '480px',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar size={42} />
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                连接笔记仓库
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-normal">
                  {provider} · {username}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                笔记内容将完全保存在您的私有仓库中，本地与云端双向同步
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
          >
            切换账号
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 my-4 text-xs">
          <button
            onClick={() => setActiveTab('notes')}
            className={`pb-2.5 font-medium border-b-2 transition-all ${
              activeTab === 'notes'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
            style={{
              borderColor: activeTab === 'notes' ? 'var(--accent-600)' : 'transparent',
              color: activeTab === 'notes' ? 'var(--accent-600)' : undefined,
            }}
          >
            1. 笔记私有仓库（必选）
          </button>
          <button
            onClick={() => setActiveTab('pages')}
            className={`pb-2.5 font-medium border-b-2 transition-all ${
              activeTab === 'pages'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            2. 公开站点仓库（可选）
          </button>
        </div>

        {/* Tab 1: Notes repository */}
        {activeTab === 'notes' && (
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {/* New repo option */}
            <div
              onClick={() => setIsCreatingNew(true)}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                isCreatingNew
                  ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
              style={{
                borderColor: isCreatingNew ? 'var(--accent-500)' : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">+</span> 新建私有仓库
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 font-mono">
                  🔒 Private
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                自动为您在 {provider} 创建私有仓库，并初始化推荐的笔记目录骨架
              </p>
              {isCreatingNew && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">{username} /</span>
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="仓库名，如 my-git-note"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono focus:outline-none focus:border-emerald-500 w-64"
                  />
                </div>
              )}
            </div>

            <div className="text-xs font-medium text-slate-400 pt-2">或选择已有私有仓库：</div>

            {mockRepos.map((repo) => {
              const isSelected = !isCreatingNew && selectedRepo === repo.name;
              return (
                <div
                  key={repo.name}
                  onClick={() => {
                    if (repo.isPrivate) {
                      setIsCreatingNew(false);
                      setSelectedRepo(repo.name);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all ${
                    !repo.isPrivate
                      ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50/50'
                      : isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-100 cursor-pointer'
                      : 'border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--accent-500)' : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-100">
                      {repo.name}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>{repo.updatedAt}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {repo.isPrivate ? '🔒 私有' : '🌐 公开 (不可用)'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{repo.description}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 2: Pages repository */}
        {activeTab === 'pages' && (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 text-slate-500 text-xs">
            <div className="text-3xl mb-2">🌐</div>
            <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 mb-1">
              公开站点发布仓库
            </div>
            <p className="max-w-md text-slate-400 mb-4 leading-relaxed">
              单篇公开的笔记将发布到单独的公开仓库（如 {username}.github.io 或 my-git-note-pages），
              与私有笔记物理隔离，避免私密笔记误公开。
            </p>
            <span className="px-3 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[11px]">
              可以现在跳过，第一次点击单篇笔记「公开发布」时再设置
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-4">
          <span className="text-xs text-slate-400">
            存储路径：<code className="text-[11px]">~/Library/mg-node/repos/{isCreatingNew ? newRepoName : selectedRepo}</code>
          </span>

          <button
            onClick={handleStart}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            style={{
              background: 'var(--accent-600, #059669)',
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin">◌</span> 初始化仓库并建立索引…
              </>
            ) : (
              '拉取并开始使用 ➔'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
