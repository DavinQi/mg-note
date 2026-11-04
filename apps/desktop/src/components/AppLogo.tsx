import React from 'react';

interface AppLogoProps {
  size?: number;
  className?: string;
  theme?: 'dark' | 'light' | 'emerald';
  showText?: boolean;
  tagline?: string;
}

/**
 * Grok Bot 风格的 mg-node 官方卡通标识
 * 灵感参考：
 * 1. 经典 Grok Bot 极简圆角方形头部与无高光纯黑竖向胶囊眼 (▮ ▮)
 * 2. 融合 Git 笔记特性：顶部天线采用 Git Commit 节点分支结构 (○—○ 提交树)
 * 3. 极客与 Q 萌并存的大色块现代矢量设计
 */
export const AppLogoIcon: React.FC<{ size?: number; className?: string; theme?: 'dark' | 'light' | 'emerald' }> = ({
  size = 40,
  className = '',
  theme = 'emerald',
}) => {
  // Themes
  const isEmerald = theme === 'emerald';
  const isDark = theme === 'dark';

  const bgGradientId = `grok-bot-bg-${theme}-${size}`;
  const faceGradientId = `grok-bot-face-${theme}-${size}`;
  const eyeGlowId = `grok-bot-eye-${theme}-${size}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', userSelect: 'none' }}
    >
      <defs>
        {/* Background rounded container gradient */}
        <linearGradient id={bgGradientId} x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
          {isEmerald ? (
            <>
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </>
          ) : isDark ? (
            <>
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#f8fafc" />
            </>
          )}
        </linearGradient>

        {/* Bot faceplate gradient */}
        <linearGradient id={faceGradientId} x1="64" y1="36" x2="64" y2="108" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>

        {/* Subtle shadow */}
        <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* 1. App Icon Rounded Square (macOS Squircle style) */}
      <rect
        x="6"
        y="6"
        width="116"
        height="116"
        rx="28"
        fill={`url(#${bgGradientId})`}
        stroke={isEmerald ? '#059669' : isDark ? '#334155' : '#e2e8f0'}
        strokeWidth="2"
      />

      {/* 2. Top Git Antenna: Branch with commit nodes ○---○ */}
      {/* Central Stem */}
      <path
        d="M64 42V23"
        stroke={isEmerald || isDark ? '#a7f3d0' : '#059669'}
        strokeWidth="4"
        strokeLinecap="round"
      />
      {/* Left Git branch node */}
      <path
        d="M64 29C52 29 48 22 48 18"
        stroke={isEmerald || isDark ? '#6ee7b7' : '#10b981'}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="48" cy="18" r="4.5" fill="#34d399" stroke="#ffffff" strokeWidth="2" />
      {/* Right Git branch node */}
      <path
        d="M64 25C76 25 80 18 80 15"
        stroke={isEmerald || isDark ? '#34d399' : '#059669'}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="80" cy="15" r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />

      {/* 3. Ear Modules (Left & Right pill sensors) */}
      <rect x="18" y="58" width="7" height="22" rx="3.5" fill="#cbd5e1" opacity="0.9" />
      <rect x="103" y="58" width="7" height="22" rx="3.5" fill="#cbd5e1" opacity="0.9" />

      {/* 4. Grok Bot Head / Face Mask: Ultra-clean rounded squircle */}
      <rect
        x="23"
        y="38"
        width="82"
        height="64"
        rx="22"
        fill={`url(#${faceGradientId})`}
        filter="url(#soft-shadow)"
      />

      {/* Inner subtle visor screen */}
      <rect
        x="28"
        y="43"
        width="72"
        height="54"
        rx="17"
        fill="#ffffff"
        stroke="#f1f5f9"
        strokeWidth="1.5"
      />

      {/* 5. Signature Grok Bot Eyes: Iconic Vertical Capsules (▮ ▮) */}
      {/* Left Capsule Eye */}
      <rect
        x="45"
        y="55"
        width="10"
        height="26"
        rx="5"
        fill="#0f172a"
      />
      {/* Tiny tech catchlight in Grok eye */}
      <circle cx="48" cy="60" r="1.6" fill="#38bdf8" opacity="0.9" />

      {/* Right Capsule Eye */}
      <rect
        x="73"
        y="55"
        width="10"
        height="26"
        rx="5"
        fill="#0f172a"
      />
      {/* Tiny tech catchlight in Grok eye */}
      <circle cx="76" cy="60" r="1.6" fill="#38bdf8" opacity="0.9" />

      {/* 6. Minimalist Cute Mouth / Note Line */}
      <path
        d="M58 88C61.5 90.5 66.5 90.5 70 88"
        stroke="#64748b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* 7. Subtle Peach Cheek Blushes (Q 萌感) */}
      <ellipse cx="38" cy="74" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.4" />
      <ellipse cx="90" cy="74" rx="4.5" ry="2.5" fill="#f43f5e" opacity="0.4" />

      {/* 8. Forehead Git commit node mark */}
      <circle cx="64" cy="48" r="2.5" fill="#10b981" />
    </svg>
  );
};

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 40,
  className = '',
  theme = 'emerald',
  showText = false,
  tagline = 'my-git-note · 自有笔记工具',
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="flex-shrink-0 transition-transform hover:scale-105 active:scale-95 duration-200">
        <AppLogoIcon size={size} theme={theme} />
      </div>
      {showText && (
        <div className="flex flex-col justify-center leading-tight min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-tight text-slate-800 dark:text-slate-100 font-mono">
              mg-node
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              bot
            </span>
          </div>
          {tagline && (
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {tagline}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
