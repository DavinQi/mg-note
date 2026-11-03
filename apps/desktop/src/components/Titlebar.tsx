import React from 'react';

interface TitlebarProps {
  title?: string;
  children?: React.ReactNode;
}

export const Titlebar: React.FC<TitlebarProps> = ({ title = 'mg-node', children }) => {
  return (
    <header
      data-tauri-drag-region
      className="titlebar flex items-center justify-between select-none relative z-50 w-full"
      style={{
        height: '38px',
        padding: '0 16px 0 76px', // 76px gives ample room for macOS native traffic light buttons
        borderBottom: '1px solid var(--c-line, #eceef3)',
        background: 'var(--c-surface, #ffffff)',
        color: 'var(--c-text-2, #555b6e)',
      }}
    >
      <div data-tauri-drag-region className="flex-1 flex items-center h-full">
        <span
          data-tauri-drag-region
          className="text-xs font-medium text-slate-500 tracking-wide truncate"
          style={{ color: 'var(--c-muted, #8a90a2)' }}
        >
          {title}
        </span>
      </div>

      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
};
