import React, { useEffect, useState } from 'react';
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

const DEFAULT_SAMPLE_MD = `---
id: 01JBX7Q8K2M3N4P5R6S7T8V9W0
title: Redis 缓存穿透的三种解法
tags: [redis, 后端开发]
public: true
created: 2026-11-01T10:20:00+08:00
updated: 2026-11-03T14:05:00+08:00
view_mode: split
---

# Redis 缓存穿透的三种解法

缓存穿透是指查询一个**根本不存在的数据**，由于缓存层不命中，请求直接打到存储层。

> [!NOTE] 核心危害
> 如果黑客恶意发起海量不存在 key 的请求，可能导致后端数据库瞬间宕机。

## 常见解法对比

1. **缓存空对象 (Null Cache)**
   - 优点：实现极简，业务代码侵入小。
   - 缺点：占用额外的缓存内存；数据如果被真实插入，可能存在短暂数据不一致（需设置短 TTL）。

2. **布隆过滤器 (Bloom Filter)**
   - 原理：在访问缓存前通过 BitMap 与多个 Hash 函数预先判断 Key 是否一定不存在。
   - 优点：内存占用极低，拦截率高。
   - 缺点：存在一定的误判率（False Positive），且删除元素相对复杂（可考虑 Counting Bloom Filter）。

3. **接口请求频控与校验**
   - 在 API 网关层做参数基础格式拦截，过滤非法格式请求。
`;

