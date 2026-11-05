import React, { useEffect, useState, useRef } from 'react';
import {
  PdfIcon,
  ExternalLinkIcon,
  SyncIcon,
  AlertTriangleIcon,
} from '../../components/Icons';
import { Maximize2, Minimize2, RotateCw, Download } from 'lucide-react';

interface PdfViewerProps {
  repoName: string;
  relPath: string;
  title: string;
  onOpenExternal: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  repoName,
  relPath,
  title,
  onOpenExternal,
}) => {
  const [blobUrl, setBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const activeUrlRef = useRef<string>('');

  const loadPdf = async () => {
    setLoading(true);
    setError('');
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const bytes: number[] = await invoke('read_file_bytes', {
        repoName,
        relPath,
      });

      if (!bytes || bytes.length === 0) {
        throw new Error('PDF 文件内容为空');
      }

      const uint8 = new Uint8Array(bytes);
      const mb = uint8.length / (1024 * 1024);
      if (mb >= 1) {
        setFileSize(`${mb.toFixed(1)} MB`);
      } else {
        setFileSize(`${(uint8.length / 1024).toFixed(0)} KB`);
      }

      const blob = new Blob([uint8], { type: 'application/pdf' });
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      activeUrlRef.current = url;
      setBlobUrl(url);
    } catch (err) {
      console.error('Failed to load PDF bytes:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPdf();
    return () => {
      if (activeUrlRef.current) {
        URL.revokeObjectURL(activeUrlRef.current);
        activeUrlRef.current = '';
      }
    };
  }, [repoName, relPath]);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`wb-main-canvas ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}
    >
      {/* Top Banner Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 18px',
          borderBottom: '1px solid var(--c-line, #eceef3)',
          background: 'var(--c-surface, #ffffff)',
          flexShrink: 0,
          gap: '12px',
        }}
      >
        {/* Left: Document info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div className="flex-shrink-0 flex items-center">
            <PdfIcon size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--c-text, #1f2433)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="truncate">{title}</span>
              <span className="wb-kind-tag">PDF</span>
              {fileSize && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {fileSize}
                </span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--c-muted, #8a90a2)', marginTop: '2px' }}>
              高保真矢量渲染 · 支持连续滚动、手势缩放与文本复制
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!blobUrl || loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="保存 / 导出 PDF 副本到本机"
          >
            <Download size={13} />
            <span className="hidden sm:inline">导出</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            disabled={!blobUrl || loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏预览模式'}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{isFullscreen ? '退出全屏' : '全屏'}</span>
          </button>

          <button
            type="button"
            onClick={loadPdf}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="重新载入文档"
          >
            <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={onOpenExternal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent-600, #059669)',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(5, 150, 105, 0.2)',
            }}
            title="使用 macOS 系统自带「预览」应用打开，支持划线批注、手写签名与页面编辑"
          >
            <span>在「预览」中打开</span>
            <ExternalLinkIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main PDF Viewport Canvas */}
      <div
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          position: 'relative',
          background: '#525659',
          overflow: 'hidden',
        }}
      >
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'var(--c-surface, #ffffff)',
              zIndex: 10,
            }}
          >
            <SyncIcon size={26} className="animate-spin text-emerald-600" />
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--c-text, #1f2433)' }}>
              正在加载 PDF 矢量文档…
            </div>
            {fileSize && (
              <div style={{ fontSize: '11px', color: 'var(--c-muted, #8a90a2)' }}>
                文件大小：{fileSize}
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              background: 'var(--c-surface, #ffffff)',
              zIndex: 10,
            }}
          >
            <div
              style={{
                maxWidth: '420px',
                width: '100%',
                padding: '24px',
                borderRadius: '12px',
                textAlign: 'center',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                <AlertTriangleIcon size={32} className="text-red-500" />
              </div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#9f1239', margin: '0 0 6px 0' }}>
                无法在应用内直接读取此 PDF 文档
              </h3>
              <p style={{ fontSize: '11.5px', color: '#be123c', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                {error}
              </p>
              <button
                type="button"
                onClick={onOpenExternal}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--accent-600, #059669)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <span>在 macOS「预览」应用中打开 ↗</span>
              </button>
            </div>
          </div>
        )}

        {blobUrl && !error && (
          <object
            data={`${blobUrl}#toolbar=1&navpanes=1`}
            type="application/pdf"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          >
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=1`}
              title={title}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                display: 'block',
              }}
            />
          </object>
        )}
      </div>
    </div>
  );
};
