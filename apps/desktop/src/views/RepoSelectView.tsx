import React, { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { Avatar } from '../components/Avatar';
import {
  GitBranchIcon,
  LinkIcon,
  CloudIcon,
  PlusIcon,
  ComputerDesktopIcon,
  LockClosedIcon,
  FolderIcon,
  FileGenericIcon,
  AlertTriangleIcon,
  SyncIcon,
} from '../components/Icons';

interface RepositoryContent {
  name: string;
  path: string;
  type: 'dir' | 'file' | string;
  size?: number;
  html_url?: string;
}

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
  const [mode, setMode] = useState<'cloud' | 'url' | 'new' | 'local'>(
    initialRepos.length > 0 ? 'cloud' : 'url'
  );
  const [repositories, setRepositories] = useState<any[]>(initialRepos);
  const [selectedRepo, setSelectedRepo] = useState(
    initialRepos[0]?.name || 'my-git-note'
  );
  const [repoPath, setRepoPath] = useState('');
  const [repoContents, setRepoContents] = useState<RepositoryContent[]>([]);
  const [loadingRepoContents, setLoadingRepoContents] = useState(false);
  const [repoContentsError, setRepoContentsError] = useState('');
  const [cloneUrl, setCloneUrl] = useState('');
  const [customRepoName, setCustomRepoName] = useState('my-git-note');
  const [loading, setLoading] = useState(false);
  const [refreshingRepos, setRefreshingRepos] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [creationGuideError, setCreationGuideError] = useState('');
  const createRepositoryUrl = provider === 'GitHub'
    ? 'https://github.com/new'
    : 'https://gitee.com/projects/new';

  const refreshRepositories = async () => {
    if (!token) throw new Error('请先使用已保存或新添加的密钥登录。');
    const endpoint = provider === 'GitHub'
      ? 'https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100'
      : `https://gitee.com/api/v5/user/repos?access_token=${encodeURIComponent(token)}&sort=updated&per_page=100`;
    const response = await fetch(endpoint, provider === 'GitHub'
      ? { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
      : undefined);
    if (!response.ok) throw new Error(`读取仓库列表失败 (${response.status})`);
    const list: any[] = await response.json();
    setRepositories(list);
    if (!list.some((repo) => repo.name === selectedRepo) && list[0]?.name) {
      setSelectedRepo(list[0].name);
      setRepoPath('');
    }
    return list;
  };

  useEffect(() => {
    if (mode !== 'cloud' || !selectedRepo) return;
    const repository = repositories.find((repo) => repo.name === selectedRepo);
    if (!repository) return;

    const controller = new AbortController();
    const fullName = typeof repository.full_name === 'string' ? repository.full_name.split('/') : [];
    const owner = fullName[0]
      || repository.owner?.login
      || repository.namespace?.path
      || username;
    const branch = repository.default_branch || repository.defaultBranch || 'master';
    const pathSuffix = repoPath
      ? `/${repoPath.split('/').map(encodeURIComponent).join('/')}`
      : '';
    const endpoint = provider === 'GitHub'
      ? `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(selectedRepo)}/contents${pathSuffix}?ref=${encodeURIComponent(branch)}`
      : `https://gitee.com/api/v5/repos/${encodeURIComponent(owner)}/${encodeURIComponent(selectedRepo)}/contents${pathSuffix}?ref=${encodeURIComponent(branch)}${token ? `&access_token=${encodeURIComponent(token)}` : ''}`;

    const loadContents = async () => {
      setLoadingRepoContents(true);
      setRepoContentsError('');
      try {
        const response = await fetch(endpoint, {
          signal: controller.signal,
          ...(provider === 'GitHub' && token
            ? { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } }
            : {}),
        });
        if (!response.ok) throw new Error(`读取文件列表失败 (${response.status})`);
        const contents = await response.json();
        if (!controller.signal.aborted) {
          setRepoContents(Array.isArray(contents) ? contents : [contents]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRepoContents([]);
          setRepoContentsError(error instanceof Error ? error.message : '读取文件列表失败。');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingRepoContents(false);
      }
    };

    void loadContents();
    return () => controller.abort();
  }, [mode, selectedRepo, repoPath, repositories, provider, token, username]);

  const handleStart = async () => {
    if (loading) return;
    setErrorMessage('');
    setCreationGuideError('');
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

        setStatusText('正在克隆远程仓库…');

        await invoke('clone_remote_repository', {
          remoteUrl: url,
          repoName: derivedName,
          username,
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
        const repoObj = repositories.find((r) => r.name === selectedRepo);
        if (!repoObj) throw new Error('请先选择一个仓库。');
        const remoteUrl = repoObj.clone_url
          || `https://${provider === 'GitHub' ? 'github.com' : 'gitee.com'}/${repoObj.full_name || `${username}/${selectedRepo}`}.git`;

        setStatusText(`正在拉取私有仓库 ${selectedRepo}…`);

        await invoke('clone_remote_repository', {
          remoteUrl,
          repoName: selectedRepo,
          username,
          token: token || null,
        });

        setStatusText('拉取完成，正在加载…');
        setTimeout(() => {
          setLoading(false);
          onRepoSelected(selectedRepo);
        }, 600);
        return;
      }

      if (mode === 'local') {
        const finalName = customRepoName.trim();
        if (!/^[A-Za-z0-9._-]+$/.test(finalName) || finalName === '.' || finalName === '..') {
          throw new Error('仓库名称只能包含英文字母、数字、点、短横线和下划线。');
        }
        setStatusText(`正在初始化本地离线仓库 ${finalName}…`);
        await invoke('list_notebooks_tree', { repoName: finalName });
        setTimeout(() => {
          setLoading(false);
          onRepoSelected(finalName);
        }, 600);
        return;
      }

      const finalName = customRepoName.trim();
      if (!/^[A-Za-z0-9._-]+$/.test(finalName) || finalName === '.' || finalName === '..') {
        throw new Error('仓库名称只能包含英文字母、数字、点、短横线和下划线。');
      }
      if (!token) {
        setCreationGuideError('需要先用 GitHub 或 Gitee 密钥登录，客户端才能验证并创建私有仓库。');
        await openUrl(createRepositoryUrl);
        setLoading(false);
        return;
      }

      setStatusText(`正在验证创建权限并创建私有仓库 ${finalName}…`);
      let remoteCreated = false;
      try {
        const response = provider === 'GitHub'
          ? await fetch('https://api.github.com/user/repos', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: finalName, private: true, auto_init: true }),
            })
          : await fetch(`https://gitee.com/api/v5/user/repos?access_token=${encodeURIComponent(token)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ name: finalName, private: 'true', auto_init: 'true' }),
            });
        const createdRepository = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(createdRepository.message || createdRepository.error || `创建仓库失败 (${response.status})`);
        }
        remoteCreated = true;
        const remoteUrl = createdRepository.clone_url
          || `https://${provider === 'GitHub' ? 'github.com' : 'gitee.com'}/${createdRepository.full_name || `${username}/${finalName}`}.git`;
        setStatusText('私有仓库创建成功，正在克隆到本机…');
        await invoke('clone_remote_repository', {
          remoteUrl,
          repoName: finalName,
          username,
          token,
        });
        setRepositories((current) => [createdRepository, ...current.filter((repo) => repo.name !== finalName)]);
        setTimeout(() => {
          setLoading(false);
          onRepoSelected(finalName);
        }, 600);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLoading(false);
        setStatusText('');
        if (remoteCreated) {
          setErrorMessage(`远程仓库已创建，但本地克隆失败：${message}`);
          setCreationGuideError('请切换到「从我的仓库选择」，刷新列表后重新克隆。');
        } else {
          setCreationGuideError(`${message} 已打开 ${provider} 的仓库创建页面，请按下方步骤创建私有仓库。`);
          try {
            await openUrl(createRepositoryUrl);
          } catch (openError) {
            setCreationGuideError(`${message}；无法自动打开浏览器，请点击下方按钮。`);
          }
        }
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || String(err));
    }
  };

  const handleRefreshRepositoryList = async () => {
    if (refreshingRepos) return;
    setRefreshingRepos(true);
    setErrorMessage('');
    try {
      const list = await refreshRepositories();
      setStatusText(`仓库列表已刷新，共 ${list.length} 个`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '刷新仓库列表失败。');
    } finally {
      setRefreshingRepos(false);
    }
  };

  const handleConfirmRepositoryCreated = async () => {
    if (refreshingRepos) return;
    setRefreshingRepos(true);
    setErrorMessage('');
    try {
      const list = await refreshRepositories();
      const created = list.find((repo) => repo.name === customRepoName.trim());
      if (!created) {
        setCreationGuideError('暂未找到该仓库。请确认网页上已完成创建，再刷新仓库列表。');
        return;
      }
      setSelectedRepo(created.name);
      setRepoPath('');
      setCreationGuideError('仓库已找到。检查文件列表后，点击「拉取所选仓库」即可克隆到本机。');
      setMode('cloud');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '刷新仓库列表失败。');
    } finally {
      setRefreshingRepos(false);
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
              <h2 className="text-base font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 flex-wrap">
                连接与拉取笔记仓库
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-normal">
                  {provider} · {username}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-normal font-mono flex items-center gap-1">
                  <GitBranchIcon size={11} className="text-blue-600 dark:text-blue-400" />
                  <span>专属分支: my-git-note</span>
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                拉取与推送严格隔离在独立分支「my-git-note」，绝不影响或改动您的 main / master 等代码分支
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
          <button
            onClick={() => { setMode('url'); setCreationGuideError(''); }}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'url'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <LinkIcon size={13} />
            <span>输入任意 Git 远程地址</span>
          </button>

          <button
            onClick={() => { setMode('cloud'); setCreationGuideError(''); }}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'cloud'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <CloudIcon size={13} />
            <span>从我的 {provider} 仓库选择 ({repositories.length})</span>
          </button>

          <button
            onClick={() => { setMode('new'); setCreationGuideError(''); }}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'new'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <PlusIcon size={12} />
            <span>新建私有仓库</span>
          </button>

          <button
            onClick={() => { setMode('local'); setCreationGuideError(''); }}
            className={`py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              mode === 'local'
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500'
            }`}
          >
            <ComputerDesktopIcon size={13} />
            <span>本地离线仓库</span>
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
                <LockClosedIcon size={12} /> 已挂载您的认证 Token，私有仓库无需再次输入密码
              </div>
            )}
          </div>
        )}

        {/* Mode 2: Cloud Repos */}
        {mode === 'cloud' && (
          <div className="flex-1 space-y-3 py-2">
            <div className="flex items-center gap-3">
              <label htmlFor="cloud-repository" className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                选择仓库
              </label>
              {repositories.length > 0 && (
                <select
                  id="cloud-repository"
                  value={selectedRepo}
                  onChange={(event) => {
                    setSelectedRepo(event.target.value);
                    setRepoPath('');
                    setCreationGuideError('');
                  }}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
                >
                  {repositories.map((repo) => (
                    <option key={repo.full_name || repo.name} value={repo.name}>
                      {repo.name}{repo.private ? ' · 私有' : ' · 公开'}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => void handleRefreshRepositoryList()}
                disabled={refreshingRepos}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 disabled:opacity-60"
              >
                {refreshingRepos ? '刷新中…' : '刷新列表'}
              </button>
            </div>

            {repositories.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-xs text-slate-400">
                未检测到仓库。可刷新列表、输入远程地址，或新建私有仓库。
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {repoPath ? `${selectedRepo} / ${repoPath}` : `${selectedRepo} /`}
                  </span>
                  {repoPath && (
                    <button
                      type="button"
                      onClick={() => setRepoPath(repoPath.split('/').slice(0, -1).join('/'))}
                      className="text-[11px] text-emerald-700 dark:text-emerald-300"
                    >
                      ↑ 上一级
                    </button>
                  )}
                </div>
                <div className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingRepoContents ? (
                    <div className="p-5 text-center text-xs text-slate-400">正在读取仓库文件…</div>
                  ) : repoContentsError ? (
                    <div className="p-3 text-xs text-amber-700 dark:text-amber-300">{repoContentsError}</div>
                  ) : repoContents.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">此目录没有文件</div>
                  ) : repoContents.map((item) => (
                    item.type === 'dir' ? (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => setRepoPath(item.path)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5">
                          <FolderIcon size={14} />
                          <span>{item.name}</span>
                        </span>
                        <span className="text-slate-400">查看内容 →</span>
                      </button>
                    ) : (
                      <div key={item.path} className="flex items-center justify-between px-3 py-2 text-xs text-slate-700 dark:text-slate-200">
                        <span className="truncate flex items-center gap-1.5">
                          <FileGenericIcon size={14} />
                          <span>{item.name}</span>
                        </span>
                        <span className="ml-3 flex-shrink-0 text-[10px] text-slate-400">
                          {typeof item.size === 'number' ? `${Math.max(1, Math.round(item.size / 1024))} KB` : '文件'}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mode 3: Create remote private repo */}
        {mode === 'new' && (
          <div className="flex-1 space-y-4 py-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                私有仓库名称
              </label>
              <input
                type="text"
                value={customRepoName}
                onChange={(e) => {
                  setCustomRepoName(e.target.value);
                  setErrorMessage('');
                  setCreationGuideError('');
                }}
                placeholder="my-git-note"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                客户端会先检查当前密钥是否有权限创建仓库，并默认设为私有。
              </p>
            </div>

            {creationGuideError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                <div className="font-semibold">无法通过客户端创建仓库</div>
                <p className="mt-1.5 mb-2">{creationGuideError}</p>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] leading-5">
                  <li>在打开的 {provider} 页面中输入仓库名称「{customRepoName.trim() || 'my-git-note'}」。</li>
                  <li>将可见范围选为「Private / 私有」。</li>
                  <li>点击「Create repository / 创建仓库」。</li>
                  <li>回到 mg-node，点下面按钮刷新仓库列表，然后选择并拉取该仓库。</li>
                </ol>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void openUrl(createRepositoryUrl)}
                    className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white/70 dark:bg-slate-900/50"
                  >
                    打开 {provider} 创建页面
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleConfirmRepositoryCreated()}
                    disabled={refreshingRepos}
                    className="px-3 py-1.5 rounded-lg bg-amber-700 text-white disabled:opacity-60"
                  >
                    {refreshingRepos ? '检查中…' : '我已创建，刷新仓库列表'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'local' && (
          <div className="flex-1 space-y-4 py-2">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                本地仓库名称
              </label>
              <input
                type="text"
                value={customRepoName}
                onChange={(event) => setCustomRepoName(event.target.value)}
                placeholder="my-git-note"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono bg-white dark:bg-slate-800 focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[11px] text-slate-400 mt-2">
                只在本机创建 Git 仓库，不连接或上传到 GitHub / Gitee。
              </p>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
            <AlertTriangleIcon size={14} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Footer */}
        <div className="pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between mt-4">
          <div className="text-xs text-slate-400 flex items-center gap-3">
            {statusText ? (
              <span className="text-emerald-600 font-medium animate-pulse">{statusText}</span>
            ) : (
              <span>本地克隆目录：<code className="text-[11px]">~/Library/mg-node/repos/</code></span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onRepoSelected('my-git-note')}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 underline cursor-pointer"
              title="跳过配置，直接进入本地默认笔记仓库"
            >
              直接进入工作台 (本地默认)
            </button>

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
                  <SyncIcon size={13} className="animate-spin" /> 处理中…
                </>
              ) : (
                mode === 'url'
                  ? '克隆远程仓库 ➔'
                  : mode === 'cloud'
                    ? '拉取所选仓库 ➔'
                    : mode === 'local'
                      ? '创建本地仓库 ➔'
                      : '创建私有仓库 ➔'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
