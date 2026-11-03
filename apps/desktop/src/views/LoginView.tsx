import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Avatar } from '../components/Avatar';
import { CustomizePanel } from '../components/CustomizePanel';

interface LoginViewProps {
  onLoginSuccess: (provider: string, user: string, token?: string, repos?: any[]) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { settings, updateSettings, getArts } = useSettings();
  const [provider, setProvider] = useState<'GitHub' | 'Gitee'>('GitHub');
  const [method, setMethod] = useState<'oauth' | 'token'>('token');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showCustomize, setShowCustomize] = useState(false);

  const arts = getArts();
  const currentArtIndex = Math.max(
    0,
    arts.findIndex((a) => a.id === settings.loginArt)
  );
  const currentArt = arts[currentArtIndex] || arts[0];

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

  const handleLogin = async () => {
    if (loading) return;
    setErrorMessage('');
    setLoading(true);

    const token = tokenInput.trim();

    // 1. 如果用户输入了真实 Token，调用官方 API 进行真实鉴权与仓库拉取
    if (token) {
      try {
        if (provider === 'GitHub') {
          // 调用 GitHub API 获取用户信息
          const userRes = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });

          if (!userRes.ok) {
            throw new Error(`GitHub Token 校验失败 (${userRes.status})，请检查 Token 权限 (需勾选 repo 范围)`);
          }

          const userData = await userRes.json();
          const username = userData.login;
          const nickname = userData.name || userData.login;

          // 调用 GitHub API 获取真实的仓库列表
          const reposRes = await fetch(
            'https://api.github.com/user/repos?affiliation=owner&sort=updated&per_page=100',
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );

          let realRepos: any[] = [];
          if (reposRes.ok) {
            realRepos = await reposRes.json();
          }

          // 将 Token 安全保存至 macOS Keychain
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('store_keychain_token', {
              provider: 'github',
              username,
              token,
            });
          } catch (_) {}

          updateSettings({ nickname });
          setLoading(false);
          onLoginSuccess(provider, username, token, realRepos);
          return;
        } else {
          // Gitee Token 验证
          const userRes = await fetch(`https://gitee.com/api/v5/user?access_token=${token}`);
          if (!userRes.ok) {
            throw new Error(`Gitee Token 校验失败 (${userRes.status})`);
          }
          const userData = await userRes.json();
          const username = userData.login;
          const nickname = userData.name || userData.login;

          const reposRes = await fetch(
            `https://gitee.com/api/v5/user/repos?access_token=${token}&sort=updated&per_page=100`
          );
          let realRepos: any[] = [];
          if (reposRes.ok) {
            realRepos = await reposRes.json();
          }

          try {
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('store_keychain_token', {
              provider: 'gitee',
              username,
              token,
            });
          } catch (_) {}

          updateSettings({ nickname });
          setLoading(false);
          onLoginSuccess(provider, username, token, realRepos);
          return;
        }
      } catch (err: any) {
        setLoading(false);
        setErrorMessage(err.message || '连接失败，请检查网络或 Token');
        return;
      }
    }

    // 2. 如果没有填 Token 或选择 Device Flow/本地模式，直接进入仓库选择配置
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(provider, settings.nickname || 'Alex');
    }, 600);
  };

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

          {/* Logo Badge */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              className="hand sketch-border"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.9)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 700,
                fontSize: '18px',
                color: 'var(--accent-700, #047857)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              mg
            </div>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.88)',
                backdropFilter: 'blur(6px)',
                borderRadius: '8px',
                padding: '4px 12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#1f2433', letterSpacing: '-0.01em' }}>
                mg-node
              </div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>my-git-note · 自有笔记工具</div>
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
                {settings.carousel === 'pin' && ' · 📌 固定'}
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
            <span style={{ color: 'var(--accent-600)' }}>🎨</span> 个性化
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
                      top: '9px',
                      color: 'var(--c-muted)',
                      fontSize: '14px',
                    }}
                  >
                    🔑
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
                    <span>🔒</span> 令牌将安全加密保存在 macOS 钥匙串中
                  </p>
                  <a
                    href={
                      provider === 'GitHub'
                        ? 'https://github.com/settings/tokens/new?scopes=repo&description=mg-node'
                        : 'https://gitee.com/profile/personal_access_tokens/new'
                    }
                    target="_blank"
                    rel="noreferrer"
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
                }}
              >
                ⚠ {errorMessage}
              </div>
            )}
          </div>

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
                <span className="inline-block animate-spin">◌</span> 正在验证 {provider} 并拉取真实仓库…
              </>
            ) : (
              `连接 ${provider} 并继续 ➔`
            )}
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
                maxHeight: 'calc(100% - 72px)',
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
