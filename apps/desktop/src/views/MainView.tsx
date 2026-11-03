import React, { useEffect, useState, useCallback } from 'react';
import { NoteItem, NoteKind } from '../types/note';
import { Titlebar } from '../components/Titlebar';
import { PersonalMenu } from '../components/PersonalMenu';
import { MarkdownEditor } from './Editor/MarkdownEditor';
import { DocViewer } from './DocViewer/DocViewer';
import { NewFolderModal } from './Modals/NewFolderModal';
import { NewNoteModal } from './Modals/NewNoteModal';
import { QuitSyncModal } from './Modals/QuitSyncModal';

interface MainViewProps {
  repoName: string;
  username: string;
  onSwitchRepo: () => void;
  onLogout: () => void;
}

export const MainView: React.FC<MainViewProps> = ({
  repoName,
  username,
  onSwitchRepo,
  onLogout,
}) => {
  const [categories, setCategories] = useState<string[]>(['后端开发', '前端工程', '收集笔记']);
  const [activeCategory, setActiveCategory] = useState<string>('后端开发');
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [activeContent, setActiveContent] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatusText, setSyncStatusText] = useState('✓ 已同步 · 刚刚');
  const [isSyncing, setIsSyncing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showQuitSync, setShowQuitSync] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  // Load real notes and categories from Tauri backend
  const refreshNotesFromDisk = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const items: any[] = await invoke('list_notebooks_tree', { repoName });

      const catList: string[] = [];
      const flatNotes: NoteItem[] = [];

      const traverse = (itemList: any[], currentCat: string) => {
        for (const item of itemList) {
          if (item.isFolder) {
            catList.push(item.name);
            if (item.children) {
              traverse(item.children, item.name);
            }
          } else {
            flatNotes.push({
              id: item.id || item.path,
              path: item.path,
              name: item.name,
              title: item.title || item.name,
              kind: item.kind as NoteKind,
              isFolder: false,
              updatedAt: item.updatedAt || '刚刚',
              public: item.public || false,
              tags: item.tags || [],
            });
          }
        }
      };

      traverse(items, '');

      if (catList.length > 0) {
        setCategories(Array.from(new Set(catList)));
      }
      setNotes(flatNotes);

      if (flatNotes.length > 0 && !selectedNoteId) {
        setSelectedNoteId(flatNotes[0].id);
      }
    } catch (e) {
      console.error('Failed to load notes tree from disk:', e);
    } finally {
      setLoading(false);
    }
  }, [repoName, selectedNoteId]);

  useEffect(() => {
    refreshNotesFromDisk();
  }, [refreshNotesFromDisk]);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  // Read note content from real disk file when active note changes
  useEffect(() => {
    if (!selectedNote) return;

    if (selectedNote.kind === 'md' || selectedNote.kind === 'html' || selectedNote.kind === 'txt') {
      import('@tauri-apps/api/core')
        .then(({ invoke }) => {
          invoke('read_note_content', {
            repoName,
            relPath: selectedNote.path,
          })
            .then((content: any) => {
              setActiveContent(content || '');
            })
            .catch(() => {
              setActiveContent(selectedNote.content || '');
            });
        })
        .catch(() => {
          setActiveContent(selectedNote.content || '');
        });
    }
  }, [selectedNote, repoName]);

  // Real Git Sync handler
  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('⟳ 同步中…');

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const status: any = await invoke('perform_git_sync', { repoName });
      const timeStr = status.lastSyncTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncStatusText(`✓ 已同步 · ${timeStr}`);
    } catch (e: any) {
      setSyncStatusText('⚠ 同步提示 (离线保存)');
    } finally {
      setIsSyncing(false);
      refreshNotesFromDisk();
    }
  };

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
      setCategories((prev) => Array.from(new Set([...prev, fullPath])));
      setActiveCategory(fullPath);
      refreshNotesFromDisk();
    } catch (e) {
      console.error('Failed to create folder:', e);
    }
    setShowNewFolder(false);
  };

  // Create new note in real repository
  const handleCreateNote = async (folder: string, title: string, kind: NoteKind, body: string) => {
    const ext = kind === 'md' ? '.md' : kind === 'html' ? '.html' : `.${kind}`;
    const relPath = folder ? `${folder}/${title}${ext}` : `${title}${ext}`;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_note_content', {
        repoName,
        relPath,
        content: body,
      });
      await refreshNotesFromDisk();
      setSelectedNoteId(relPath);
      setActiveContent(body);
    } catch (e) {
      console.error('Failed to create note:', e);
    }
    setShowNewNote(false);
  };

  // Save note content to real disk
  const handleSaveNote = async (updatedContent: string) => {
    setActiveContent(updatedContent);
    if (!selectedNote) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_note_content', {
        repoName,
        relPath: selectedNote.path,
        content: updatedContent,
      });
    } catch (e) {
      console.error('Failed to save note content:', e);
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
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#fffdf7] text-[#1f2433] select-none">
      {/* Top Titlebar */}
      <Titlebar title={`mg-node — ${selectedNote?.title || '我的笔记'}`}>
        {/* Sync Status Badge */}
        <span
          className="text-[11px] px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5"
          style={{ background: 'var(--c-surface-3, #f0f1f6)', color: 'var(--c-text-2, #555b6e)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: isSyncing ? '#f59e0b' : 'var(--accent-500, #10b981)' }}
          />
          {syncStatusText}
        </span>

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
                  onClick={() => {
                    setShowNewMenu(false);
                    setShowNewNote(true);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <span>📄</span> 新建文件
                  </span>
                  <kbd className="text-[10px] text-slate-400 font-mono">⌘N</kbd>
                </button>
                <button
                  onClick={() => {
                    setShowNewMenu(false);
                    setShowNewFolder(true);
                  }}
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

        {/* Manual Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="btn btn--ghost btn--sm"
          title="立即同步 (Git Commit & Push)"
          style={{ cursor: 'pointer' }}
        >
          <span className={isSyncing ? 'animate-spin inline-block' : ''}>⟳</span>
        </button>
      </Titlebar>

      {/* 3-Column Main Layout */}
      <div className="workbench-layout">
        {/* Column 1: Sidebar */}
        <aside className="wb-sidebar">
          <div className="wb-section-title">
            <span>笔记本分类</span>
            <button
              onClick={() => setShowNewFolder(true)}
              className="hover:text-slate-700 text-sm cursor-pointer p-0.5 rounded"
              title="新建文件夹 (⌘⇧N)"
            >
              +
            </button>
          </div>

          {/* Folder Tree */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {categories.map((cat) => {
              const count = notes.filter((n) => n.path.startsWith(cat)).length;
              const isActive = activeCategory === cat;
              return (
                <div
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`wb-folder-item ${isActive ? 'is-active' : ''}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span>{isActive ? '📂' : '📁'}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cat}
                    </span>
                  </div>
                  <span className="wb-folder-badge">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Sidebar Bottom Profile Card */}
          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--c-line, #eceef3)', marginTop: '8px' }}>
            <PersonalMenu
              repoName={repoName}
              username={username}
              onSwitchRepo={onSwitchRepo}
              onLogout={onLogout}
              onOpenAiSettings={() => alert('AI 知识库助手已在架构中就绪 (默认关闭，可配置 API Key)')}
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
          <div className="wb-notes-scroll">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontSize: '12px', color: 'var(--c-muted)' }}>
                正在加载仓库笔记…
              </div>
            ) : notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', fontSize: '12px', color: 'var(--c-muted)' }}>
                当前分类下无笔记<br />
                点击右上角「＋ 新建」开始写作
              </div>
            ) : (
              notes
                .filter(
                  (n) =>
                    !searchQuery ||
                    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    n.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
                )
                .map((n) => {
                  const isSelected = n.id === selectedNoteId;
                  return (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNoteId(n.id)}
                      className={`wb-note-card ${isSelected ? 'is-active' : ''}`}
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
            selectedNote.kind === 'md' ? (
              <MarkdownEditor
                key={selectedNote.id}
                initialContent={activeContent}
                title={selectedNote.title}
                onSave={handleSaveNote}
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
      </div>

      {/* Modals */}
      {showNewFolder && (
        <NewFolderModal
          categories={categories}
          onConfirm={handleCreateFolder}
          onClose={() => setShowNewFolder(false)}
        />
      )}

      {showNewNote && (
        <NewNoteModal
          categories={categories}
          defaultCategory={activeCategory}
          onConfirm={handleCreateNote}
          onClose={() => setShowNewNote(false)}
        />
      )}

      {showQuitSync && (
        <QuitSyncModal
          onConfirmExit={async () => {
            setShowQuitSync(false);
            const { invoke } = await import('@tauri-apps/api/core');
            await invoke('exit_app');
          }}
          onCancel={() => setShowQuitSync(false)}
        />
      )}
    </div>
  );
};
