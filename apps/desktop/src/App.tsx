import React, { useEffect, useState } from 'react';
import { SettingsProvider } from './context/SettingsContext';
import { LoginView } from './views/LoginView';
import { RepoSelectView } from './views/RepoSelectView';
import { MainView } from './views/MainView';
import { QuitSyncModal } from './views/Modals/QuitSyncModal';
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

  // Setup exit requested event listener for macOS ⌘Q interception
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    import('@tauri-apps/api/event')
      .then(({ listen }) => {
        listen('exit-requested', () => {
          setShowQuitSync(true);
        }).then((u) => {
          unlisten = u;
        });
      })
      .catch(() => {});

    return () => {
      if (unlisten) unlisten();
    };
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

  const handleLogout = () => {
    setStep('login');
  };

  const handlePerformExit = async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('exit_app');
    } catch (_) {
      window.close();
    }
  };

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
            username={username}
            onSwitchRepo={() => setStep('repo_select')}
            onLogout={handleLogout}
          />
        )}
      </div>

      {showQuitSync && (
        <QuitSyncModal
          onConfirmExit={handlePerformExit}
          onCancel={() => setShowQuitSync(false)}
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
