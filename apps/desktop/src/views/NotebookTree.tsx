import React, { useState } from 'react';
import { NoteItem } from '../types/note';
import {
  FolderIcon,
  FolderOpenIcon,
  RootFolderIcon,
  ChevronRightIcon,
  InfoCircleIcon,
  FileImportIcon,
  BanIcon,
} from '../components/Icons';

export interface DraggedItem {
  type: 'note' | 'folder';
  path: string;
  name?: string;
}

let globalDraggedItem: DraggedItem | null = null;

export const setGlobalDraggedItem = (item: DraggedItem | null) => {
  globalDraggedItem = item;
};

export const getGlobalDraggedItem = (): DraggedItem | null => {
  return globalDraggedItem;
};

interface NotebookTreeProps {
  folders: NoteItem[];
  activePath: string;
  expandedPaths: Set<string>;
  rootCount: number;
  folderCounts: Record<string, number>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onContextMenu: (event: React.MouseEvent, path: string, isFolder: boolean) => void;
  draggingItem?: DraggedItem | null;
  onDragStartItem?: (item: DraggedItem) => void;
  onDragEndItem?: () => void;
  onDropOnFolder?: (sourcePath: string, isFolder: boolean, targetFolder: string) => Promise<void>;
  onImportExternalFiles?: (files: FileList | File[], targetFolder: string) => Promise<void>;
}

const findFolder = (items: NoteItem[], path: string): NoteItem | undefined => {
  for (const item of items) {
    if (item.isFolder && item.path === path) return item;
    const nested = findFolder(item.children || [], path);
    if (nested) return nested;
  }
  return undefined;
};

const maxNestedFolderDepth = (folder: NoteItem): number => {
  const children = (folder.children || []).filter((item) => item.isFolder);
  return children.length ? Math.max(...children.map((child) => 1 + maxNestedFolderDepth(child))) : 0;
};