export const MainView: React.FC<MainViewProps> = ({
  repoName,
  username,
  onSwitchRepo,
  onLogout,
}) => {
  const [categories, setCategories] = useState<string[]>(['后端开发', '前端工程', '收集笔记']);
  const [activeCategory, setActiveCategory] = useState<string>('后端开发');

  const [notes, setNotes] = useState<NoteItem[]>([
    {
      id: 'n1',
      path: '后端开发/Redis-缓存穿透的三种解法.md',
      name: 'Redis-缓存穿透的三种解法.md',
      title: 'Redis 缓存穿透的三种解法',
      kind: 'md',
      isFolder: false,
      updatedAt: '14:05',
      public: true,
      tags: ['redis', '架构'],
      content: DEFAULT_SAMPLE_MD,
    },
    {
      id: 'n2',
      path: '后端开发/k8s-hpa-压测报告.pdf',
      name: 'k8s-hpa-压测报告.pdf',
      title: 'K8s HPA 自动伸缩压测报告',
      kind: 'pdf',
      isFolder: false,
      updatedAt: '昨天',
      public: false,
      tags: ['k8s', 'DevOps'],
    },
    {
      id: 'n3',
      path: '后端开发/架构方案说明书.docx',
      name: '架构方案说明书.docx',
      title: '分布式事务选型设计方案',
      kind: 'docx',
      isFolder: false,
      updatedAt: '3 天前',
      public: false,
      tags: ['方案'],
    },
  ]);

  const [selectedNoteId, setSelectedNoteId] = useState<string>('n1');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatusText, setSyncStatusText] = useState('✓ 已同步 · 刚刚');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showNewNote, setShowNewNote] = useState(false);
  const [showQuitSync, setShowQuitSync] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const selectedNote = notes.find((n) => n.id === selectedNoteId) || notes[0];

  // Manual Git Sync handler
  const handleSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStatusText('⟳ 同步中…');
    setTimeout(() => {
      setIsSyncing(false);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSyncStatusText(`✓ 已同步 · ${timeStr}`);
    }, 1200);
  };

  // Create new folder handler
  const handleCreateFolder = (parent: string, name: string) => {
    const fullPath = parent ? `${parent}/${name}` : name;
    setCategories((prev) => [...prev, fullPath]);
    setActiveCategory(fullPath);
    setShowNewFolder(false);
  };

  // Create new note handler
  const handleCreateNote = (folder: string, title: string, kind: NoteKind, body: string) => {
    const ext = kind === 'md' ? '.md' : kind === 'html' ? '.html' : `.${kind}`;
    const newId = 'n_' + Date.now().toString(36);
    const newNote: NoteItem = {
      id: newId,
      path: `${folder}/${title}${ext}`,
      name: `${title}${ext}`,
      title,
      kind,
      isFolder: false,
      updatedAt: '刚刚',
      public: false,
      tags: [],
      content: body,
    };
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNoteId(newId);
    setShowNewNote(false);
  };

  // Note content save handler
  const handleSaveNote = (updatedContent: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === selectedNote.id ? { ...n, content: updatedContent } : n))
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 select-none">
      {/* Top Titlebar & Actions */}
      <Titlebar title={`mg-node — ${selectedNote?.title || '我的笔记'}`}>
        {/* Sync Status Badge */}
        <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
          {syncStatusText}
        </span>

        {/* ＋ 新建 Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNewMenu((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-white shadow-xs"
            style={{ background: 'var(--accent-600, #059669)' }}
          >
            <span>＋ 新建</span>
            <span className="text-[10px]">▾</span>
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
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200"
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
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-slate-700 dark:text-slate-200"
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
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm"
          title="立即同步 (拉取、提交并推送)"
        >
          <span className={isSyncing ? 'animate-spin inline-block' : ''}>⟳</span>
        </button>
      </Titlebar>

      {/* 3-Column Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Categories & Notebooks Sidebar */}
        <aside
          className="w-52 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 p-3 select-none flex-shrink-0"
          style={{ background: 'var(--c-surface-2, #fafaf9)' }}
        >
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <span className="text-[11px] font-bold text-slate-400 tracking-wider">笔记本分类</span>
            <button
              onClick={() => setShowNewFolder(true)}
              className="text-slate-400 hover:text-slate-600 text-xs"
              title="新建文件夹 (⌘⇧N)"
            >
              +
            </button>
          </div>

          {/* Folder Tree */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {categories.map((cat) => {
              const count = notes.filter((n) => n.path.startsWith(cat)).length;
              const isActive = activeCategory === cat;
              return (
                <div
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50'
                  }`}
                  style={{
                    color: isActive ? 'var(--accent-700)' : undefined,
                  }}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>📁</span>
                    <span className="truncate">{cat}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 opacity-80">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Sidebar Bottom Profile Card */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 mt-2">
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
        <section
          className="w-64 h-full flex flex-col border-r border-slate-200 dark:border-slate-800 flex-shrink-0"
          style={{ background: 'var(--c-surface, #ffffff)' }}
        >
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标题或标签 (⌘⇧P)..."
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border-none text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Notes Cards */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {notes
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
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                    }`}
                    style={{
                      borderColor: isSelected ? 'var(--accent-500)' : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-100 truncate flex-1 pr-1">
                        {n.title}
                      </div>
                      {n.public && (
                        <span className="text-[10px] px-1 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300 font-mono flex-shrink-0">
                          公开
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span className="uppercase text-[10px] font-mono px-1 rounded bg-slate-100 dark:bg-slate-800">
                        {n.kind}
                      </span>
                      <span>{n.updatedAt}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>

        {/* Column 3: Main Editor or Document Viewer */}
        <main className="flex-1 h-full flex flex-col overflow-hidden">
          {selectedNote.kind === 'md' ? (
            <MarkdownEditor
              key={selectedNote.id}
              initialContent={selectedNote.content || ''}
              title={selectedNote.title}
              onSave={handleSaveNote}
            />
          ) : (
            <DocViewer
              key={selectedNote.id}
              title={selectedNote.title}
              kind={selectedNote.kind}
              onOpenExternal={() => {
                alert(`正在通过 macOS NSWorkspace 调用默认应用程序打开: ${selectedNote.name}`);
              }}
            />
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
          onConfirmExit={() => {
            setShowQuitSync(false);
            alert('同步完成，退出应用程序');
          }}
          onCancel={() => setShowQuitSync(false)}
        />
      )}
    </div>
  );
};
