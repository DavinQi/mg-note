import React from 'react';
import { NoteKind } from '../../types/note';
import {
  DocxIcon,
  PdfIcon,
  PptxIcon,
  ExternalLinkIcon,
  PencilIcon,
  HighlighterIcon,
  ChatBubbleIcon,
  DocxPreviewIllustration,
  PdfPreviewIllustration,
} from '../../components/Icons';

interface DocViewerProps {
  title: string;
  kind: NoteKind;
  onOpenExternal: () => void;
}

export const DocViewer: React.FC<DocViewerProps> = ({ title, kind, onOpenExternal }) => {
  const isWord = kind === 'docx';
  const isPpt = kind === 'pptx';
  const isPdf = kind === 'pdf';

  return (
    <div className="wb-main-canvas">
      {/* Top Banner Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid var(--c-line, #eceef3)',
          background: 'var(--c-surface, #ffffff)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="flex-shrink-0 flex items-center">
            {isWord ? (
              <DocxIcon size={24} />
            ) : isPpt ? (
              <PptxIcon size={24} />
            ) : (
              <PdfIcon size={24} />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--c-text, #1f2433)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{title}</span>
              <span className="wb-kind-tag">{kind.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--c-muted, #8a90a2)', marginTop: '2px' }}>
              高保真只读预览模式 · 批注已分离存储至 sidecar
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
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
          >
            <span>在系统默认应用中打开</span>
            <ExternalLinkIcon size={13} />
          </button>
        </div>
      </div>

      {/* Main Document Content Canvas (A4 sheet preview) */}
      <div className="wb-doc-viewport">
        <div className="wb-a4-sheet">
          <div style={{ borderBottom: '1px solid var(--c-line, #eceef3)', paddingBottom: '16px', marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--c-text, #1f2433)' }}>
              {title}
            </h1>
            <div style={{ fontSize: '11px', color: 'var(--c-muted, #8a90a2)' }}>
              文档格式：{kind.toUpperCase()} · 外部编辑保存后将通过 macOS FSEvents 自动热刷新与索引
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', textAlign: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              {isWord ? (
                <DocxPreviewIllustration size={72} />
              ) : isPpt ? (
                <PptxIcon size={64} />
              ) : (
                <PdfPreviewIllustration size={72} />
              )}
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--c-text, #1f2433)', marginBottom: '8px' }}>
              {isWord ? 'DOCX 文档预览' : isPpt ? 'PPTX 幻灯片浏览' : '矢量文档预览'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--c-muted, #8a90a2)', maxWidth: '420px', lineHeight: 1.6, marginBottom: '24px' }}>
              为确保复杂排版、公式与高保真图表 100% 不发生版面变形与错乱，点击右上角即可无缝调用系统本机应用进行修改并自动写回仓库。
            </p>
            <button
              onClick={onOpenExternal}
              className="btn btn--sm flex items-center gap-2"
              style={{ padding: '8px 16px', borderRadius: '8px' }}
            >
              <span>打开本机默认程序进行查看与编辑</span>
              <ExternalLinkIcon size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