export const NotebookTree: React.FC<NotebookTreeProps> = ({
  folders,
  activePath,
  expandedPaths,
  rootCount,
  folderCounts,
  onSelect,
  onToggle,
  onContextMenu,
  draggingItem,
  onDragStartItem,
  onDragEndItem,
  onDropOnFolder,
  onImportExternalFiles,
}) => {
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [dropValid, setDropValid] = useState<boolean>(true);

  const checkCanDrop = (targetFolder: string): boolean => {
    const activeItem = globalDraggedItem || draggingItem;
    if (!activeItem) return true; // external file drop is allowed
    if (activeItem.type === 'note') {
      const parent = activeItem.path.split('/').slice(0, -1).join('/');
      return parent !== targetFolder;
    }

    // Dragging folder
    if (activeItem.path === targetFolder) return false;
    if (targetFolder.startsWith(`${activeItem.path}/`)) return false;
    const parent = activeItem.path.split('/').slice(0, -1).join('/');
    if (parent === targetFolder) return false;
    const targetDepth = targetFolder === '' ? 0 : targetFolder.split('/').length;
    const folder = findFolder(folders, activeItem.path);
    const childDepth = folder ? maxNestedFolderDepth(folder) : 0;
    return targetDepth + 1 + childDepth <= 10;
  };

  const handleDragEnter = (event: React.DragEvent, targetFolder: string) => {
    event.preventDefault();
    event.stopPropagation();
    const can = checkCanDrop(targetFolder);
    setDropTarget(targetFolder);
    setDropValid(can);
    event.dataTransfer.dropEffect = can ? 'move' : 'none';
  };

  const handleDragOver = (event: React.DragEvent, targetFolder: string) => {
    event.preventDefault();
    event.stopPropagation();
    const can = checkCanDrop(targetFolder);
    if (dropTarget !== targetFolder || dropValid !== can) {
      setDropTarget(targetFolder);
      setDropValid(can);
    }
    event.dataTransfer.dropEffect = can ? 'move' : 'none';
  };

  const handleDragLeave = (event: React.DragEvent, targetFolder: string) => {
    event.preventDefault();
    event.stopPropagation();
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as Node | null;
    if (currentTarget && relatedTarget && currentTarget.contains(relatedTarget)) {
      return;
    }
    if (dropTarget === targetFolder) {
      setDropTarget(null);
    }
  };

  const handleDrop = async (event: React.DragEvent, targetFolder: string) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);

    // 1. Resolve internal dragged item (prefer global memory cache, then prop, then dataTransfer)
    let item = globalDraggedItem || draggingItem;
    if (!item) {
      const dataStr =
        event.dataTransfer.getData('application/mg-node-item') ||
        event.dataTransfer.getData('text/plain');
      if (dataStr) {
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed && parsed.path) {
            item = parsed;
          }
        } catch (_) {}
      }
    }

    if (item && onDropOnFolder) {
      setGlobalDraggedItem(null);
      if (checkCanDrop(targetFolder)) {
        await onDropOnFolder(item.path, item.type === 'folder', targetFolder);
      }
      return;
    }

    // 2. Check external files dragged from macOS Finder
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0 && onImportExternalFiles) {
      await onImportExternalFiles(event.dataTransfer.files, targetFolder);
    }
  };

  const renderFolder = (folder: NoteItem, depth: number): React.ReactNode => {
    const children = (folder.children || []).filter((item) => item.isFolder);
    const expanded = expandedPaths.has(folder.path);
    const active = activePath === folder.path;
    const isTarget = dropTarget === folder.path;
    const isSource = draggingItem?.type === 'folder' && draggingItem?.path === folder.path;
    const isCurrentFolder =
      draggingItem?.type === 'note' &&
      draggingItem.path.split('/').slice(0, -1).join('/') === folder.path;

    return (
      <React.Fragment key={folder.path}>
        <div
          className={`wb-folder-item ${active ? 'is-active' : ''} ${isSource ? 'is-drag-source' : ''} ${
            isTarget ? (dropValid ? 'is-drop-target' : isCurrentFolder ? 'is-drop-current' : 'is-drop-invalid') : ''
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
          onClick={() => onSelect(folder.path)}
          onContextMenu={(event) => onContextMenu(event, folder.path, true)}
          role="treeitem"
          aria-expanded={children.length ? expanded : undefined}
          aria-selected={active}
          tabIndex={0}
          draggable
          onDragStart={(event) => {
            const dragPayload: DraggedItem = { type: 'folder', path: folder.path, name: folder.name };
            setGlobalDraggedItem(dragPayload);
            event.dataTransfer.setData('text/plain', JSON.stringify(dragPayload));
            try {
              event.dataTransfer.setData('application/mg-node-item', JSON.stringify(dragPayload));
            } catch (_) {}
            event.dataTransfer.effectAllowed = 'move';
            onDragStartItem?.(dragPayload);
          }}
          onDragEnd={() => {
            setGlobalDraggedItem(null);
            setDropTarget(null);
            onDragEndItem?.();
          }}
          onDragEnter={(event) => handleDragEnter(event, folder.path)}
          onDragOver={(event) => handleDragOver(event, folder.path)}
          onDragLeave={(event) => handleDragLeave(event, folder.path)}
          onDrop={(event) => void handleDrop(event, folder.path)}
          title={`文件夹：${folder.name} (可拖拽移动或将文件拖入此目录)`}
        >
          <div className="wb-folder-item__label">
            {children.length > 0 ? (
              <button
                type="button"
                className="wb-folder-toggle"
                aria-label={expanded ? '折叠文件夹' : '展开文件夹'}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggle(folder.path);
                }}
              >
                <ChevronRightIcon
                  size={11}
                  className={`transition-transform duration-150 ${expanded ? 'rotate-90 text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}
                />
              </button>
            ) : (
              <span className="wb-folder-toggle wb-folder-toggle--empty" />
            )}
            <span aria-hidden="true" className="flex items-center">
              {children.length && expanded ? (
                <FolderOpenIcon size={16} />
              ) : (
                <FolderIcon size={16} />
              )}
            </span>
            <span className="wb-folder-item__name">{folder.name}</span>
            {isTarget && (
              <span className="wb-drop-badge flex items-center gap-1">
                {isCurrentFolder ? (
                  <>
                    <InfoCircleIcon size={11} /> 当前目录
                  </>
                ) : dropValid ? (
                  <>
                    <FileImportIcon size={11} /> 移入此文件夹
                  </>
                ) : (
                  <>
                    <BanIcon size={11} /> 不可移入
                  </>
                )}
              </span>
            )}
          </div>
          <span className="wb-folder-badge">{folderCounts[folder.path] || 0}</span>
        </div>
        {expanded && children.map((child) => renderFolder(child, depth + 1))}
      </React.Fragment>
    );
  };

  const isRootTarget = dropTarget === '';
  const isRootValid = checkCanDrop('');
  const isRootCurrentFolder =
    draggingItem?.type === 'note' &&
    draggingItem.path.split('/').slice(0, -1).join('/') === '';

  return (
    <div
      role="tree"
      aria-label="笔记文件夹"
      className={`wb-folder-tree ${draggingItem ? 'is-dragging-active' : ''}`}
    >
      {/* Root folder entry */}
      <div
        className={`wb-folder-item ${activePath === '' ? 'is-active' : ''} ${
          isRootTarget
            ? isRootValid
              ? 'is-drop-target'
              : isRootCurrentFolder
              ? 'is-drop-current'
              : 'is-drop-invalid'
            : ''
        }`}
        onClick={() => onSelect('')}
        onContextMenu={(event) => onContextMenu(event, '', false)}
        role="treeitem"
        aria-selected={activePath === ''}
        tabIndex={0}
        onDragEnter={(event) => handleDragEnter(event, '')}
        onDragOver={(event) => handleDragOver(event, '')}
        onDragLeave={(event) => handleDragLeave(event, '')}
        onDrop={(event) => void handleDrop(event, '')}
        title="根目录 (可将文件或顶级文件夹拖放至此)"
      >
        <div className="wb-folder-item__label">
          <span className="wb-folder-toggle wb-folder-toggle--empty" />
          <span aria-hidden="true" className="flex items-center">
            <RootFolderIcon size={16} />
          </span>
          <span className="wb-folder-item__name">根目录</span>
          {isRootTarget && (
            <span className="wb-drop-badge flex items-center gap-1">
              {isRootCurrentFolder ? (
                <>
                  <InfoCircleIcon size={11} /> 当前根目录
                </>
              ) : isRootValid ? (
                <>
                  <FileImportIcon size={11} /> 移入根目录
                </>
              ) : (
                <>
                  <BanIcon size={11} /> 不可移入
                </>
              )}
            </span>
          )}
        </div>
        <span className="wb-folder-badge">{rootCount}</span>
      </div>

      {/* Categorized folders */}
      {folders
        .filter((folder) => folder.isFolder)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        .map((folder) => renderFolder(folder, 0))}
    </div>
  );
};
