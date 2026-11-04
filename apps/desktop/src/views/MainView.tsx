import React, { useEffect, useState, useCallback } from 'react';
import { NoteItem, NoteKind } from '../types/note';
import { Titlebar } from '../components/Titlebar';
import { PersonalMenu } from '../components/PersonalMenu';
import { MarkdownEditor } from './Editor/MarkdownEditor';
import { DocxEditor } from './Editor/DocxEditor';
import { DocViewer } from './DocViewer/DocViewer';
import { NewFolderModal } from './Modals/NewFolderModal';
import { NewNoteModal } from './Modals/NewNoteModal';
import { MoveItemModal } from './Modals/MoveItemModal';
import { NotebookTree, DraggedItem, setGlobalDraggedItem } from './NotebookTree';
import { SyncCompareModal, SyncPreview } from './Modals/SyncCompareModal';
import { BranchSwitchModal } from './Modals/BranchSwitchModal';
import { AiAssistantDrawer, CartoonAiIcon } from './AI/AiAssistantDrawer';

interface ContextMenuState {
  x: number;
  y: number;
  path: string;
  isFolder: boolean;
}

interface MoveItemState {
  path: string;
  isFolder: boolean;
}

const parentFolderOf = (path: string): string => path.split('/').slice(0, -1).join('/');

const collectNotes = (items: NoteItem[]): NoteItem[] => items.flatMap((item) => {
  if (item.isFolder) return collectNotes(item.children || []);
  return [item];
});

const collectFolders = (items: NoteItem[]): NoteItem[] => items.flatMap((item) => {
  if (!item.isFolder) return [];
  return [item, ...collectFolders(item.children || [])];
});

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

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char) => {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return entities[char] || char;
});

interface MainViewProps {
  repoName: string;
  provider: string;
  username: string;
  registerExitSync: (sync: () => Promise<void>) => () => void;
  onSwitchRepo: () => void;
  onLogout: () => void;
}

