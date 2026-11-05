import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { LoginView } from './views/LoginView';
import { RepoSelectView } from './views/RepoSelectView';
import { MainView } from './views/MainView';
import { QuitSyncModal } from './views/Modals/QuitSyncModal';
import { GitEnvironmentModal, GitEnvironmentStatus } from './views/Modals/GitEnvironmentModal';
import { Titlebar } from './components/Titlebar';

export type AppStep = 'login' | 'repo_select' | 'main';

export const AppContent: React.FC = () => {
  const [step, setStep] = useState<AppStep>('login');
  const [provider, setProvider] = useState<string>('GitHub');
  const [username, setUsername] = useState<string>('Alex');
  const [token, setToken] = useState<string | undefined>(undefined);
  const [initialRepos, setInitialRepos] = useState<any[]>([]);
  const [repoName, setRepoName] = useState<string>('my-git-note');
  const [showQuitSync, setShowQuitSync] = useState(false);
  const [gitStatus, setGitStatus] = useState<GitEnvironmentStatus | null>(null);
  const [showGitEnvModal, setShowGitEnvModal] = useState(false);
  const exitSyncRef = useRef<(() => Promise<void>) | null>(null);

  // Check Git environment on application mount
  useEffect(() => {
    let active = true;
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke<GitEnvironmentStatus>('check_git_environment')
        .then((status) => {
          if (active) {
            setGitStatus(status);
            if (!status.isInstalled) {
              setShowGitEnvModal(true);
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to verify Git environment:', err);
        });
    });
    return () => {
      active = false;
    };
  }, []);

  const handleRefreshGitEnv = useCallback(async (): Promise<GitEnvironmentStatus> => {
    const { invoke } = await import('@tauri-apps/api/core');
    const status: GitEnvironmentStatus = await invoke('check_git_environment');
    setGitStatus(status);
    return status;
  }, []);

  const handleLoginSuccess = (p: string, u: string, t?: string, repos: any[] = []) => {
    setProvider(p);
    setUsername(u);
    setToken(t);
    setInitialRepos(repos);
    setStep('repo_select');
  };

  const handleRepoSelected = (r: string) => {
    setRepoName(r);
    setStep('main');
  };

  const handleSwitchRepo = (newRepoName?: string) => {
    if (newRepoName) {
      setRepoName(newRepoName);
      setStep('main');
    } else {
      setStep('repo_select');
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('remember_keychain_account', {
          provider: provider.toLowerCase(),
          username,
        });
      } catch (error) {
        console.error('Failed to update saved credential list:', error);
      }
    }
    setToken(undefined);
    setStep('login');
  };

  const handlePerformExit = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('exit_app');
    } catch (_) {
      window.close();
    }
  }, []);

  const registerExitSync = useCallback((sync: () => Promise<void>) => {
    exitSyncRef.current = sync;
    return () => {
      if (exitSyncRef.current === sync) exitSyncRef.current = null;
    };
  }, []);

  const handleSyncBeforeExit = useCallback(async () => {
    if (exitSyncRef.current) {
      await exitSyncRef.current();
      return;
    }

    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('perform_git_sync', { repoName, provider, username });
  }, [repoName, provider, username]);

  // Tauri intercepts ⌘Q and window close until the user syncs, skips, or cancels.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let active = true;
    import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen('exit-requested', () => {
          if (step === 'main') {
            setShowQuitSync(true);
          } else {
            void handlePerformExit();
          }
        })
      )
      .then((stopListening) => {
        if (active) unlisten = stopListening;
        else stopListening();
      })
      .catch(() => {});

    return () => {
      active = false;
      unlisten?.();
    };
  }, [step, handlePerformExit]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      {/* If in login or repo_select, show titlebar on top */}
      {step !== 'main' && (
        <Titlebar
          title={step === 'login' ? 'mg-node — 登录' : 'mg-node — 选择与拉取笔记仓库'}
        />
      )}

      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 w-full h-full">
        {step === 'login' && <LoginView onLoginSuccess={handleLoginSuccess} />}

        {step === 'repo_select' && (
          <RepoSelectView
            provider={provider}
            username={username}
            token={token}
            initialRepos={initialRepos}
            onRepoSelected={handleRepoSelected}
            onBack={() => setStep('login')}
          />
        )}

        {step === 'main' && (
          <MainView
            repoName={repoName}
            provider={provider}
            username={username}
            registerExitSync={registerExitSync}
            onSwitchRepo={handleSwitchRepo}
            onLogout={handleLogout}
          />
        )}
      </div>

      {showQuitSync && (
        <QuitSyncModal
          onSyncAndExit={async () => {
            await handleSyncBeforeExit();
            await handlePerformExit();
          }}
          onSkipAndExit={handlePerformExit}
          onCancel={() => setShowQuitSync(false)}
        />
      )}

      {showGitEnvModal && gitStatus && (
        <GitEnvironmentModal
          status={gitStatus}
          isOpen={showGitEnvModal}
          onClose={() => setShowGitEnvModal(false)}
          onRefresh={handleRefreshGitEnv}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;
