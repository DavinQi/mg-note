import React, { useEffect, useState } from 'react';

export interface GitBranchItem {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  isProtected: boolean;
  commitId?: string;
  commitMessage?: string;
}

interface BranchSwitchModalProps {
  repoName: string;
  currentBranch: string;
  isOpen: boolean;
  onClose: () => void;
  onBranchSwitched: (newBranch: string) => Promise<void> | void;
}

export const BranchSwitchModal: React.FC<BranchSwitchModalProps> = ({
  repoName,
  currentBranch,
  isOpen,
  onClose,
  onBranchSwitched,
}) => {
  const [branches, setBranches] = useState<GitBranchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'local' | 'remote'>('all');
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const list: GitBranchItem[] = await invoke('list_repository_branches', { repoName });
      setBranches(list);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void loadBranches();
      setShowCreateInput(false);
      setNewBranchName('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, repoName]);

  if (!isOpen) return null;

  const handleSwitch = async (branchName: string, isCreate = false) => {
    if (switching) return;
    setSwitching(true);
    setError('');
    setSuccessMsg('');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const switched: string = await invoke('switch_repository_branch', {
        repoName,
        branchName,
        createIfMissing: isCreate,
      });

      setSuccessMsg(`已成功切换至分支: ${switched}`);
      await onBranchSwitched(switched);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to switch branch:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSwitching(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newBranchName.trim();
    if (!clean) {
      setError('请输入有效的分支名称');
      return;
    }
    if (clean.includes(' ') || clean.includes('..') || clean.startsWith('/')) {
      setError('分支名称不能包含空格、连续句点或以 / 开头');
      return;
    }
    void handleSwitch(clean, true);
  };

  const filteredBranches = branches.filter((b) => {
    if (filterTab === 'local' && b.isRemote) return false;
    if (filterTab === 'remote' && !b.isRemote) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.commitMessage && b.commitMessage.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs select-none p-4">
      <div
        className="w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌿</span>
            <div>
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Git 分支管理与切换
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                当前活动分支：
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded ml-1 border border-emerald-200/50">
                  {currentBranch || 'my-git-note'}
                </span>
                {currentBranch === 'my-git-note' && (
                  <span className="ml-1.5 text-[10px] text-emerald-600">（专属独立笔记分支 🛡️）</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm p-1 rounded-md"
          >
            ✕
          </button>
        </div>

        {/* Notice Info */}
        <div className="mb-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
          <span className="text-sm">💡</span>
          <div>
            <span>
              应用默认在专属笔记分支 <strong className="font-mono text-emerald-600">my-git-note</strong> 中工作，绝不会误改代码主分支（main / master）。
            </span>
            <span className="block text-slate-400 text-[10px] mt-0.5">
              切换分支前，本地所写的新笔记会自动安全保存并提交。切换后笔记目录树将即时重载。
            </span>
          </div>
        </div>

        {/* Action Bar: Search, Tabs, New Branch */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="搜索分支名称或提交信息..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              {(['all', 'local', 'remote'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    filterTab === tab
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {tab === 'all' ? '全部' : tab === 'local' ? '本地' : '远程'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowCreateInput((prev) => !prev)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-xs flex items-center gap-1 transition-colors shadow-xs"
            >
              <span>＋</span> 新建分支
            </button>
          </div>

          {/* Create Branch Input */}
          {showCreateInput && (
            <form
              onSubmit={handleCreateSubmit}
              className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 flex items-center gap-2 animate-in fade-in slide-in-from-top-1"
            >
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">🌿 新分支名:</span>
              <input
                type="text"
                placeholder="例如: daily-notes 或 reading-2026"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                autoFocus
                disabled={switching}
                className="flex-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-900 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={switching || !newBranchName.trim()}
                className="px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs disabled:opacity-50 transition-colors"
              >
                {switching ? '创建中…' : '创建并切换'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateInput(false)}
                className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs"
              >
                取消
              </button>
            </form>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[11px] text-red-600 dark:text-red-400 flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-xs">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-700 dark:text-emerald-300">
            ✓ {successMsg}
          </div>
        )}

        {/* Branch List */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
              <span className="animate-spin text-lg">⟳</span>
              <span>正在读取本地与远程分支…</span>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              没有找到匹配的分支
            </div>
          ) : (
            filteredBranches.map((b) => {
              const isCurrent = b.isCurrent || b.name === currentBranch;
              const isDedicatedNote = b.name.includes('my-git-note');
              const isMain = b.name === 'main' || b.name === 'master' || b.name === 'origin/main' || b.name === 'origin/master';

              return (
                <div
                  key={`${b.name}-${b.isRemote}`}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs ${
                    isCurrent
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {b.name}
                      </span>

                      {isCurrent && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                          ✓ 当前活动
                        </span>
                      )}

                      {isDedicatedNote && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/50">
                          🌿 专属笔记分支
                        </span>
                      )}

                      {isMain && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/50">
                          🛡️ 代码主分支
                        </span>
                      )}

                      {b.isRemote && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800">
                          🌐 远程
                        </span>
                      )}
                    </div>

                    {(b.commitId || b.commitMessage) && (
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate flex items-center gap-1.5">
                        {b.commitId && <span className="text-slate-500 font-semibold">{b.commitId}</span>}
                        {b.commitMessage && <span className="truncate">{b.commitMessage}</span>}
                      </div>
                    )}
                  </div>

                  <div>
                    {isCurrent ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px] px-2 py-1">
                        使用中
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSwitch(b.name)}
                        disabled={switching}
                        className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 text-slate-700 dark:text-slate-200 text-xs font-medium transition-all active:scale-95 disabled:opacity-50"
                      >
                        {switching ? '切换中…' : '切换'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={loadBranches}
            disabled={loading}
            className="flex items-center gap-1 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <span>⟳</span> 刷新分支列表
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
