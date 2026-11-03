import React, { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Avatar } from '../components/Avatar';
import { CustomizePanel } from '../components/CustomizePanel';

interface LoginViewProps {
  onLoginSuccess: (provider: string, user: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { settings, updateSettings, getArts } = useSettings();
  const [provider, setProvider] = useState<'GitHub' | 'Gitee'>('GitHub');
  const [method, setMethod] = useState<'oauth' | 'token'>('oauth');
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleLogin = () => {
    if (loading) return;
    setLoading(true);
    // Simulate GitHub / Gitee login
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(provider, settings.nickname || 'Alex');
    }, 1200);
  };

  return (
    <div
      className="login-container relative w-full h-full flex flex-col items-center justify-center p-6 select-none"
      style={{ background: 'var(--c-bg, #f5f5f4)' }}
    >
      <div
        className="login-card w-full max-w-[1152px] h-[640px] rounded-2xl overflow-hidden shadow-2xl flex border border-slate-200/80 dark:border-slate-800"
        style={{
          background: 'var(--c-surface, #ffffff)',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
        }}
      >
        {/* Left Column: Hand-drawn Illustration & Slogans */}
        <div className="relative overflow-hidden flex flex-col bg-[#f6efe2]">
          <img
            src={currentArt.src}
            alt={currentArt.name}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to top, rgba(246, 239, 226, 0.96) 0%, rgba(246, 239, 226, 0.4) 28%, rgba(246, 239, 226, 0) 50%)',
            }}
          />

          {/* Logo Badge */}
          <div className="relative z-10 p-6 flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-white/90 grid place-items-center font-bold text-lg hand sketch-border shadow-sm"
              style={{ color: 'var(--accent-700, #047857)' }}
            >
              mg
            </div>
            <div className="bg-white/85 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
              <div className="font-bold text-sm text-slate-800 tracking-tight">mg-node</div>
              <div className="text-[10px] text-slate-500">my-git-note · 自有笔记工具</div>
            </div>
          </div>

          {/* Bottom Slogan & Carousel controls */}
          <div className="relative z-10 mt-auto p-7 text-[#3b342c]">
            <p className="hand text-2xl font-normal leading-snug tracking-wide min-h-[3.2rem]">
              {currentArt.slogan || '写下今天，晒晒太阳，慢慢生长'}
            </p>

            <div className="flex items-center gap-3 mt-4">
              {settings.carousel !== 'pin' && arts.length > 1 && (
                <>
                  <button
                    onClick={handlePrevArt}
                    className="w-7 h-7 rounded-full bg-white/80 hover:bg-white border border-[#3b342c]/20 flex items-center justify-center text-sm shadow-sm transition-all"
                  >
                    ‹
                  </button>

                  <div className="flex items-center gap-1.5">
                    {arts.map((art, idx) => (
                      <button
                        key={art.id}
                        onClick={() => updateSettings({ loginArt: art.id })}
                        className={`h-2 rounded-full transition-all ${
                          idx === currentArtIndex
                            ? 'w-6 bg-[#3b342c]'
                            : 'w-2 bg-[#3b342c]/30 hover:bg-[#3b342c]/50'
                        }`}
                        title={art.name}
                      />
                    ))}
                  </div>

                  <button
                    onClick={handleNextArt}
                    className="w-7 h-7 rounded-full bg-white/80 hover:bg-white border border-[#3b342c]/20 flex items-center justify-center text-sm shadow-sm transition-all"
                  >
                    ›
                  </button>
                </>
              )}

              <span className="text-xs text-[#3b342c]/75 ml-2 font-medium">
                {currentArt.name}
                {settings.carousel === 'pin' && ' · 📌 固定'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Login Form & Customization entry */}
        <div
          className="relative p-10 flex flex-col justify-center"
          style={{ background: 'var(--c-surface, #ffffff)' }}
        >
          {/* Top Right "🎨 个性化" trigger */}
          <button
            onClick={() => setShowCustomize((prev) => !prev)}
            className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <span style={{ color: 'var(--accent-600)' }}>🎨</span> 个性化
          </button>

          {/* Greeting */}
          <div className="flex items-center gap-3.5 mb-6">
            <Avatar size={48} />
            <div>
              <h2 className="hand text-2xl font-normal text-slate-800 dark:text-slate-100">
                你好，{settings.nickname || '朋友'} ~
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                登录并连接你的私密笔记仓库{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                  my-git-note
                </code>
              </p>
            </div>
          </div>

          {/* Providers: GitHub & Gitee */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setProvider('GitHub')}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                provider === 'GitHub'
                  ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              style={{
                borderColor: provider === 'GitHub' ? 'var(--accent-500)' : undefined,
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 grid place-items-center text-white mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="18" r="2.5" />
                  <circle cx="6" cy="6" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <path d="M6 8.5v7M18 8.5c0 5-6 4-11.5 7.5" />
                </svg>
              </div>
              <div className="font-semibold text-sm">GitHub</div>
              <div className="text-[11px] text-slate-400 mt-0.5">海外 · GitHub Pages</div>
            </button>

            <button
              onClick={() => setProvider('Gitee')}
              className={`p-3.5 rounded-xl border text-left transition-all relative ${
                provider === 'Gitee'
                  ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
              style={{
                borderColor: provider === 'Gitee' ? 'var(--accent-500)' : undefined,
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-red-600 grid place-items-center text-white font-bold text-sm mb-2">
                G
              </div>
              <div className="font-semibold text-sm flex items-center gap-1">
                Gitee
                <span
                  title="Gitee Pages 服务已下线：仅作私有存储，公开发布走 GitHub Pages"
                  className="text-amber-500 text-xs cursor-help"
                >
                  ⓘ
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">国内 · Gitee Pages</div>
            </button>
          </div>

          {/* Auth Method Switch */}
          <div className="flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs mb-4">
            <button
              onClick={() => setMethod('oauth')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                method === 'oauth'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              授权登录(推荐)
            </button>
            <button
              onClick={() => setMethod('token')}
              className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
                method === 'token'
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500'
              }`}
            >
              访问令牌 Token
            </button>
          </div>

          {/* Method body */}
          <div className="min-h-[64px] mb-6">
            {method === 'oauth' ? (
              <p className="text-xs text-slate-500 leading-relaxed">
                将打开默认浏览器通过 OAuth 设备流 (Device Flow) 安全授权，授权范围：
                <span className="text-emerald-600 font-mono" style={{ color: 'var(--accent-600)' }}>
                  repo
                </span>{' '}
                (私有仓库读写权限)。
              </p>
            ) : (
              <div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔑</span>
                  <input
                    type="password"
                    placeholder={`粘贴 ${provider} Personal Access Token`}
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <span>🔒</span> 令牌仅加密保存在 macOS 钥匙串 (Keychain) 中
                </p>
              </div>
            )}
          </div>

          {/* Action button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium text-sm text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            style={{
              background: 'var(--accent-600, #059669)',
            }}
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">◌</span> 正在连接 {provider} 并拉取笔记…
              </>
            ) : (
              `使用 ${provider} 登录`
            )}
          </button>

          <p className="text-center text-[11px] text-slate-400 mt-4">
            头像、主题与插画可点击右上角「个性化」随时更换
          </p>

          {/* Customize Popover */}
          {showCustomize && (
            <div
              className="absolute top-14 right-5 w-80 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden"
              style={{
                background: 'var(--c-surface, #ffffff)',
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
