import React, { useState } from 'react';
import {
  RootFolderIcon,
  CloseIcon,
  FolderIcon,
  CheckIcon,
  AlertTriangleIcon,
} from '../../components/Icons';
import { DataRootGroupInfo } from '../../types/note';

interface MoveToRootGroupModalProps {
  isOpen: boolean;
  sourceRepo: string;
  sourcePath: string;
  isFolder: boolean;
  rootGroups: DataRootGroupInfo[];
  onClose: () => void;
  onMoved: (targetRepo: string, targetPath: string) => Promise<void> | void;
}

export const MoveToRootGroupModal: React.FC<MoveToRootGroupModalProps> = ({
  isOpen,
  sourceRepo,
  sourcePath,
  isFolder,
  rootGroups,
  onClose,
  onMoved,
}) => {
  const otherGroups = rootGroups.filter((g) => g.name !== sourceRepo);
  const [selectedTargetRepo, setSelectedTargetRepo] = useState(
    otherGroups[0]?.name || ''
  );
  const [targetFolder, setTargetFolder] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const itemName = sourcePath.split('/').pop() || sourcePath;

  const handleConfirm = async () => {
    if (!selectedTargetRepo) {
      setErrorMsg('请选择目标数据根组');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const finalRelPath: string = await invoke('move_item_between_repos', {
        sourceRepo,
        sourcePath,
        targetRepo: selectedTargetRepo,
        targetFolder: targetFolder.trim(),
        isFolder,
      });

      await onMoved(selectedTargetRepo, finalRelPath);
      onClose();
    } catch (err) {
      console.error('Failed to move item between root groups:', err);
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
          maxWidth: '460px',
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
            padding: '14px 18px',
            borderBottom: '1px solid var(--c-line, #eceef3)',
            background: 'var(--c-surface-2, #fafaf9)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RootFolderIcon size={18} />
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--c-text, #1e293b)' }}>
              跨数据根组迁移 (释放原仓库空间)
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--c-muted, #64748b)', marginBottom: '3px' }}>
              待迁移的{isFolder ? '文件夹' : '笔记文档'}：
            </div>
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--c-text, #1e293b)',
                padding: '7px 10px',
                borderRadius: '6px',
                background: 'var(--c-surface-2, #f8fafc)',
                border: '1px solid var(--c-line, #e2e8f0)',
              }}
            >
              {itemName}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '6px', display: 'block' }}>
              选择目标数据根组 (独立 Git 仓库)：
            </label>
            {otherGroups.length === 0 ? (
              <div style={{ padding: '12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fef3c7', fontSize: '12px', color: '#b45309' }}>
                目前暂无其他数据根组。请先点击侧边栏「＋ 新建数据根组」创建第二个存储仓库。
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {otherGroups.map((g) => {
                  const isSelected = selectedTargetRepo === g.name;
                  return (
                    <button
                      key={g.name}
                      type="button"
                      onClick={() => setSelectedTargetRepo(g.name)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--accent-500, #10b981)' : 'var(--c-line, #e2e8f0)',
                        background: isSelected ? 'var(--accent-50, #ecfdf5)' : 'var(--c-surface, #ffffff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? 'var(--accent-800, #065f46)' : 'var(--c-text, #1e293b)' }}>
                          {g.displayName || g.name}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--c-muted, #64748b)' }}>
                          已用 {g.totalSizeFormatted} / 配额 {g.quotaFormatted} ({g.usagePercentage.toFixed(0)}%)
                        </div>
                      </div>
                      {isSelected && <CheckIcon size={14} className="text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--c-text-2, #475569)', marginBottom: '4px', display: 'block' }}>
              放入目标根组的子文件夹 (可选)：
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FolderIcon size={14} className="text-amber-500 flex-shrink-0" />
              <input
                type="text"
                value={targetFolder}
                onChange={(e) => setTargetFolder(e.target.value)}
                placeholder="留空则存放在根目录，例如: 归档书籍 / 历史文档"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--c-line, #cbd5e1)',
                  fontSize: '11.5px',
                }}
              />
            </div>
          </div>

          {errorMsg && (
            <div style={{ padding: '8px 10px', borderRadius: '6px', background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: '11px', display: 'flex', gap: '6px' }}>
              <AlertTriangleIcon size={13} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid var(--c-line, #cbd5e1)', background: '#ffffff', fontSize: '11.5px', cursor: 'pointer' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting || otherGroups.length === 0}
              style={{
                padding: '7px 16px',
                borderRadius: '7px',
                border: 'none',
                background: 'var(--accent-600, #059669)',
                color: '#ffffff',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: isSubmitting || otherGroups.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? '正在迁移…' : '确认迁移'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