export const MainView: React.FC<MainViewProps> = ({
  repoName,
  provider,
  username,
  registerExitSync,
  onSwitchRepo,
  onLogout,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('后端开发');
  const [folderTree, setFolderTree] = useState<NoteItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [activeContent, setActiveContent] = useState<string>('');
  const [documentLoadError, setDocumentLoadError] = useState('');
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBranch, setCurrentBranch] = useState<string>('my-git-note');
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [syncStatusText, setSyncStatusText] = useState('✓ 已同步 · 刚刚');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [moveItem, setMoveItem] = useState<MoveItemState | null>(null);
  const [draggingItem, setDraggingItem] = useState<DraggedItem | null>(null);
  const [isNoteListDropTarget, setIsNoteListDropTarget] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);
  const [aiInitialTab, setAiInitialTab] = useState<'chat' | 'summary' | 'settings'>('chat');
  const noteSaveQueueRef = React.useRef<Promise<void>>(Promise.resolve());

  // Global shortcut ⌘J / Ctrl+J to toggle AI Assistant
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowAiDrawer((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load real notes and categories from Tauri backend
  const refreshNotesFromDisk = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const items: NoteItem[] = await invoke('list_notebooks_tree', { repoName });
      const flatNotes = collectNotes(items);
      const folderPaths = collectFolders(items).map((folder) => folder.path);

      setFolderTree(items);
      setNotes(flatNotes);
      setActiveCategory((current) => {
        if (current === '' || folderPaths.includes(current)) return current;
        return items.find((item) => item.isFolder)?.path || '';
      });
      setSelectedNoteId((current) => (
        flatNotes.some((note) => note.id === current) ? current : flatNotes[0]?.id || ''
      ));
    } catch (e) {
      console.error('Failed to load notes tree from disk:', e);
    } finally {
      setLoading(false);
    }
  }, [repoName]);

  useEffect(() => {
    refreshNotesFromDisk();
  }, [refreshNotesFromDisk]);

  const folderPaths = collectFolders(folderTree).map((folder) => folder.path);
  const createableFolderParents = folderPaths.filter((path) => path.split('/').length === 1);
  const visibleNotes = notes.filter((note) => (
    parentFolderOf(note.path) === activeCategory &&
    (!searchQuery || note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())))
  ));
  const selectedNote = visibleNotes.find((note) => note.id === selectedNoteId) || visibleNotes[0];
  const folderCounts = Object.fromEntries(folderPaths.map((path) => [
    path,
    notes.filter((note) => note.path.startsWith(`${path}/`)).length,
  ]));
  const rootCount = notes.filter((note) => parentFolderOf(note.path) === '').length;
  const moveDestinations = moveItem
    ? folderPaths.filter((path) => {
        const destinationDepth = path.split('/').length;
        if (moveItem.path === path || path.startsWith(`${moveItem.path}/`)) return false;
        if (!moveItem.isFolder) return destinationDepth <= 2 && parentFolderOf(moveItem.path) !== path;
        const folder = findFolder(folderTree, moveItem.path);
        return Boolean(folder && destinationDepth + 1 + maxNestedFolderDepth(folder) <= 2 && parentFolderOf(moveItem.path) !== path);
      })
    : [];

  const saveNoteToDisk = useCallback((note: NoteItem, content: string): Promise<void> => {
    const queuedSave = noteSaveQueueRef.current.catch(() => undefined).then(async () => {
      const { invoke } = await import('@tauri-apps/api/core');
      if (note.kind === 'docx') {
        await invoke('save_docx_html', { repoName, relPath: note.path, html: content });
      } else {
        await invoke('save_note_content', { repoName, relPath: note.path, content });
      }
    });
    noteSaveQueueRef.current = queuedSave;
    return queuedSave;
  }, [repoName]);

  // Read note content from real disk file when active note changes
  useEffect(() => {
    if (!selectedNote) {
      setActiveContent('');
      setDocumentLoadError('');
      setIsDocumentLoading(false);
      return;
    }

    let cancelled = false;
    setActiveContent('');
    setDocumentLoadError('');
    const isEditableDocument = ['md', 'html', 'txt', 'docx'].includes(selectedNote.kind);
    setIsDocumentLoading(isEditableDocument);
    const loadContent = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const command = selectedNote.kind === 'docx' ? 'read_docx_html' : 'read_note_content';
        const content: string = await invoke(command, {
          repoName,
          relPath: selectedNote.path,
        });
        if (!cancelled) setActiveContent(content || '');
      } catch (error) {
        if (!cancelled) {
          setDocumentLoadError(error instanceof Error ? error.message : String(error));
        }
      } finally {
        if (!cancelled) setIsDocumentLoading(false);
      }
    };
    if (isEditableDocument) void loadContent();
    return () => { cancelled = true; };
  }, [selectedNote, repoName]);

  const saveCurrentDocument = useCallback(async () => {
    if (loading || isDocumentLoading) {
      throw new Error('笔记仍在加载，请稍后重试同步。');
    }
    if (documentLoadError) throw new Error(`文档读取失败，已停止同步以保护原文件：${documentLoadError}`);
    if (selectedNote && ['md', 'html', 'txt', 'docx'].includes(selectedNote.kind)) {
      await saveNoteToDisk(selectedNote, activeContent);
    }
  }, [activeContent, documentLoadError, isDocumentLoading, loading, saveNoteToDisk, selectedNote]);

  // Fetch initial branch on mount
  useEffect(() => {
    let isMounted = true;
    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('get_repo_sync_status', { repoName })
        .then((status: any) => {
          if (isMounted && status?.branch) {
            setCurrentBranch(status.branch);
          }
        })
        .catch(() => {});
    });
    return () => {
      isMounted = false;
    };
  }, [repoName]);

  const syncRepository = useCallback(async () => {
    await saveCurrentDocument();
    const { invoke } = await import('@tauri-apps/api/core');
    const status: any = await invoke('perform_git_sync', {
      repoName,
      provider,
      username,
      targetBranch: currentBranch,
    });
    const timeStr = status.lastSyncTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const branchName = status.branch || currentBranch || 'my-git-note';
    setCurrentBranch(branchName);
    if (!status.hasOrigin) {
      setSyncStatusText(`⚠ 本地已提交 [${branchName}] (未关联远程) · ${timeStr}`);
    } else {
      setSyncStatusText(`✓ 已同步 [${branchName}] · ${timeStr}`);
    }
    await refreshNotesFromDisk();
  }, [currentBranch, provider, refreshNotesFromDisk, repoName, saveCurrentDocument, username]);

  useEffect(() => registerExitSync(syncRepository), [registerExitSync, syncRepository]);

  // Refresh preview after remote is bound or token saved
  const refreshSyncPreview = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const preview: SyncPreview = await invoke('preview_git_sync', {
        repoName,
        provider,
        username,
        targetBranch: currentBranch,
      });
      setSyncPreview(preview);
    } catch (err) {
      console.error('Failed to refresh sync preview:', err);
    }
  }, [currentBranch, provider, repoName, username]);

  // Direct sync to Git on clicking "同步" button; opens preview modal if errors/conflicts occur
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('⟳ 正在同步到 Git…');

    try {
      await syncRepository();
      setSyncPreview(null);
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      setSyncStatusText(`⚠ 同步失败 · ${errStr}`);
      // Open compare modal with preview so user can resolve conflict or bind remote/token
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const preview: SyncPreview = await invoke('preview_git_sync', { repoName, provider, username });
        setSyncPreview(preview);
      } catch (_) {
        // If preview also fails, error message is already visible in badge
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Open compare modal manually by clicking the status badge
  const handleOpenPreview = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('⟳ 正在比较文件…');
    try {
      await saveCurrentDocument();
      const { invoke } = await import('@tauri-apps/api/core');
      const preview: SyncPreview = await invoke('preview_git_sync', { repoName, provider, username });
      setSyncPreview(preview);
      const originNotice = preview.hasOrigin ? '' : ' · ⚠️ 尚未关联远程';
      setSyncStatusText(`✓ 比较完成 · 本地 ${preview.localChanges.length} 项 / 远程 ${preview.remoteChanges.length} 项${originNotice}`);
    } catch (error) {
      setSyncStatusText(`⚠ 比较失败 · ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('⟳ 同步中…');
    try {
      await syncRepository();
      setSyncPreview(null);
    } catch (error) {
      setSyncStatusText(`⚠ 同步失败 · ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  };

  const selectFolder = (path: string) => {
    setActiveCategory(path);
    setSearchQuery('');
    const firstNote = notes.find((note) => parentFolderOf(note.path) === path);
    setSelectedNoteId(firstNote?.id || '');
  };

  const toggleFolder = (path: string) => {
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const showFolderContextMenu = (event: React.MouseEvent, path: string, isFolder: boolean) => {
    event.preventDefault();
    setContextMenu({
      x: Math.min(event.clientX, window.innerWidth - 210),
      y: Math.min(event.clientY, window.innerHeight - 150),
      path,
      isFolder,
    });
  };

  const openNewFolder = (parent = '') => {
    setNewFolderParent(parent);
    setShowNewFolder(true);
    setContextMenu(null);
  };

  const openNewNote = (folder = activeCategory) => {
    setActiveCategory(folder);
    setShowNewNote(true);
    setContextMenu(null);
    setShowNewMenu(false);
  };

  useEffect(() => {
    if (!contextMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [contextMenu]);

  // Create new folder in real repository
  const handleCreateFolder = async (parent: string, name: string) => {
    const fullPath = parent ? `${parent}/${name}` : name;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('create_new_folder', {
        repoName,
        parentFolder: parent || null,
        folderName: name,
      });
      setActiveCategory(fullPath);
      setExpandedFolders((current) => {
        const next = new Set(current);
        if (parent) next.add(parent);
        return next;
      });
      await refreshNotesFromDisk();
      setShowNewFolder(false);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  };

  const handleCreateFolderQuick = async (parent: string, name: string): Promise<string> => {
    const fullPath = parent ? `${parent}/${name}` : name;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('create_new_folder', {
        repoName,
        parentFolder: parent || null,
        folderName: name,
      });
      setActiveCategory(fullPath);
      setExpandedFolders((current) => {
        const next = new Set(current);
        if (parent) next.add(parent);
        return next;
      });
      await refreshNotesFromDisk();
      return fullPath;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  };

  // Create new note in real repository
  const handleCreateNote = async (folder: string, title: string, kind: NoteKind, body: string) => {
    if (!['md', 'html', 'txt', 'docx'].includes(kind)) {
      throw new Error('当前不能创建这种文件格式。');
    }
    const ext = kind === 'md' ? '.md' : kind === 'html' ? '.html' : kind === 'txt' ? '.txt' : '.docx';
    const relPath = folder ? `${folder}/${title}${ext}` : `${title}${ext}`;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      if (notes.some((note) => note.path === relPath)) {
        throw new Error('同名文件已存在，请换一个标题。');
      }
      const initialDocHtml = body || `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${escapeHtml(title)}</h1><p>在此开始记录你的思考，支持类似 Word 的排版与直接粘贴外部富文本原格式...</p></body></html>`;
      if (kind === 'docx') {
        await invoke('save_docx_html', { repoName, relPath, html: initialDocHtml });
      } else {
        await invoke('save_note_content', { repoName, relPath, content: kind === 'html' ? initialDocHtml : body });
      }
      setActiveCategory(folder);
      await refreshNotesFromDisk();
      setSelectedNoteId(relPath);
      setActiveContent(kind === 'docx' || kind === 'html' ? initialDocHtml : body);
      setShowNewNote(false);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  };

  // Save note content to real disk
  const handleSaveNote = async (updatedContent: string) => {
    setActiveContent(updatedContent);
    if (!selectedNote) return;

    try {
      await saveNoteToDisk(selectedNote, updatedContent);
    } catch (error) {
      setSyncStatusText(`⚠ 保存失败 · ${error instanceof Error ? error.message : String(error)}`);
      if (selectedNote.kind === 'docx') throw error;
    }
  };

  const moveItemToFolder = async (sourcePath: string, isFolder: boolean, destinationFolder: string) => {
    const currentParent = parentFolderOf(sourcePath);
    if (currentParent === destinationFolder) {
      const itemName = sourcePath.split('/').pop() || sourcePath;
      setSyncStatusText(`ℹ️ 「${itemName}」已在「${destinationFolder ? destinationFolder.split('/').join(' / ') : '根目录'}」中`);
      return;
    }

    const selectedPath = selectedNote?.path;
    if (selectedNote && (selectedPath === sourcePath || selectedPath?.startsWith(`${sourcePath}/`))) {
      await handleSaveNote(activeContent);
    }
    const { invoke } = await import('@tauri-apps/api/core');
    const newPath: string = await invoke('move_notebook_item', {
      repoName,
      sourcePath,
      destinationFolder,
    });

    const newFolderPath = isFolder ? newPath : destinationFolder;
    const movedFolderParent = parentFolderOf(newFolderPath);
    setExpandedFolders((current) => {
      const next = new Set(current);
      if (destinationFolder) next.add(destinationFolder);
      if (movedFolderParent) next.add(movedFolderParent);
      return next;
    });

    setActiveCategory(newFolderPath);
    setSelectedNoteId(newPath);

    await refreshNotesFromDisk();
    const itemName = sourcePath.split('/').pop() || sourcePath;
    setSyncStatusText(`✓ 已成功将「${itemName}」移入「${destinationFolder ? destinationFolder.split('/').join(' / ') : '根目录'}」`);
  };

  const handleMoveItem = async (destinationFolder: string) => {
    if (!moveItem) return;
    await moveItemToFolder(moveItem.path, moveItem.isFolder, destinationFolder);
    setMoveItem(null);
  };

  const handleDropOnFolder = async (sourcePath: string, isFolder: boolean, targetFolder: string) => {
    try {
      await moveItemToFolder(sourcePath, isFolder, targetFolder);
    } catch (error) {
      setSyncStatusText(`⚠ 移动失败 · ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleImportFiles = async (files: FileList | File[], destinationFolder: string) => {
    let importedCount = 0;
    const { invoke } = await import('@tauri-apps/api/core');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name;
      const ext = name.split('.').pop()?.toLowerCase();
      if (!ext || !['md', 'txt', 'html', 'docx'].includes(ext)) {
        continue;
      }

      const relPath = destinationFolder ? `${destinationFolder}/${name}` : name;
      try {
        const arrayBuf = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(arrayBuf));
        await invoke('import_file_bytes', {
          repoName,
          relPath,
          bytes,
        });
        importedCount++;
      } catch (err) {
        console.error('Failed to import file:', err);
      }
    }

    if (importedCount > 0) {
      await refreshNotesFromDisk();
      setActiveCategory(destinationFolder);
      setSyncStatusText(`✓ 已导入 ${importedCount} 个文件到「${destinationFolder ? destinationFolder.split('/').join(' / ') : '根目录'}」`);
    }
  };

  // Open note in external app
  const handleOpenExternal = async () => {
    if (!selectedNote) return;
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_note_in_external', {
        repoName,
        relPath: selectedNote.path,
      });
    } catch (e) {
      console.error('Failed to open external app:', e);
    }
  };

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        background: 'var(--c-surface, #fffdf7)',
        color: 'var(--c-text, #1f2433)',
      }}
    >
      {/* Top Titlebar */}
      <Titlebar title={`mg-node — ${selectedNote?.title || '我的笔记'}`}>
        {/* Sync Status Badge */}
        <button
          type="button"
          onClick={() => void handleOpenPreview()}
          disabled={isSyncing}
          className="text-[11px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity border-none bg-transparent"
          style={{ background: 'var(--c-surface-3, #f0f1f6)', color: 'var(--c-text-2, #555b6e)' }}
          title="点击查看本地与远程文件差异与同步详情"
          aria-label="查看同步详情"
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isSyncing ? '#f59e0b' : 'var(--accent-500, #10b981)' }}
          />
          {syncStatusText}
        </button>

        {/* Branch Quick Switch Pill */}
        <button
          type="button"
          onClick={() => setShowBranchModal(true)}
          className="text-[11px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
          title="点击查看或切换 Git 分支"
          aria-label="切换 Git 分支"
        >
          <span>🌿</span>
          <span className="max-w-[120px] truncate font-medium">{currentBranch}</span>
        </button>

        {/* ＋ 新建 Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNewMenu((prev) => !prev)}
            className="btn btn--primary btn--sm"
            style={{
              background: 'var(--accent-600, #059669)',
              borderColor: 'var(--accent-600, #059669)',
              color: '#ffffff',
              fontWeight: 500,
            }}
          >
            <span>＋ 新建</span>
            <span style={{ fontSize: '10px' }}>▾</span>
          </button>

          {showNewMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
              <div
                className="absolute right-0 top-8 w-44 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-1 z-50 text-xs"
                style={{ background: 'var(--c-surface, #ffffff)' }}
              >
                <button
                  onClick={() => openNewNote(activeCategory)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>📄</span> 新建文件
                  </span>
                  <kbd className="text-[10px] text-slate-400 font-mono">⌘N</kbd>
                </button>
                <button
                  onClick={() => openNewFolder(activeCategory.split('/').length === 1 ? activeCategory : '')}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>📁</span> 新建文件夹
                  </span>
                  <kbd className="text-[10px] text-slate-400 font-mono">⌘⇧N</kbd>
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Assistant Cartoon Quick Button */}
        <button
          type="button"
          onClick={() => {
            setAiInitialTab('chat');
            setShowAiDrawer((prev) => !prev);
          }}
          className={`wb-ai-btn ${showAiDrawer ? 'is-active' : ''}`}
          title="AI 知识库助手 (⌘J) · 智能问答与总结"
          aria-label="打开 AI 知识库助手"
        >
          <span className="cartoon-icon" aria-hidden="true">
            <CartoonAiIcon size={17} />
          </span>
          <span className="wb-ai-label">AI 助手</span>
          <span className="wb-ai-sparkle">✨</span>
        </button>

        {/* Manual Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="sync-button"
          title="保存并提交、推送同步到远程 Git 仓库 (冲突或异常时将弹出比较窗口)"
          aria-label="立即同步到 Git"
        >
          <span className={isSyncing ? 'animate-spin inline-block' : ''}>⟳</span>
          <span>{isSyncing ? '同步中…' : '同步'}</span>
        </button>
      </Titlebar>

      {/* 3-Column Main Layout */}
      <div className="workbench-layout">
        {/* Column 1: Sidebar */}
        <aside className="wb-sidebar">
          <div className="wb-section-title">
            <span>笔记本分类</span>
            <button
              onClick={() => openNewFolder(activeCategory.split('/').length === 1 ? activeCategory : '')}
              className="hover:text-slate-700 text-sm cursor-pointer p-0.5 rounded"
              title="新建文件夹 (⌘⇧N)"
            >
              +
            </button>
          </div>

          {/* Folder Tree */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <NotebookTree
              folders={folderTree.filter((item) => item.isFolder)}
              activePath={activeCategory}
              expandedPaths={expandedFolders}
              rootCount={rootCount}
              folderCounts={folderCounts}
              onSelect={selectFolder}
              onToggle={toggleFolder}
              onContextMenu={showFolderContextMenu}
              draggingItem={draggingItem}
              onDragStartItem={setDraggingItem}
              onDragEndItem={() => setDraggingItem(null)}
              onDropOnFolder={handleDropOnFolder}
              onImportExternalFiles={handleImportFiles}
            />
            {folderTree.filter((item) => item.isFolder).length === 0 && (
              <div style={{ padding: '12px 14px' }}>
                <button
                  type="button"
                  onClick={() => openNewFolder('')}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px dashed var(--accent-300, #a7f3d0)',
                    background: 'var(--accent-50, #ecfdf5)',
                    color: 'var(--accent-700, #047857)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  📁 提示：创建第一个笔记文件夹
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Bottom Profile Card */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--c-line, #eceef3)', marginTop: '8px' }}>
            <PersonalMenu
              repoName={repoName}
              username={username}
              currentBranch={currentBranch}
              onSwitchRepo={onSwitchRepo}
              onOpenBranchModal={() => setShowBranchModal(true)}
              onLogout={onLogout}
              onOpenAiSettings={() => {
                setAiInitialTab('settings');
                setShowAiDrawer(true);
              }}
            />
          </div>
        </aside>

        {/* Column 2: Note List */}
        <section className="wb-notelist">
          {/* Search bar */}
          <div className="wb-search-box">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题或标签 (⌘⇧P)..."
              className="wb-search-input"
            />
          </div>

          {/* Notes Cards */}
          <div
            className={`wb-notes-scroll ${isNoteListDropTarget ? 'is-drop-target' : ''}`}
            onDragOver={(event) => {
              if (event.dataTransfer.types.includes('Files')) {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setIsNoteListDropTarget(true);
              }
            }}
            onDragLeave={() => setIsNoteListDropTarget(false)}
            onDrop={async (event) => {
              setIsNoteListDropTarget(false);
              if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
                event.preventDefault();
                await handleImportFiles(event.dataTransfer.files, activeCategory);
              }
            }}
          >
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: '12px', color: 'var(--c-muted)' }}>
                正在加载仓库笔记…
              </div>
            ) : visibleNotes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 14px', fontSize: '12px', color: 'var(--c-muted)' }}>
                <div style={{ fontSize: '26px', marginBottom: '8px' }}>📂</div>
                <div style={{ fontWeight: 600, color: 'var(--c-text, #1e293b)', marginBottom: '4px' }}>
                  「{activeCategory ? activeCategory.split('/').join(' / ') : '根目录'}」暂无笔记
                </div>
                <p style={{ fontSize: '11px', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                  你可以直接在此分类下新建笔记，或创建子文件夹管理内容。<br />
                  也支持将外部文件直接拖拽到此导入。
                </p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => openNewNote(activeCategory)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer shadow-xs"
                  >
                    ＋ 在此新建笔记
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewFolder(activeCategory.split('/').length === 1 ? activeCategory : '')}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    📁 新建子文件夹
                  </button>
                </div>
              </div>
            ) : (
              visibleNotes.map((n) => {
                  const isSelected = n.id === selectedNoteId;
                  const isDraggingThis = draggingItem?.type === 'note' && draggingItem?.path === n.path;
                  return (
                    <div
                      key={n.id}
                      draggable
                      onDragStart={(event) => {
                        const payload: DraggedItem = { type: 'note', path: n.path, name: n.title };
                        setGlobalDraggedItem(payload);
                        setDraggingItem(payload);
                        event.dataTransfer.setData('text/plain', JSON.stringify(payload));
                        try {
                          event.dataTransfer.setData('application/mg-node-item', JSON.stringify(payload));
                        } catch (_) {}
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setGlobalDraggedItem(null);
                        setDraggingItem(null);
                      }}
                      onClick={() => setSelectedNoteId(n.id)}
                      onContextMenu={(event) => showFolderContextMenu(event, n.path, false)}
                      className={`wb-note-card ${isSelected ? 'is-active' : ''} ${isDraggingThis ? 'is-drag-source' : ''}`}
                      title={`${n.title} (按住可拖拽移动至左侧任意文件夹)`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div className="wb-note-title">{n.title}</div>
                        {n.public && (
                          <span className="badge badge--public" style={{ margin: 0, flexShrink: 0 }}>
                            公开
                          </span>
                        )}
                      </div>

                      <div className="wb-note-meta">
                        <span className="wb-kind-tag">{n.kind}</span>
                        <span>{n.updatedAt}</span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </section>

        {/* Column 3: Main Editor or Document Viewer */}
        <main className="wb-main-canvas">
          {selectedNote ? (
            ['docx', 'html'].includes(selectedNote.kind) ? (
              <DocxEditor
                key={selectedNote.id}
                initialHtml={activeContent}
                title={selectedNote.title}
                kind={selectedNote.kind}
                loadError={documentLoadError}
                onSave={handleSaveNote}
                onContentChange={setActiveContent}
              />
            ) : ['md', 'txt'].includes(selectedNote.kind) ? (
              <MarkdownEditor
                key={selectedNote.id}
                initialContent={activeContent}
                title={selectedNote.title}
                onSave={handleSaveNote}
                onContentChange={setActiveContent}
              />
            ) : (
              <DocViewer
                key={selectedNote.id}
                title={selectedNote.title}
                kind={selectedNote.kind}
                onOpenExternal={handleOpenExternal}
              />
            )
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-muted)', fontSize: '13px' }}>
              请在左侧选择或新建一篇笔记
            </div>
          )}
        </main>

        {/* Column 4: AI Assistant Drawer */}
        {showAiDrawer && (
          <AiAssistantDrawer
            notes={notes}
            activeCategory={activeCategory}
            selectedNote={selectedNote || null}
            activeContent={activeContent}
            initialTab={aiInitialTab}
            onClose={() => setShowAiDrawer(false)}
            onSelectNote={(notePath) => {
              const note = notes.find((n) => n.path === notePath);
              if (note) {
                setActiveCategory(parentFolderOf(note.path));
                setSelectedNoteId(note.id);
              }
            }}
            onCreateNote={async (title, content) => {
              await handleCreateNote(activeCategory, title, 'md', content);
            }}
          />
        )}
      </div>

      {/* Modals */}
      {showNewFolder && (
        <NewFolderModal
          key={newFolderParent}
          categories={createableFolderParents}
          initialParent={newFolderParent}
          onConfirm={handleCreateFolder}
          onClose={() => setShowNewFolder(false)}
        />
      )}

      {showNewNote && (
        <NewNoteModal
          categories={folderPaths}
          defaultCategory={activeCategory}
          onConfirm={handleCreateNote}
          onClose={() => setShowNewNote(false)}
          onCreateFolder={handleCreateFolderQuick}
        />
      )}

      {contextMenu && (
        <>
          <div className="wb-context-backdrop" onClick={() => setContextMenu(null)} />
          <div
            role="menu"
            className="wb-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(event) => event.preventDefault()}
          >
            {contextMenu.isFolder || contextMenu.path === '' ? (
              <>
                <button role="menuitem" onClick={() => openNewNote(contextMenu.path)}>
                  <span>📄</span> 新建文件
                </button>
                {contextMenu.path === '' ? (
                  <button role="menuitem" onClick={() => openNewFolder('')}>
                    <span>📁</span> 新建一级文件夹
                  </button>
                ) : contextMenu.path.split('/').length === 1 ? (
                  <button role="menuitem" onClick={() => openNewFolder(contextMenu.path)}>
                    <span>📁</span> 新建二级文件夹
                  </button>
                ) : (
                  <button role="menuitem" disabled>
                    <span>📁</span> 最多两级文件夹
                  </button>
                )}
                {contextMenu.path && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMoveItem({ path: contextMenu.path, isFolder: true });
                      setContextMenu(null);
                    }}
                  >
                    <span>↪</span> 移动文件夹…
                  </button>
                )}
              </>
            ) : (
              <button
                role="menuitem"
                onClick={() => {
                  setMoveItem({ path: contextMenu.path, isFolder: false });
                  setContextMenu(null);
                }}
              >
                <span>↪</span> 移动文件…
              </button>
            )}
          </div>
        </>
      )}

      {moveItem && (
        <MoveItemModal
          itemPath={moveItem.path}
          currentParent={parentFolderOf(moveItem.path)}
          destinations={moveDestinations}
          onConfirm={handleMoveItem}
          onClose={() => setMoveItem(null)}
        />
      )}

      {syncPreview && (
        <SyncCompareModal
          preview={syncPreview}
          repoName={repoName}
          provider={provider}
          username={username}
          isSyncing={isSyncing}
          onSync={handleConfirmSync}
          onClose={() => setSyncPreview(null)}
          onRefreshPreview={refreshSyncPreview}
        />
      )}

      {showBranchModal && (
        <BranchSwitchModal
          repoName={repoName}
          currentBranch={currentBranch}
          isOpen={showBranchModal}
          onClose={() => setShowBranchModal(false)}
          onBranchSwitched={async (newBranch) => {
            setCurrentBranch(newBranch);
            setSyncStatusText(`✓ 已切换至分支 [${newBranch}]`);
            await refreshNotesFromDisk();
          }}
        />
      )}

    </div>
  );
};
