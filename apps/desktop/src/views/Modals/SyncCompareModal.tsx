import React, { useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import {
  GitBranchIcon,
  AlertTriangleIcon,
  LinkIcon,
  LockClosedIcon,
  FolderIcon,
} from '../../components/Icons';

export interface SyncFileChange {
  path: string;
  status: string;
}

export interface SyncPreview {
  localChanges: SyncFileChange[];
  remoteChanges: SyncFileChange[];
  possibleConflicts: string[];
  hasOrigin: boolean;
  hasRemoteBranch: boolean;
  remoteUrl?: string;
  branch?: string;
}

interface SyncCompareModalProps {
  preview: SyncPreview;
  repoName: string;
  provider: string;
  username: string;
  isSyncing: boolean;
  onSync: () => Promise<void>;
  onClose: () => void;
  onRefreshPreview?: () => Promise<void>;
}

const ChangeList: React.FC<{ title: string; items: SyncFileChange[] }> = ({ title, items }) => (
  <section className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
    <h4 className="px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      {title} <span className="text-slate-400 font-normal">({items.length})</span>
    </h4>
    <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
      {items.length === 0 ? (
        <p className="px-3 py-4 text-xs text-slate-400">没有文件变更</p>
      ) : items.map((item) => (
        <div key={`${item.path}:${item.status}`} className="flex items-start justify-between gap-3 px-3 py-2 text-xs">
          <code className="min-w-0 break-all text-slate-700 dark:text-slate-200">{item.path}</code>
          <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 dark:text-slate-300">
            {item.status}
          </span>
        </div>
      ))}
    </div>
  </section>
);

export const SyncCompareModal: React.FC<SyncCompareModalProps> = ({
  preview,
  repoName,
  provider,
  username,
  isSyncing,
  onSync,
  onClose,
  onRefreshPreview,
}) => {
  const [errorMessage, setErrorMessage] = useState('');
  const [showBindInput, setShowBindInput] = useState(false);
  const [customRemoteUrl, setCustomRemoteUrl] = useState('');
  const [bindingRemote, setBindingRemote] = useState(false);
  const [creatingRemote, setCreatingRemote] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [newTokenInput, setNewTokenInput] = useState('');
  const [savingToken, setSavingToken] = useState(false);

  const hasConflicts = preview.possibleConflicts.length > 0;
  const tokenPageUrl =
    provider === 'Gitee'
      ? 'https://gitee.com/profile/personal_access_tokens'
      : 'https://github.com/settings/tokens/new?scopes=repo&description=mg-node';
  const createRepoUrl =
    provider === 'Gitee'
      ? 'https://gitee.com/projects/new'
      : 'https://github.com/new';

  const isPermissionError =
    errorMessage.includes('PERMISSION_ERROR') ||
    errorMessage.toLowerCase().includes('403') ||
    errorMessage.toLowerCase().includes('401') ||
    errorMessage.toLowerCase().includes('denied') ||
    errorMessage.includes('鉴权') ||
    errorMessage.includes('Token');

  const isNotFoundError =
    errorMessage.includes('NOT_FOUND_ERROR') ||
    errorMessage.toLowerCase().includes('404') ||
    errorMessage.includes('远程仓库不存在');

  const handleSync = async () => {
    if (isSyncing) return;
    setErrorMessage('');
    try {
      await onSync();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleBindCustomRemote = async () => {
    const url = customRemoteUrl.trim();
    if (!url) return;
    setBindingRemote(true);
    setErrorMessage('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('set_repository_remote', { repoName, remoteUrl: url });
      setShowBindInput(false);
      if (onRefreshPreview) await onRefreshPreview();
      await handleSync();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBindingRemote(false);
    }
  };

  const handleCreateRemoteRepo = async () => {
    setCreatingRemote(true);
    setErrorMessage('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const token: string | null = await invoke('read_keychain_token', {
        provider: provider.toLowerCase(),
        username,
      });

      if (!token) {
        setShowTokenInput(true);
        throw new Error(
          `PERMISSION_ERROR: 未在钥匙串中找到 ${provider} 授权密钥。请在下方输入带有 repo 读写权限的 Personal Access Token。`
        );
      }

      // Try creating private repository on GitHub / Gitee
      const createRes =
        provider === 'GitHub'
          ? await fetch('https://api.github.com/user/repos', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/vnd.github+json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ name: repoName, private: true, auto_init: false }),
            })
          : await fetch(
              `https://gitee.com/api/v5/user/repos?access_token=${encodeURIComponent(token)}`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name: repoName, private: 'true', auto_init: 'false' }),
              }
            );

      const data = await createRes.json().catch(() => ({}));
      let remoteUrl = data.clone_url;
      if (!createRes.ok) {
        // If repo already exists on user's account, bind it!
        if (createRes.status === 422 || (data.message && data.message.includes('already exists'))) {
          remoteUrl = `https://${provider === 'GitHub' ? 'github.com' : 'gitee.com'}/${username}/${repoName}.git`;
        } else if (createRes.status === 401 || createRes.status === 403) {
          setShowTokenInput(true);
          throw new Error(
            `PERMISSION_ERROR: ${provider} Token 权限不足 (${createRes.status})，无法创建私有仓库。请确认 Token 具备 repo 读写权限。`
          );
        } else {
          throw new Error(data.message || data.error || `创建远程仓库失败 (${createRes.status})`);
        }
      }

      if (!remoteUrl) {
        remoteUrl = `https://${provider === 'GitHub' ? 'github.com' : 'gitee.com'}/${username}/${repoName}.git`;
      }

      await invoke('set_repository_remote', { repoName, remoteUrl });
      if (onRefreshPreview) await onRefreshPreview();
      await handleSync();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingRemote(false);
    }
  };

  const handleSaveNewTokenAndSync = async () => {
    const token = newTokenInput.trim();
    if (!token) return;
    setSavingToken(true);
    setErrorMessage('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('store_keychain_token', {
        provider: provider.toLowerCase(),
        username,
        token,
      });
      setShowTokenInput(false);
      setNewTokenInput('');
      if (!preview.hasOrigin) {
        await handleCreateRemoteRepo();
      } else {
        await handleSync();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingToken(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 p-5 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSyncing) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-compare-title"
        className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-2xl"
        style={{ background: 'var(--c-surface, #ffffff)', maxHeight: '88vh', overflowY: 'auto' }}
      >
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 id="sync-compare-title" className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              同步前文件比较
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-1">
                <GitBranchIcon size={11} /> 分支: {preview.branch || 'my-git-note'}
              </span>
              {preview.hasOrigin ? (
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  已关联远程
                </span>
              ) : (
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                  本地离线仓库
                </span>
              )}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              数据严格隔离在专属分支「{preview.branch || 'my-git-note'}」，绝不污染或影响 main / master 等其他业务分支。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSyncing}
            aria-label="关闭"
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            ×
          </button>
        </header>

        {/* Local-only guide: prompt to bind remote or create repo on GitHub/Gitee */}
        {!preview.hasOrigin && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200">
              <AlertTriangleIcon size={14} className="text-amber-600" /> 此仓库尚未关联云端 Git 仓库（GitHub / Gitee）
            </div>
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              编辑的文件当前仅保存在本机，尚未同步到云端。你可以直接在 {provider} 创建对应私有仓库，或关联已有远程地址：
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCreateRemoteRepo()}
                disabled={creatingRemote || isSyncing}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {creatingRemote ? '正在创建并关联…' : `＋ 在 ${provider} 一键创建对应私有仓库并同步`}
              </button>
              <button
                type="button"
                onClick={() => setShowBindInput((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-100 hover:bg-amber-100/50 cursor-pointer flex items-center gap-1.5"
              >
                <LinkIcon size={12} /> 关联已有 Git 远程地址…
              </button>
            </div>

            {showBindInput && (
              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800/60 flex gap-2">
                <input
                  type="text"
                  value={customRemoteUrl}
                  onChange={(e) => setCustomRemoteUrl(e.target.value)}
                  placeholder={`例如：https://${provider === 'GitHub' ? 'github.com' : 'gitee.com'}/${username}/${repoName}.git`}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void handleBindCustomRemote()}
                  disabled={bindingRemote || !customRemoteUrl.trim()}
                  className="px-3 py-1.5 rounded-lg bg-amber-700 text-white text-xs font-semibold hover:bg-amber-800 disabled:opacity-50 cursor-pointer"
                >
                  {bindingRemote ? '关联中…' : '关联并同步'}
                </button>
              </div>
            )}
          </div>
        )}

        {preview.hasOrigin && !preview.hasRemoteBranch && (
          <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
            尚未找到对应的远程分支。当前比较结果包含本地文件变更，同步后将作为主分支推送到远程仓库。
          </div>
        )}

        {hasConflicts && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            <strong>以下文件在本地和远程都发生了变化：</strong>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {preview.possibleConflicts.map((path) => (
                <li key={path} className="break-all">
                  <code>{path}</code>
                </li>
              ))}
            </ul>
            <p className="mt-1">Git 会尝试自动合并；若改动位置重叠，同步可能需要手动解决冲突。</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ChangeList title="本地变更" items={preview.localChanges} />
          <ChangeList title="远程变更" items={preview.remoteChanges} />
        </div>

        {/* Permission Guidance Card */}
        {isPermissionError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/90 p-4 dark:border-rose-900/60 dark:bg-rose-950/30 text-xs">
            <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200">
              <LockClosedIcon size={14} className="text-rose-600" />
              <span>Git 权限校验未通过 (权限引导)</span>
            </div>
            <p className="mt-1.5 text-rose-700 dark:text-rose-300 leading-relaxed">
              无法推送到远程私有仓库。这通常是因为 macOS 钥匙串中缺少有效密钥，或 Token 未勾选 <code>repo</code>（完整仓库读写）权限。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openUrl(tokenPageUrl)}
                className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white/80 dark:bg-slate-800 text-rose-800 dark:text-rose-200 font-medium cursor-pointer"
              >
                打开 {provider} Token 生成页 (需勾选 repo 权限) ↗
              </button>
              <button
                type="button"
                onClick={() => setShowTokenInput(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-medium hover:bg-rose-700 cursor-pointer"
              >
                更新 / 粘贴新 Token
              </button>
            </div>

            {showTokenInput && (
              <div className="mt-3 pt-3 border-t border-rose-200 dark:border-rose-800/60 flex gap-2">
                <input
                  type="password"
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  placeholder={`粘贴 ${provider} Personal Access Token (如 ghp_...)`}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => void handleSaveNewTokenAndSync()}
                  disabled={savingToken || !newTokenInput.trim()}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  {savingToken ? '保存中…' : '保存密钥并重试'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Not Found Repository Guidance Card */}
        {isNotFoundError && (
          <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/90 p-4 dark:border-sky-900/60 dark:bg-sky-950/30 text-xs">
            <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-200">
              <FolderIcon size={14} className="text-sky-600" />
              <span>远程未找到对应仓库或文件夹</span>
            </div>
            <p className="mt-1.5 text-sky-700 dark:text-sky-300 leading-relaxed">
              在 {provider} 上未找到名称为「{repoName}」的私有仓库。你可以直接在官方网页创建并重试：
            </p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={() => void openUrl(createRepoUrl)}
                className="px-3 py-1.5 rounded-lg bg-sky-600 text-white font-medium hover:bg-sky-700 cursor-pointer"
              >
                打开 {provider} 创建「{repoName}」私有仓库 ↗
              </button>
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={isSyncing}
                className="px-3 py-1.5 rounded-lg border border-sky-300 dark:border-sky-700 text-sky-800 dark:text-sky-200 hover:bg-sky-100/50 cursor-pointer"
              >
                已在网页创建，重试同步
              </button>
            </div>
          </div>
        )}

        {errorMessage && !isPermissionError && !isNotFoundError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            同步失败：{errorMessage}
          </div>
        )}

        <footer className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            {isSyncing
              ? '正在提交、拉取并推送…'
              : `共 ${preview.localChanges.length + preview.remoteChanges.length} 项变更`}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleSync()}
              disabled={isSyncing}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isSyncing ? '同步中…' : preview.hasOrigin ? '确认同步' : '仅提交本地更改'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
