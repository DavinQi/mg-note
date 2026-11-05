import React, { useState } from 'react';
import {
  RootFolderIcon,
  CloseIcon,
  PlusIcon,
  ComputerDesktopIcon,
  CloudIcon,
  AlertTriangleIcon,
  CheckIcon,
} from '../../components/Icons';
import { DataRootGroupInfo } from '../../types/note';

interface CreateRootGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newGroup: DataRootGroupInfo) => void;
}

const PRESET_TEMPLATES = [
  {
    id: 'heavy',
    label: '大文档与图书卷',
    desc: '专门存放 PDF、PPTX、Word 等大体积资料',
    defaultName: 'docs-vault',
    defaultAlias: '大文档与图书库',
  },
  {
    id: 'archive',
    label: '历史数据归档卷',
    desc: '沉淀过往年份已完结笔记，彻底释放主仓库配额',
    defaultName: 'archive-vault',
    defaultAlias: '历史归档库',
  },
  {
    id: 'work',
    label: '工作日常专项卷',
    desc: '独立管理职场项目、合同与业务周报',
    defaultName: 'work-notes',
    defaultAlias: '工作项目库',
  },
  {
    id: 'custom',
    label: '空白常规根组',
    desc: '纯净的第二笔记仓库，从零开始自由构建',
    defaultName: 'my-git-note-vol2',
    defaultAlias: '分流笔记本 Vol.2',
  },
];

export const CreateRootGroupModal: React.FC<CreateRootGroupModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [selectedPreset, setSelectedPreset] = useState('heavy');
  const [repoName, setRepoName] = useState('docs-vault');
  const [displayName, setDisplayName] = useState('大文档与图书库');
  const [remoteUrl, setRemoteUrl] = useState('');
  const [useRemote, setUseRemote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setSelectedPreset(preset.id);
    setRepoName(preset.defaultName);
    setDisplayName(preset.defaultAlias);
  };

  const handleNameChange = (val: string) => {
    // Sanitize: allow lowercase alphanumeric, hyphens, underscores
    const sanitized = val.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    setRepoName(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) {
      setErrorMsg('请输入数据根组英文标识名称');
      return;
    }
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const newGroup: DataRootGroupInfo = await invoke('create_data_root_group', {
        name: repoName.trim(),
        displayName: displayName.trim() || repoName.trim(),
        provider: useRemote && remoteUrl ? 'git' : 'local',
        remoteUrl: useRemote && remoteUrl ? remoteUrl.trim() : null,
      });

      onCreated(newGroup);
      onClose();
    } catch (err) {
      console.error('Failed to create root group:', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--c-surface, #ffffff)',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.25)',
          border: '1px solid var(--c-line, #e2e8f0)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--c-line, #eceef3)',
            background: 'var(--c-surface-2, #fafaf9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--accent-50, #ecfdf5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RootFolderIcon size={18} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--c-text, #1e293b)' }}>
                新建数据根组 (独立 Git 仓库)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--c-muted, #64748b)', marginTop: '1px' }}>
                独立存储卷与 Git 配额，主仓库容量不再受限
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Preset templates */}
          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '8px', display: 'block' }}>
              推荐场景预设
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {PRESET_TEMPLATES.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      textAlign: 'left',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--accent-500, #10b981)' : 'var(--c-line, #e2e8f0)',
                      background: isSelected ? 'var(--accent-50, #ecfdf5)' : 'var(--c-surface, #ffffff)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--accent-800, #065f46)' : 'var(--c-text, #1e293b)' }}>
                        {preset.label}
                      </span>
                      {isSelected && <CheckIcon size={12} className="text-emerald-600" />}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--c-muted, #64748b)', lineHeight: 1.4 }}>
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '6px', display: 'block' }}>
                根组标识名称 (Repo ID) *
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="如: tech-vault-2026"
                required
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '6px', display: 'block' }}>
                界面显示别名 (Display Name)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="如: 大文档与图书库"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          {/* Remote binding toggle */}
          <div
            style={{
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--c-line, #e2e8f0)',
              background: 'var(--c-surface-2, #fafaf9)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--c-text, #1e293b)' }}>
                {useRemote ? <CloudIcon size={14} className="text-emerald-600" /> : <ComputerDesktopIcon size={14} className="text-slate-500" />}
                <span>{useRemote ? '关联远程 Git 仓库 (GitHub / Gitee)' : '免密纯本地独立仓库 (推荐)'}</span>
              </div>
              <button
                type="button"
                onClick={() => setUseRemote((prev) => !prev)}
                style={{
                  fontSize: '11px',
                  color: 'var(--accent-700, #047857)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px',
                }}
              >
                {useRemote ? '改为纯本地' : '配置远程 URL'}
              </button>
            </div>

            {useRemote ? (
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://gitee.com/your-name/your-new-repo.git"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                }}
              />
            ) : (
              <div style={{ fontSize: '10.5px', color: 'var(--c-muted, #64748b)' }}>
                即刻创建并保存在本机；支持随时在「仓库设置」中绑定 GitHub 或 Gitee 私有仓库推送云端。
              </div>
            )}
          </div>

          {/* Error notice */}
          {errorMsg && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#be123c',
                fontSize: '11.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertTriangleIcon size={14} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--c-line, #cbd5e1)',
                background: '#ffffff',
                color: 'var(--c-text-2, #475569)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !repoName.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isSubmitting ? 'wait' : 'pointer',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
              }}
            >
              <PlusIcon size={13} />
              <span>{isSubmitting ? '正在初始化仓库…' : '立即创建并切换'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
