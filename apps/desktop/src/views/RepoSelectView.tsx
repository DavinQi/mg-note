import React, { useState } from 'react';
import { Avatar } from '../components/Avatar';

interface RepoSelectViewProps {
  provider: string;
  username: string;
  token?: string;
  initialRepos?: any[];
  onRepoSelected: (repoName: string) => void;
  onBack: () => void;
}

export const RepoSelectView: React.FC<RepoSelectViewProps> = ({
  provider,
  username,
  token,
  initialRepos = [],
  onRepoSelected,
  onBack,
}) => {
  const [mode, setMode] = useState<'cloud' | 'url' | 'new'>(
    initialRepos.length > 0 ? 'cloud' : 'url'
  );
  const [selectedRepo, setSelectedRepo] = useState(
    initialRepos[0]?.name || 'my-git-note'
  );
  const [cloneUrl, setCloneUrl] = useState('');
  const [customRepoName, setCustomRepoName] = useState('my-git-note');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleStart = async () => {
    if (loading) return;
    setErrorMessage('');
    setLoading(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');

      if (mode === 'url') {
        const url = cloneUrl.trim();
        if (!url) {
          throw new Error('请输入有效的 Git 远程仓库地址');
        }

        // Derive repo name from URL (e.g. https://github.com/user/my-note.git -> my-note)
        const parts = url.replace(/\.git$/, '').split('/');
        const derivedName = parts[parts.length - 1] || 'remote-notes';

        setStatusText(`正在从 ${url} 真实执行 git clone…`);

        await invoke('clone_remote_repository', {
          remoteUrl: url,
          repoName: derivedName,
          token: token || null,
        });

        setStatusText('克隆完成，正在建立笔记索引…');
        setTimeout(() => {
          setLoading(false);
          onRepoSelected(derivedName);
        }, 600);
        return;
      }

      if (mode === 'cloud') {
        const repoObj = initialRepos.find((r) => r.name === selectedRepo);
        const remoteUrl = repoObj?.clone_url || repoObj?.html_url || `https://github.com/${username}/${selectedRepo}.git`;

        setStatusText(`正在拉取私有仓库 ${selectedRepo}…`);

        await invoke('clone_remote_repository', {
          remoteUrl,
          repoName: selectedRepo,
          token: token || null,
        });

        setStatusText('拉取完成，正在加载…');
        setTimeout(() => {
          setLoading(false);
          onRepoSelected(selectedRepo);
        }, 600);
        return;
      }

      // mode === 'new'
      const finalName = customRepoName.trim() || 'my-git-note';
      setStatusText(`正在初始化本地私有笔记仓库 ${finalName}…`);

      // Initialize repo & seed default notebooks
      await invoke('list_notebooks_tree', { repoName: finalName });

      setTimeout(() => {
        setLoading(false);
        onRepoSelected(finalName);
      }, 600);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || String(err));
    }
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
        <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar size={42} />
            <div>
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                连接与拉取笔记仓库
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-normal">
                  {provider} · {username}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                支持真实 Git 远程克隆与拉取，本地与云端私有仓库保持双向同步
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            ← 重新认证
          </button>
        </div>

        {/* 3 Modes Switch */}
        <div className="grid grid-cols-3 gap-2 my-4 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
          <button
            onClick={() => setMode('url')}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer ${
              mode === 'url'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            🔗 输入任意 Git 远程地址
          </button>

          <button
            onClick={() => setMode('cloud')}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer ${
              mode === 'cloud'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            ☁️ 从我的 {provider} 仓库选择 ({initialRepos.length})
          </button>

          <button
            onClick={() => setMode('new')}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer ${
              mode === 'new'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            ＋ 新建私有仓库
          </button>
        </div>

        {/* Mode 1: Clone by URL */}
        {mode === 'url' && (
          <div className="flex-1 space-y-4 py-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                Git 远程仓库地址 (HTTPS / SSH)
              </label>
              <input
                type="text"
                value={cloneUrl}
                onChange={(e) => {
                  setCloneUrl(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="例如：https://github.com/your-username/my-git-note.git"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-2">
                系统将使用内置的 libgit2 及系统 Git 工具执行真实的 `git clone`，拉取全部已有笔记与分支。
              </p>
            </div>

            {token && (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 px-2">
                <span>🔒</span> 已挂载您的认证 Token，私有仓库无需再次输入密码
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Cloud Repos */}
        {mode === 'cloud' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[260px]">
            {initialRepos.length > 0 ? (
              initialRepos.map((repo) => {
                const isSelected = selectedRepo === repo.name;
                return (
                  <div
                    key={repo.name}
                    onClick={() => setSelectedRepo(repo.name)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/40'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100">
                        {repo.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                          {repo.private ? '🔒 私有仓库' : '🌐 公开仓库'}
                        </span>
                        {repo.updated_at && (
                          <span>{new Date(repo.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    {repo.description && (
                      <p className="text-[11px] text-slate-500 mt-1 truncate">{repo.description}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                未检测到云端仓库，您可以选择第一项「输入任意 Git 远程地址」进行克隆，或「新建私有仓库」。
              </div>
            )}
          </div>
        )}

        {/* Mode 3: New local/private repo */}
        {mode === 'new' && (
          <div className="flex-1 space-y-4 py-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                新仓库名称
              </label>
              <input
                type="text"
                value={customRepoName}
                onChange={(e) => {
                  setCustomRepoName(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="my-git-note"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                将在本地创建干净的 Git 仓库并自动初始化推荐的 `notebooks/` 目录结构与 `.mgnote/` 配置。
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
            ⚠ {errorMessage}
          </div>
        )}

        {/* Footer */}
        <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-4">
          <div className="text-xs text-slate-400">
            {statusText ? (
              <span className="text-emerald-600 font-medium animate-pulse">{statusText}</span>
            ) : (
              <span>本地克隆目录：<code className="text-[11px]">~/Library/mg-node/repos/</code></span>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium text-xs text-white shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            style={{
              background: 'var(--accent-600, #059669)',
            }}
          >
            {loading ? (
              <>
                <span className="animate-spin">◌</span> 处理中…
              </>
            ) : (
              mode === 'url' ? '克隆远程仓库 ➔' : '进入笔记工作台 ➔'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
