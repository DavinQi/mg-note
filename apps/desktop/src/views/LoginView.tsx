import React, { useEffect, useState } from 'react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useSettings } from '../context/SettingsContext';
import { Avatar } from '../components/Avatar';
import { CustomizePanel } from '../components/CustomizePanel';
import { AppLogo } from '../components/AppLogo';
import {
  PaletteIcon,
  KeyIcon,
  LockClosedIcon,
  AlertTriangleIcon,
  SyncIcon,
} from '../components/Icons';

interface LoginViewProps {
  onLoginSuccess: (provider: string, user: string, token?: string, repos?: any[]) => void;
}

interface SavedCredential {
  provider: 'github' | 'gitee';
  username: string;
}

const credentialKey = (credential: SavedCredential) =>
  `${credential.provider}:${credential.username}`;

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { settings, updateSettings, getArts } = useSettings();
  const [provider, setProvider] = useState<'GitHub' | 'Gitee'>('GitHub');
  const [method, setMethod] = useState<'oauth' | 'token'>('token');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([]);
  const [selectedCredentialKey, setSelectedCredentialKey] = useState('');
  const [credentialLoadError, setCredentialLoadError] = useState('');

  useEffect(() => {
    let active = true;
    const loadSavedCredentials = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const credentials: SavedCredential[] = await invoke('list_keychain_accounts');
        if (active) {
          setSavedCredentials(credentials);
          setSelectedCredentialKey(credentials[0] ? credentialKey(credentials[0]) : '');
        }
      } catch (error) {
        if (active) {
          setCredentialLoadError(
            error instanceof Error ? error.message : '读取已保存密钥列表失败。'
          );
        }
      }
    };
    void loadSavedCredentials();
    return () => { active = false; };
  }, []);

  const arts = getArts();
  const currentArtIndex = Math.max(
    0,
    arts.findIndex((a) => a.id === settings.loginArt)
  );
  const currentArt = arts[currentArtIndex] || arts[0];
  const tokenPageUrl =
    provider === 'GitHub'
      ? 'https://github.com/settings/tokens/new?scopes=repo&description=mg-node'
      : 'https://gitee.com/profile/personal_access_tokens';

  // Auto carousel effect
  useEffect(() => {
    if (settings.carousel !== 'auto' || showCustomize || loading) return;

    const timer = setInterval(() => {
      let nextIndex = (currentArtIndex + 1) % arts.length;
      if (settings.artOrder === 'random' && arts.length > 2) {
        do {
          nextIndex = Math.floor(Math.random() * arts.length);
        } while (nextIndex === currentArtIndex);
      }
      updateSettings({ loginArt: arts[nextIndex].id });
    }, settings.interval * 1000);

    return () => clearInterval(timer);
  }, [settings.carousel, settings.interval, settings.artOrder, currentArtIndex, arts, showCustomize, loading]);

  const handlePrevArt = () => {
    const prevIndex = (currentArtIndex - 1 + arts.length) % arts.length;
    updateSettings({ loginArt: arts[prevIndex].id });
  };

  const handleNextArt = () => {
    let nextIndex = (currentArtIndex + 1) % arts.length;
    if (settings.artOrder === 'random' && arts.length > 2) {
      do {
        nextIndex = Math.floor(Math.random() * arts.length);
      } while (nextIndex === currentArtIndex);
    }
    updateSettings({ loginArt: arts[nextIndex].id });
  };

  const handleOpenTokenPage = async () => {
    setErrorMessage('');
    try {
      await openUrl(tokenPageUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '无法打开 Token 页面，请检查默认浏览器设置。');
    }
  };

  const authenticateWithToken = async (
    targetProvider: 'GitHub' | 'Gitee',
    token: string,
    saveCredential: boolean
  ) => {
    if (loading) return;
    setErrorMessage('');
    setLoading(true);

    try {
      let userData: any;
      let realRepos: any[] = [];
      if (targetProvider === 'GitHub') {
        const userRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
        });
        if (!userRes.ok) {
          throw new Error(`GitHub Token 校验失败 (${userRes.status})，请检查 Token 是否有效或已过期。`);
        }

        // Scope validation: Classic GitHub Tokens return `x-oauth-scopes` header
        const scopesHeader = userRes.headers.get('x-oauth-scopes');
        if (scopesHeader !== null) {
          const scopes = scopesHeader.split(',').map((s) => s.trim().toLowerCase());
          const hasRepoScope = scopes.some((s) => s === 'repo' || s === 'public_repo');
          if (!hasRepoScope) {
            throw new Error(
              `Token 权限不足：当前 Token 未勾选「repo」仓库读写权限 (当前权限: [${scopes.join(', ') || '无'}])。请在 GitHub 重新生成勾选了 repo 权限的 Personal Access Token，否则无法将笔记同步到 Git。`
            );
          }
        }

        userData = await userRes.json();
        const reposRes = await fetch(
          'https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100',
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github+json',
            },
          }
        );
        if (reposRes.ok) {
          realRepos = await reposRes.json();
        } else if (reposRes.status === 401 || reposRes.status === 403) {
          throw new Error(`GitHub Token 缺少仓库读取与写入权限 (${reposRes.status})，请确认细粒度 Token (Fine-grained token) 是否已授权对应仓库的 Contents: Read and write 权限。`);
        }
      } else {
        const userRes = await fetch(`https://gitee.com/api/v5/user?access_token=${encodeURIComponent(token)}`);
        if (!userRes.ok) throw new Error(`Gitee Token 校验失败 (${userRes.status})，请检查 Token 是否有效。`);
        userData = await userRes.json();
        const reposRes = await fetch(
          `https://gitee.com/api/v5/user/repos?access_token=${encodeURIComponent(token)}&sort=updated&per_page=100`
        );
        if (reposRes.ok) {
          realRepos = await reposRes.json();
        } else if (reposRes.status === 401 || reposRes.status === 403) {
          throw new Error(`Gitee Token 权限不足 (${reposRes.status})，请确认已勾选 projects (用户仓库) 权限。`);
        }
      }

      const username = userData.login;
      const nickname = userData.name || username;
      const { invoke } = await import('@tauri-apps/api/core');
      if (saveCredential) {
        await invoke('store_keychain_token', {
          provider: targetProvider.toLowerCase(),
          username,
          token,
        });
        // Update local savedCredentials list so user sees it right away
        setSavedCredentials((prev) => {
          const providerLower = targetProvider.toLowerCase() as 'github' | 'gitee';
          const filtered = prev.filter(
            (c) => !(c.provider === providerLower && c.username.toLowerCase() === username.toLowerCase())
          );
          return [{ provider: providerLower, username }, ...filtered];
        });
      }
      setProvider(targetProvider);
      updateSettings({ nickname });
      onLoginSuccess(targetProvider, username, token, realRepos);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '连接失败，请检查网络或 Token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    const token = tokenInput.trim();
    if (token) {
      await authenticateWithToken(provider, token, true);
      return;
    }

    if (method === 'token') {
      if (selectedCredential) {
        await handleSavedCredentialLogin(selectedCredential);
        return;
      }
      setErrorMessage('请输入 Personal Access Token，或在下方选择已保存的密钥登录。');
      return;
    }

    // 免密 / 本地模式
    if (loading) return;
    setErrorMessage('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(provider, settings.nickname || 'Alex');
    }, 600);
  };

  const handleSavedCredentialLogin = async (credential: SavedCredential) => {
    if (loading) return;
    setLoading(true);
    setErrorMessage('');
    const targetProvider = credential.provider === 'gitee' ? 'Gitee' : 'GitHub';
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const token: string | null = await invoke('read_keychain_token', {
        provider: credential.provider,
        username: credential.username,
      });
      if (!token) {
        await invoke('remove_keychain_token', {
          provider: credential.provider,
          username: credential.username,
        });
        setSavedCredentials((current) => current.filter((item) => item !== credential));
        throw new Error('这个密钥已从 macOS 钥匙串中移除，请重新添加。');
      }
      await authenticateWithToken(targetProvider, token, false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '读取已保存密钥失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSavedCredential = async (credential: SavedCredential) => {
    const providerName = credential.provider === 'gitee' ? 'Gitee' : 'GitHub';
    if (!window.confirm(`从 macOS 钥匙串删除 ${providerName} · ${credential.username} 的密钥？`)) return;
    setCredentialLoadError('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('remove_keychain_token', {
        provider: credential.provider,
        username: credential.username,
      });
      const next = savedCredentials.filter((item) => credentialKey(item) !== credentialKey(credential));
      setSavedCredentials(next);
      if (selectedCredentialKey === credentialKey(credential)) {
        setSelectedCredentialKey(next[0] ? credentialKey(next[0]) : '');
      }
    } catch (error) {
      setCredentialLoadError(error instanceof Error ? error.message : '删除密钥失败。');
    }
  };

  const selectedCredential = savedCredentials.find(
    (credential) => credentialKey(credential) === selectedCredentialKey
  );

  return (
    <div
      className="login-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(12px, 3vh, 32px)',
        boxSizing: 'border-box',
        background: 'var(--c-bg, #f5f5f4)',
        overflow: 'auto',
      }}
    >
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: '1152px',
          height: 'clamp(540px, 86vh, 660px)',
          minHeight: '520px',
          borderRadius: '20px',
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.05fr) minmax(380px, 1fr)',
          background: 'var(--c-surface, #ffffff)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
          border: '1px solid var(--c-line-strong, #dfe2ea)',
          position: 'relative',
        }}
      >
        {/* Left Column: Hand-drawn Illustration & Slogans */}
        <div
          className="login-art-panel"
          style={{
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            minHeight: 0,
            width: '100%',
            height: '100%',
            background: '#f6efe2',
          }}
        >
          <img
            src={currentArt.src}
            alt={currentArt.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'opacity 0.4s ease',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(to top, rgba(246, 239, 226, 0.96) 0%, rgba(246, 239, 226, 0.4) 28%, rgba(246, 239, 226, 0) 50%)',
            }}
          />

          {/* Grok-bot Style App Logo Badge */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(8px)',
                borderRadius: '16px',
                padding: '6px 14px 6px 8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                border: '1px solid rgba(255, 255, 255, 0.6)',
              }}
            >
              <AppLogo size={38} showText={true} theme="emerald" />
            </div>
          </div>

          {/* Bottom Slogan & Carousel controls */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              marginTop: 'auto',
              padding: '28px',
              color: '#3b342c',
            }}
          >
            <p
              className="hand"
              style={{
                fontSize: '26px',
                fontWeight: 400,
                lineHeight: 1.35,
                letterSpacing: '0.02em',
                minHeight: '3.2rem',
                margin: 0,
              }}
            >
              {currentArt.slogan || '写下今天，晒晒太阳，慢慢生长'}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginTop: '16px',
              }}
            >
              {settings.carousel !== 'pin' && arts.length > 1 && (
                <>
                  <button
                    onClick={handlePrevArt}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(59, 52, 44, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: '#3b342c',
                      transition: 'all 0.2s',
                    }}
                  >
                    ‹
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {arts.map((art, idx) => (
                      <button
                        key={art.id}
                        onClick={() => updateSettings({ loginArt: art.id })}
                        style={{
                          height: '8px',
                          borderRadius: '4px',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'all 0.3s',
                          width: idx === currentArtIndex ? '24px' : '8px',
                          background: idx === currentArtIndex ? '#3b342c' : 'rgba(59, 52, 44, 0.3)',
                        }}
                        title={art.name}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextArt}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(59, 52, 44, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: '#3b342c',
                      transition: 'all 0.2s',
                    }}
                  >
                    ›
                  </button>
                </>
              )}

              <span
                style={{
                  fontSize: '12px',
                  color: '#3b342c',
                  opacity: 0.8,
                  marginLeft: '4px',
                  fontWeight: 500,
                }}
              >
                {currentArt.name}
                {settings.carousel === 'pin' && ' · 固定'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form & Customization entry */}
        <div
          className="login-form-panel"
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 'clamp(24px, 4vw, 44px)',
            minWidth: '360px',
            height: '100%',
            overflowY: 'auto',
            background: 'var(--c-surface, #ffffff)',
          }}
        >
          {/* Top Right "🎨 个性化" trigger */}
          <button
            onClick={() => setShowCustomize((prev) => !prev)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid var(--c-line-strong, #dfe2ea)',
              background: 'var(--c-surface, #ffffff)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--c-text-2, #555b6e)',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <PaletteIcon size={13} className="text-pink-500" />
            <span>个性化</span>
          </button>

          {/* Greeting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <Avatar size={48} />
            <div>
              <h2
                className="hand"
                style={{
                  fontSize: '24px',
                  fontWeight: 400,
                  margin: 0,
                  color: 'var(--c-text, #1f2433)',
                  lineHeight: 1.2,
                }}
              >
                你好，{settings.nickname || '朋友'} ~
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--c-muted, #8a90a2)', margin: '4px 0 0 0' }}>
                登录并连接你的私密笔记仓库{' '}
                <code
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: 'var(--c-surface-3, #f0f1f6)',
                    fontFamily: 'var(--f-mono)',
                    fontSize: '11px',
                    color: 'var(--accent-700, #047857)',
                  }}
                >
                  my-git-note
                </code>
              </p>
            </div>
          </div>

          {/* Providers: GitHub & Gitee */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <button
              onClick={() => {
                setProvider('GitHub');
                setErrorMessage('');
              }}
              style={{
                padding: '12px',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                border:
                  provider === 'GitHub'
                    ? '1.5px solid var(--accent-500, #10b981)'
                    : '1px solid var(--c-line-strong, #dfe2ea)',
                background:
                  provider === 'GitHub'
                    ? 'color-mix(in srgb, var(--accent-50, #ecfdf5) 50%, transparent)'
                    : 'transparent',
                boxShadow: provider === 'GitHub' ? '0 0 0 2px var(--accent-100, #d1fae5)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#0f172a',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  marginBottom: '8px',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="18" r="2.5" />
                  <circle cx="6" cy="6" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <path d="M6 8.5v7M18 8.5c0 5-6 4-11.5 7.5" />
                </svg>
              </div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--c-text)' }}>GitHub</div>
              <div style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '2px' }}>
                海外 · GitHub Pages
              </div>
            </button>

            <button
              onClick={() => {
                setProvider('Gitee');
                setErrorMessage('');
              }}
              style={{
                padding: '12px',
                borderRadius: '12px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                border:
                  provider === 'Gitee'
                    ? '1.5px solid var(--accent-500, #10b981)'
                    : '1px solid var(--c-line-strong, #dfe2ea)',
                background:
                  provider === 'Gitee'
                    ? 'color-mix(in srgb, var(--accent-50, #ecfdf5) 50%, transparent)'
                    : 'transparent',
                boxShadow: provider === 'Gitee' ? '0 0 0 2px var(--accent-100, #d1fae5)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#dc2626',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '14px',
                  marginBottom: '8px',
                }}
              >
                G
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '13px',
                  color: 'var(--c-text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                Gitee
                <span
                  title="Gitee Pages 服务已下线：仅作私有存储，公开发布走 GitHub Pages"
                  style={{ color: 'var(--c-warn, #b36b00)', fontSize: '12px', cursor: 'help' }}
                >
                  ⓘ
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--c-muted)', marginTop: '2px' }}>
                国内 · Gitee Pages
              </div>
            </button>
          </div>

          {/* Auth Method Switch */}
          <div
            style={{
              display: 'flex',
              padding: '4px',
              borderRadius: '8px',
              background: 'var(--c-surface-3, #f0f1f6)',
              fontSize: '12px',
              marginBottom: '14px',
            }}
          >
            <button
              onClick={() => setMethod('token')}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: method === 'token' ? 600 : 400,
                background: method === 'token' ? 'var(--c-surface, #ffffff)' : 'transparent',
                color: method === 'token' ? 'var(--c-text, #1f2433)' : 'var(--c-muted, #8a90a2)',
                boxShadow: method === 'token' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              访问令牌 Token (真实鉴权与拉取)
            </button>
            <button
              onClick={() => setMethod('oauth')}
              style={{
                flex: 1,
                padding: '6px 0',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: method === 'oauth' ? 600 : 400,
                background: method === 'oauth' ? 'var(--c-surface, #ffffff)' : 'transparent',
                color: method === 'oauth' ? 'var(--c-text, #1f2433)' : 'var(--c-muted, #8a90a2)',
                boxShadow: method === 'oauth' ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              免密 / 本地模式
            </button>
          </div>

          {/* Method body */}
          <div style={{ minHeight: '62px', marginBottom: '16px' }}>
            {method === 'token' ? (
              <div>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '11px',
                      color: 'var(--c-muted)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <KeyIcon size={14} />
                  </span>
                  <input
                    type="password"
                    placeholder={`粘贴 ${provider} Personal Access Token (如 ghp_...)`}
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      setErrorMessage('');
                    }}
                    className="field"
                    style={{
                      paddingLeft: '36px',
                      fontSize: '12px',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--c-muted)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <LockClosedIcon size={11} className="text-slate-400" />
                    <span>令牌将安全加密保存在 macOS 钥匙串中</span>
                  </p>
                  <a
                    href={tokenPageUrl}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleOpenTokenPage();
                    }}
                    style={{ fontSize: '11px', color: 'var(--accent-600)', textDecoration: 'none' }}
                  >
                    获取 Token ↗
                  </a>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: 'var(--c-muted, #8a90a2)', lineHeight: 1.6, margin: 0 }}>
                无需输入 Token，您可在下一步直接填入任意 Git 仓库地址或创建本地离线仓库使用。
              </p>
            )}

            {errorMessage && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertTriangleIcon size={13} className="text-red-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {method === 'token' && (
            <div
              style={{
                marginBottom: '14px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--c-line-strong)',
                background: 'var(--c-surface-2)',
              }}
            >
              <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '7px' }}>
                已保存的登录密钥
              </div>
              {savedCredentials.length > 0 ? (
                <>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select
                      className="field"
                      value={selectedCredentialKey}
                      onChange={(event) => {
                        const newKey = event.target.value;
                        setSelectedCredentialKey(newKey);
                        const match = savedCredentials.find((c) => credentialKey(c) === newKey);
                        if (match) {
                          setProvider(match.provider === 'gitee' ? 'Gitee' : 'GitHub');
                        }
                      }}
                      aria-label="选择已保存的登录密钥"
                      style={{ flex: 1, minWidth: 0, fontSize: '12px' }}
                    >
                      {savedCredentials.map((credential) => (
                        <option key={credentialKey(credential)} value={credentialKey(credential)}>
                          {credential.provider === 'gitee' ? 'Gitee' : 'GitHub'} · {credential.username}
                        </option>
                      ))}
                    </select>
                    {selectedCredential && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSavedCredential(selectedCredential)}
                        disabled={loading}
                        style={{
                          padding: '0 10px',
                          borderRadius: '8px',
                          border: '1px solid #fecaca',
                          color: '#dc2626',
                          background: '#fff7f7',
                          cursor: loading ? 'default' : 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => selectedCredential && void handleSavedCredentialLogin(selectedCredential)}
                    disabled={loading || !selectedCredential}
                    style={{
                      width: '100%',
                      marginTop: '7px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--accent-200)',
                      color: 'var(--accent-700)',
                      background: 'var(--accent-50)',
                      cursor: loading || !selectedCredential ? 'default' : 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {loading ? '正在验证密钥…' : '使用所选密钥登录'}
                  </button>
                </>
              ) : (
                <div style={{ color: 'var(--c-muted)', fontSize: '11px' }}>
                  暂无已保存密钥；首次使用 Token 登录后会自动保存到 macOS 钥匙串。
                </div>
              )}
              {credentialLoadError && (
                <div style={{ marginTop: '6px', color: '#dc2626', fontSize: '11px' }}>
                  {credentialLoadError}
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              fontWeight: 500,
              fontSize: '14px',
              color: '#ffffff',
              border: 'none',
              cursor: loading ? 'default' : 'pointer',
              background: 'var(--accent-600, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px color-mix(in srgb, var(--accent-600) 30%, transparent)',
              transition: 'background 0.2s',
            }}
          >
            {loading ? (
              <>
                <SyncIcon size={14} className="animate-spin" /> 正在验证 {provider} 并拉取真实仓库…
              </>
            ) : tokenInput.trim() ? (
              `连接 ${provider} 并继续 ➔`
            ) : method === 'token' && selectedCredential ? (
              `使用 ${selectedCredential.provider === 'gitee' ? 'Gitee' : 'GitHub'} · ${selectedCredential.username} 登录 ➔`
            ) : (
              `连接 ${provider} 并继续 ➔`
            )}
          </button>

          {/* Direct Local Workspace Entry (Frictionless / Local-First) */}
          <button
            type="button"
            onClick={() => onLoginSuccess('local', settings.nickname || 'Alex')}
            style={{
              width: '100%',
              padding: '10px 14px',
              marginTop: '10px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--c-text-2, #555b6e)',
              border: '1px solid var(--c-line-strong, #dfe2ea)',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>直接体验本地工作台 (免密 / 离线模式)</span>
            <span>→</span>
          </button>

          <p
            style={{
              textAlign: 'center',
              fontSize: '11px',
              color: 'var(--c-muted)',
              marginTop: '16px',
              marginBottom: 0,
            }}
          >
            头像、主题与插画可点击右上角「个性化」随时更换
          </p>

          {/* Customize Popover */}
          {showCustomize && (
            <div
              style={{
                position: 'absolute',
                top: '56px',
                right: '20px',
                width: '340px',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-lg, 0 20px 60px rgba(0,0,0,0.18))',
                border: '1px solid var(--c-line-strong)',
                background: 'var(--c-surface, #ffffff)',
                zIndex: 50,
                overflow: 'hidden',
                height: 'min(580px, calc(100% - 72px))',
              }}
            >
              <CustomizePanel showArt={true} onClose={() => setShowCustomize(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
