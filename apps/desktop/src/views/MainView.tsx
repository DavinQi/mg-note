import React, { useEffect, useState, useCallback } from 'react';
import { NoteItem, NoteKind, DataRootGroupInfo, RepoStorageUsage } from '../types/note';
import { Titlebar } from '../components/Titlebar';
import { PersonalMenu } from '../components/PersonalMenu';
import { MarkdownEditor } from './Editor/MarkdownEditor';
import { DocxEditor } from './Editor/DocxEditor';
import { docxBytesToHtml, htmlToDocxBytes } from '../utils/docxUtils';
import { DocViewer } from './DocViewer/DocViewer';
import { PdfViewer } from './DocViewer/PdfViewer';
import { NewFolderModal } from './Modals/NewFolderModal';
import { NewNoteModal } from './Modals/NewNoteModal';
import { MoveItemModal } from './Modals/MoveItemModal';
import { CreateRootGroupModal } from './Modals/CreateRootGroupModal';
import { MoveToRootGroupModal } from './Modals/MoveToRootGroupModal';
import { NotebookTree, DraggedItem, setGlobalDraggedItem } from './NotebookTree';
import { SyncCompareModal, SyncPreview } from './Modals/SyncCompareModal';
import { BranchSwitchModal } from './Modals/BranchSwitchModal';
import { AiAssistantDrawer, CartoonAiIcon } from './AI/AiAssistantDrawer';
import {
  PlusIcon,
  SyncIcon,
  ChevronDownIcon,
  GitBranchIcon,
  SparklesIcon,
  NoteFormatIcon,
  FolderIcon,
  FolderPlusIcon,
  FileImportIcon,
  FolderImportIcon,
  EmptyFolderIllustration,
  SearchIcon,
  ExternalLinkIcon,
  CheckIcon,
  AlertTriangleIcon,
  RootFolderIcon,
} from '../components/Icons';

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
  onSwitchRepo: (newRepoName?: string) => void;
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
  const [syncStatusText, setSyncStatusText] = useState('已同步 · 刚刚');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [loading, setLoading] = useState(true);

  // Multi-Vault / Data Root Groups state
  const [rootGroups, setRootGroups] = useState<DataRootGroupInfo[]>([]);
  const [currentUsage, setCurrentUsage] = useState<RepoStorageUsage | null>(null);
  const [showRootGroupMenu, setShowRootGroupMenu] = useState(false);
  const [showCreateRootGroup, setShowCreateRootGroup] = useState(false);
  const [moveToRootGroupItem, setMoveToRootGroupItem] = useState<{ path: string; isFolder: boolean } | null>(null);

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

  // Refresh root groups list and capacity usage
  const refreshRootGroupsAndUsage = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const [groups, usage] = await Promise.all([
        invoke<DataRootGroupInfo[]>('list_data_root_groups', { currentRepo: repoName }),
        invoke<RepoStorageUsage>('get_repo_storage_usage', { repoName }),
      ]);
      setRootGroups(groups);
      setCurrentUsage(usage);
    } catch (err) {
      console.warn('Failed to load root groups or storage usage:', err);
    }
  }, [repoName]);

  useEffect(() => {
    void refreshRootGroupsAndUsage();
  }, [refreshRootGroupsAndUsage]);

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
        const bytes = await htmlToDocxBytes(content);
        await invoke('save_file_bytes', { repoName, relPath: note.path, bytes });
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
        if (selectedNote.kind === 'docx') {
          try {
            const bytes: number[] = await invoke('read_file_bytes', {
              repoName,
              relPath: selectedNote.path,
            });
            const html = await docxBytesToHtml(bytes);
            if (!cancelled) setActiveContent(html || '<p><br></p>');
          } catch (docxErr) {
            // Fallback for legacy textutil docx or empty docx
            try {
              const fallbackHtml: string = await invoke('read_docx_html', {
                repoName,
                relPath: selectedNote.path,
              });
              if (!cancelled) setActiveContent(fallbackHtml || '<p><br></p>');
            } catch {
              throw docxErr;
            }
          }
        } else {
          const content: string = await invoke('read_note_content', {
            repoName,
            relPath: selectedNote.path,
          });
          if (!cancelled) setActiveContent(content || (selectedNote.kind === 'html' ? '<p><br></p>' : ''));
        }
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
      setSyncStatusText(`本地已提交 [${branchName}] (未关联远程) · ${timeStr}`);
    } else {
      setSyncStatusText(`已同步 [${branchName}] · ${timeStr}`);
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
    setSyncStatusText('正在同步到 Git…');

    try {
      await syncRepository();
      setSyncPreview(null);
    } catch (error) {
      const errStr = error instanceof Error ? error.message : String(error);
      setSyncStatusText(`同步失败 · ${errStr}`);
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
    setSyncStatusText('正在比较文件…');
    try {
      await saveCurrentDocument();
      const { invoke } = await import('@tauri-apps/api/core');
      const preview: SyncPreview = await invoke('preview_git_sync', { repoName, provider, username });
      setSyncPreview(preview);
      const originNotice = preview.hasOrigin ? '' : ' · 尚未关联远程';
      setSyncStatusText(`比较完成 · 本地 ${preview.localChanges.length} 项 / 远程 ${preview.remoteChanges.length} 项${originNotice}`);
    } catch (error) {
      setSyncStatusText(`比较失败 · ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfirmSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('同步中…');
    try {
      await syncRepository();
      setSyncPreview(null);
    } catch (error) {
      setSyncStatusText(`同步失败 · ${error instanceof Error ? error.message : String(error)}`);
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
        const bytes = await htmlToDocxBytes(initialDocHtml);
        await invoke('save_file_bytes', { repoName, relPath, bytes });
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
      setSyncStatusText(`保存失败 · ${error instanceof Error ? error.message : String(error)}`);
      if (selectedNote.kind === 'docx') throw error;
    }
  };

  const moveItemToFolder = async (sourcePath: string, isFolder: boolean, destinationFolder: string) => {
    const currentParent = parentFolderOf(sourcePath);
    if (currentParent === destinationFolder) {
      const itemName = sourcePath.split('/').pop() || sourcePath;
      setSyncStatusText(`「${itemName}」已在「${destinationFolder ? destinationFolder.split('/').join(' / ') : '根目录'}」中`);
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
    setSyncStatusText(`已成功将「${itemName}」移入「${destinationFolder ? destinationFolder.split('/').join(' / ') : '根目录'}」`);
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
      setSyncStatusText(`移动失败 · ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleImportFiles = async (files: FileList | File[], destinationFolder: string) => {
    let importedCount = 0;
    const { invoke } = await import('@tauri-apps/api/core');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = file.name;
      const ext = name.split('.').pop()?.toLowerCase();
      if (!ext || !['md', 'markdown', 'txt', 'html', 'htm', 'docx', 'pptx', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
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
      setSyncStatusText(`已导入 ${importedCount} 个文件到「${destinationFolder ? destinationFolder.split('/').join(' / ') : '根目录'}」`);
    }
  };

  // Open native file picker to import local files
  const handleImportLocalFiles = async (targetFolder = activeCategory) => {
    setShowNewMenu(false);
    setContextMenu(null);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: true,
        title: `导入文件到「${targetFolder ? targetFolder.split('/').join(' / ') : '根目录'}」`,
        filters: [
          {
            name: '支持的笔记及文档',
            extensions: ['docx', 'md', 'markdown', 'txt', 'html', 'htm', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'],
          },
          { name: '所有文件', extensions: ['*'] },
        ],
      });

      if (!selected) return;

      const filePaths: string[] = Array.isArray(selected) ? selected : [selected];
      if (filePaths.length === 0) return;

      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        successCount: number;
        totalCount: number;
        importedFiles: string[];
        errors: string[];
      }>('import_local_files', {
        repoName,
        sourcePaths: filePaths,
        targetFolder,
      });

      if (result.successCount > 0) {
        await refreshNotesFromDisk();
        setActiveCategory(targetFolder);
        setSyncStatusText(`已成功导入 ${result.successCount} 个文件到「${targetFolder ? targetFolder.split('/').join(' / ') : '根目录'}」`);
        if (result.importedFiles.length > 0) {
          const firstPath = result.importedFiles[0];
          setSelectedNoteId(firstPath);
        }
      }
      if (result.errors.length > 0) {
        console.warn('Import files with errors:', result.errors);
      }
    } catch (err) {
      console.error('Failed to import local files:', err);
      alert(`导入文件失败：${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Open native directory picker to import local folder recursively
  const handleImportLocalFolder = async (targetFolder = activeCategory) => {
    setShowNewMenu(false);
    setContextMenu(null);
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        directory: true,
        multiple: false,
        title: `导入文件夹到「${targetFolder ? targetFolder.split('/').join(' / ') : '根目录'}」`,
      });

      if (!selected || typeof selected !== 'string') return;

      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<{
        folderName: string;
        relPath: string;
        fileCount: number;
        folderCount: number;
      }>('import_local_folder', {
        repoName,
        sourceFolderPath: selected,
        targetFolder,
      });

      await refreshNotesFromDisk();
      setActiveCategory(result.relPath);
      setExpandedFolders((current) => {
        const next = new Set(current);
        next.add(result.relPath);
        if (targetFolder) next.add(targetFolder);
        return next;
      });
      setSyncStatusText(
        `已成功导入文件夹「${result.folderName}」（包含 ${result.fileCount} 个文件）`
      );
    } catch (err) {
      console.error('Failed to import local folder:', err);
      alert(`导入文件夹失败：${err instanceof Error ? err.message : String(err)}`);
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
          {isSyncing ? (
            <SyncIcon size={11} className="animate-spin text-amber-500" />
          ) : syncStatusText.includes('失败') ? (
            <AlertTriangleIcon size={11} className="text-amber-500" />
          ) : (
            <CheckIcon size={11} className="text-emerald-500" />
          )}
          <span>{syncStatusText}</span>
        </button>

        {/* Branch Quick Switch Pill */}
        <button
          type="button"
          onClick={() => setShowBranchModal(true)}
          className="text-[11px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300"
          title="点击查看或切换 Git 分支"
          aria-label="切换 Git 分支"
        >
          <GitBranchIcon size={12} className="text-emerald-600 dark:text-emerald-400" />
          <span className="max-w-[120px] truncate font-medium">{currentBranch}</span>
        </button>

        {/* ＋ 新建 Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNewMenu((prev) => !prev)}
            className={`wb-create-btn ${showNewMenu ? 'is-open' : ''}`}
            title="新建文件/文件夹，或导入外部内容"
            aria-label="新建或导入"
          >
            <span className="wb-create-plus" aria-hidden="true">
              <PlusIcon size={13} />
            </span>
            <span>新建</span>
            <span className="wb-create-arrow" aria-hidden="true">
              <ChevronDownIcon size={10} />
            </span>
          </button>

          {showNewMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNewMenu(false)} />
              <div className="wb-create-dropdown">
                {/* 区域 1：新建 */}
                <div className="wb-create-section-title">新建内容</div>
                <button
                  type="button"
                  onClick={() => openNewNote(activeCategory)}
                  className="wb-create-menu-item"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="wb-create-item-icon bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                      <NoteFormatIcon kind="md" size={15} />
                    </span>
                    <span className="font-medium">新建笔记</span>
                  </span>
                  <span className="wb-create-badge">⌘N</span>
                </button>
                <button
                  type="button"
                  onClick={() => openNewFolder(activeCategory)}
                  className="wb-create-menu-item"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="wb-create-item-icon bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                      <FolderPlusIcon size={15} />
                    </span>
                    <span className="font-medium">新建文件夹</span>
                  </span>
                  <span className="wb-create-badge">⌘⇧N</span>
                </button>

                {/* 分割线 */}
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                {/* 区域 2：导入 */}
                <div className="wb-create-section-title">外部导入</div>
                <button
                  type="button"
                  onClick={() => void handleImportLocalFiles(activeCategory)}
                  className="wb-create-menu-item"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="wb-create-item-icon bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                      <FileImportIcon size={15} />
                    </span>
                    <div>
                      <div className="font-medium">导入本地文件…</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">支持 Word/Markdown/文本/图片</div>
                    </div>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleImportLocalFolder(activeCategory)}
                  className="wb-create-menu-item"
                >
                  <span className="flex items-center gap-2.5">
                    <span className="wb-create-item-icon bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <FolderImportIcon size={15} />
                    </span>
                    <div>
                      <div className="font-medium">导入整个文件夹…</div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">完整保留多层级目录结构</div>
                    </div>
                  </span>
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
          <span className="wb-ai-sparkle text-amber-500">
            <SparklesIcon size={11} />
          </span>
        </button>

        {/* Manual Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="sync-button"
          title="保存并提交、推送同步到远程 Git 仓库 (冲突或异常时将弹出比较窗口)"
          aria-label="立即同步到 Git"
        >
          <SyncIcon size={13} className={isSyncing ? 'animate-spin' : ''} />
          <span>{isSyncing ? '同步中…' : '同步'}</span>
        </button>
      </Titlebar>

      {/* 3-Column Main Layout */}
      <div className="workbench-layout">
        {/* Column 1: Sidebar */}
        <aside className="wb-sidebar relative">
          {/* Data Root Group Switcher & Capacity Guard Card */}
          <div className="wb-root-group-card">
            <div className="flex items-center justify-between mb-1">
              <button
                type="button"
                onClick={() => setShowRootGroupMenu((prev) => !prev)}
                className="flex items-center gap-1.5 font-bold text-xs text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer min-w-0"
                title="点击切换或管理数据根组 (独立 Git 仓库)"
              >
                <RootFolderIcon size={14} className="flex-shrink-0" />
                <span className="truncate max-w-[130px]">
                  {rootGroups.find((g) => g.name === repoName)?.displayName || repoName}
                </span>
                <ChevronDownIcon size={10} className="text-slate-400 flex-shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setShowCreateRootGroup(true)}
                className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-600 cursor-pointer flex items-center"
                title="新建数据根组 (创建独立 Git 仓库以扩容分流)"
              >
                <PlusIcon size={11} />
              </button>
            </div>

            {/* Capacity Meter */}
            {currentUsage && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span>已用 {currentUsage.totalSizeFormatted} / {currentUsage.quotaFormatted}</span>
                  <span
                    className={
                      currentUsage.healthStatus === 'critical'
                        ? 'text-red-600 dark:text-red-400 font-bold'
                        : currentUsage.healthStatus === 'warning'
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {currentUsage.usagePercentage.toFixed(0)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.max(3, currentUsage.usagePercentage))}%`,
                      background:
                        currentUsage.healthStatus === 'critical'
                          ? '#ef4444'
                          : currentUsage.healthStatus === 'warning'
                          ? '#f59e0b'
                          : 'var(--accent-500, #10b981)',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Capacity warning alert if approaching limit */}
            {currentUsage && currentUsage.healthStatus !== 'healthy' && (
              <div className="mt-2 p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between gap-1.5 text-[10px] text-amber-800 dark:text-amber-200">
                <span className="truncate">仓库空间即将满载</span>
                <button
                  type="button"
                  onClick={() => setShowCreateRootGroup(true)}
                  className="px-1.5 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-medium cursor-pointer flex-shrink-0"
                >
                  新建分区
                </button>
              </div>
            )}
          </div>

          {/* Root Groups Dropdown Popup */}
          {showRootGroupMenu && (
            <>
              <div className="wb-context-backdrop" onClick={() => setShowRootGroupMenu(false)} />
              <div
                className="wb-root-groups-dropdown"
                style={{
                  position: 'absolute',
                  top: '56px',
                  left: '12px',
                  width: '260px',
                  zIndex: 70,
                  background: 'var(--c-surface, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--c-line, #e2e8f0)',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
                  padding: '6px',
                }}
              >
                <div className="px-2 py-1 text-[10.5px] font-semibold text-slate-400">
                  数据根组 (独立 Git 仓库)
                </div>
                <div className="max-h-56 overflow-y-auto flex flex-col gap-1 my-1">
                  {rootGroups.map((group) => {
                    const isCur = group.name === repoName;
                    return (
                      <button
                        key={group.name}
                        type="button"
                        onClick={() => {
                          setShowRootGroupMenu(false);
                          if (!isCur) {
                            onSwitchRepo(group.name);
                          }
                        }}
                        className={`w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                          isCur
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <RootFolderIcon size={13} className="flex-shrink-0" />
                            <span className="truncate">{group.displayName || group.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                            {group.totalSizeFormatted} / {group.quotaFormatted} · {group.provider}
                          </div>
                        </div>
                        {isCur && <CheckIcon size={13} className="text-emerald-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setShowRootGroupMenu(false);
                    setShowCreateRootGroup(true);
                  }}
                  className="w-full text-left p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center gap-2 text-xs font-medium cursor-pointer"
                >
                  <PlusIcon size={12} />
                  <span>新建数据根组 (扩容分流)…</span>
                </button>
              </div>
            </>
          )}

          <div className="wb-section-title">
            <span>笔记本分类</span>
            <button
              onClick={() => openNewFolder(activeCategory)}
              className="hover:text-slate-700 text-sm cursor-pointer p-0.5 rounded flex items-center"
              title="新建文件夹 (⌘⇧N)"
            >
              <PlusIcon size={12} />
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <FolderPlusIcon size={14} />
                  <span>创建第一个笔记文件夹</span>
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
          <div className="wb-search-box flex items-center gap-2 px-2.5">
            <SearchIcon size={13} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题或标签 (⌘⇧P)..."
              className="wb-search-input flex-1"
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
                <div className="flex justify-center mb-3">
                  <EmptyFolderIllustration size={56} />
                </div>
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
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                  >
                    <PlusIcon size={11} /> 在此新建笔记
                  </button>
                  <button
                    type="button"
                    onClick={() => openNewFolder(activeCategory)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <FolderPlusIcon size={13} /> 新建子文件夹
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleImportLocalFiles(activeCategory)}
                    className="px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 text-xs text-blue-600 dark:text-blue-300 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <FileImportIcon size={13} /> 导入文件
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleImportLocalFolder(activeCategory)}
                    className="px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <FolderImportIcon size={13} /> 导入文件夹
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
                        <div className="wb-note-title flex items-center gap-1.5 min-w-0">
                          <NoteFormatIcon kind={n.kind} size={15} className="flex-shrink-0" />
                          <span className="truncate">{n.title}</span>
                        </div>
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
            ) : selectedNote.kind === 'pdf' ? (
              <PdfViewer
                key={selectedNote.id}
                repoName={repoName}
                relPath={selectedNote.path}
                title={selectedNote.title}
                onOpenExternal={handleOpenExternal}
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
                <button role="menuitem" onClick={() => openNewNote(contextMenu.path)} className="flex items-center gap-2">
                  <NoteFormatIcon kind="md" size={14} /> 新建笔记
                </button>
                <button role="menuitem" onClick={() => openNewFolder(contextMenu.path)} className="flex items-center gap-2">
                  <FolderPlusIcon size={14} /> {contextMenu.path === '' ? '新建一级文件夹' : '新建子文件夹'}
                </button>
                <div className="wb-context-divider" />
                <button role="menuitem" onClick={() => void handleImportLocalFiles(contextMenu.path)} className="flex items-center gap-2">
                  <FileImportIcon size={14} /> 导入文件到此…
                </button>
                <button role="menuitem" onClick={() => void handleImportLocalFolder(contextMenu.path)} className="flex items-center gap-2">
                  <FolderImportIcon size={14} /> 导入子文件夹…
                </button>
                {contextMenu.path && (
                  <>
                    <div className="wb-context-divider" />
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMoveItem({ path: contextMenu.path, isFolder: true });
                        setContextMenu(null);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ExternalLinkIcon size={13} /> 移动文件夹…
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMoveToRootGroupItem({ path: contextMenu.path, isFolder: true });
                        setContextMenu(null);
                      }}
                      className="flex items-center gap-2 text-amber-700 dark:text-amber-300"
                    >
                      <RootFolderIcon size={13} /> 移至其他数据根组 (跨库迁移)…
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMoveItem({ path: contextMenu.path, isFolder: false });
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2"
                >
                  <ExternalLinkIcon size={13} /> 移动文件…
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMoveToRootGroupItem({ path: contextMenu.path, isFolder: false });
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-2 text-amber-700 dark:text-amber-300"
                >
                  <RootFolderIcon size={13} /> 移至其他数据根组 (跨库迁移)…
                </button>
              </>
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
            setSyncStatusText(`已切换至分支 [${newBranch}]`);
            await refreshNotesFromDisk();
          }}
        />
      )}

      {showCreateRootGroup && (
        <CreateRootGroupModal
          isOpen={showCreateRootGroup}
          onClose={() => setShowCreateRootGroup(false)}
          onCreated={async (newGroup) => {
            await refreshRootGroupsAndUsage();
            onSwitchRepo(newGroup.name);
          }}
        />
      )}

      {moveToRootGroupItem && (
        <MoveToRootGroupModal
          isOpen={Boolean(moveToRootGroupItem)}
          sourceRepo={repoName}
          sourcePath={moveToRootGroupItem.path}
          isFolder={moveToRootGroupItem.isFolder}
          rootGroups={rootGroups}
          onClose={() => setMoveToRootGroupItem(null)}
          onMoved={async (targetRepo) => {
            await refreshNotesFromDisk();
            await refreshRootGroupsAndUsage();
            setSyncStatusText(`已将文档迁移至根组 [${targetRepo}]`);
          }}
        />
      )}

    </div>
  );
};
