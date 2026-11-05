import React, { useState } from 'react';
import { NoteKind } from '../../types/note';
import {
  FilePlusIcon,
  FileGenericIcon,
  CalendarIcon,
  UsersIcon,
  WrenchIcon,
  FolderIcon,
  FolderPlusIcon,
  CloseIcon,
  NoteFormatIcon,
  PlusIcon,
} from '../../components/Icons';

interface NewNoteModalProps {
  categories: string[];
  defaultCategory?: string;
  onConfirm: (folder: string, title: string, kind: NoteKind, templateContent: string) => Promise<void>;
  onClose: () => void;
  onCreateFolder?: (parent: string, name: string) => Promise<string>;
}

const TEMPLATES = [
  {
    id: 'blank',
    name: '空白文档',
    desc: '从白纸开始记录灵感',
    icon: <FileGenericIcon size={14} className="text-slate-500" />,
    content: (title: string) => `# ${title}\n\n`,
  },
  {
    id: 'daily',
    name: '工作日报',
    desc: '今日完成、明日计划与遇到的问题',
    icon: <CalendarIcon size={14} className="text-blue-500" />,
    content: (title: string) => `# ${title}\n\n## 1. 今日完成事项\n- \n\n## 2. 明日推进计划\n- \n\n## 3. 阻塞与思考\n- 无\n`,
  },
  {
    id: 'meeting',
    name: '会议纪要',
    desc: '参会人、讨论要点与行动项 Action Items',
    icon: <UsersIcon size={14} className="text-emerald-500" />,
    content: (title: string) => `# ${title}\n\n- **时间**：${new Date().toLocaleDateString()}\n- **参会人**：\n- **议题**：\n\n## 讨论核心纪要\n1. \n\n## 行动项 (TODO)\n- [ ] 负责人：完成项\n`,
  },
  {
    id: 'tech',
    name: '技术方案',
    desc: '背景、架构选型、接口定义与压测指标',
    icon: <WrenchIcon size={14} className="text-amber-500" />,
    content: (title: string) => `# ${title}\n\n## 1. 背景与业务价值\n\n## 2. 总体架构图\n\n## 3. 核心 API 与数据模型\n\n## 4. 上线与回滚预案\n`,
  },
];

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  categories,
  defaultCategory = '',
  onConfirm,
  onClose,
  onCreateFolder,
}) => {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NoteKind>('md');
  const [selectedFolder, setSelectedFolder] = useState(defaultCategory ?? categories[0] ?? '');
  const [availableCategories, setAvailableCategories] = useState<string[]>(categories);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [showInlineNewFolder, setShowInlineNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  React.useEffect(() => {
    setAvailableCategories(categories);
  }, [categories]);

  const handleQuickCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (/[/\\:*?"<>|]/.test(trimmed)) {
      setError('文件夹名称不能包含 / \\ : * ? " < > | 等非法字符');
      return;
    }
    if (!onCreateFolder) return;

    setCreatingFolder(true);
    setError('');
    try {
      const fullPath = await onCreateFolder(selectedFolder, trimmed);
      setAvailableCategories((prev) => (prev.includes(fullPath) ? prev : [...prev, fullPath]));
      setSelectedFolder(fullPath);
      setNewFolderName('');
      setShowInlineNewFolder(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || '未命名笔记';
    if (/[/\\:*?"<>|]/.test(cleanTitle)) {
      setError('文件名不能包含 / \\ : * ? " < > | 等非法字符');
      return;
    }
    const tpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
    let initialBody = tpl.content(cleanTitle);
    if (kind === 'docx' || kind === 'html') {
      initialBody = `<!doctype html><html><head><meta charset="utf-8"></head><body><h1>${cleanTitle}</h1><p>在此开始记录你的思考，支持类似 Word 的排版与直接粘贴外部富文本原格式...</p></body></html>`;
    }

    setCreating(true);
    setError('');
    try {
      await onConfirm(selectedFolder, cleanTitle, kind, initialBody);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : String(createError));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <FilePlusIcon size={16} className="text-emerald-600" />
            <span>新建笔记文件</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1">
            <CloseIcon size={12} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Note Title */}
          <div>
            <label className="block text-slate-500 font-medium mb-1.5">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入笔记标题"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Folder & Format Type */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-500 font-medium">存放位置</label>
                  {!showInlineNewFolder && onCreateFolder && (
                    <button
                      type="button"
                      onClick={() => setShowInlineNewFolder(true)}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <PlusIcon size={10} /> 新建文件夹
                    </button>
                  )}
                </div>
                <select
                  value={selectedFolder}
                  onChange={(e) => setSelectedFolder(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
                >
                  <option value="">根目录</option>
                  {availableCategories.map((c) => (
                    <option key={c} value={c}>
                      {c.split('/').join(' / ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 font-medium mb-1.5">格式类型</label>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as NoteKind)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500 font-medium"
                >
                  <option value="md">Markdown 笔记 (.md) — 轻量标记语法与实时双栏</option>
                  <option value="docx">Word 文档 (.docx) — Word 拟真排版与富文本编辑</option>
                  <option value="html">富文本笔记 (.html) — 图文排版与网页样式</option>
                  <option value="txt">纯文本 (.txt)</option>
                </select>
              </div>
            </div>

            {showInlineNewFolder && (
              <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20 space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                  <span>在「{selectedFolder ? selectedFolder.split('/').join(' / ') : '根目录'}」下创建新文件夹：</span>
                  <button
                    type="button"
                    onClick={() => { setShowInlineNewFolder(false); setNewFolderName(''); }}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <CloseIcon size={10} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleQuickCreateFolder();
                      }
                    }}
                    placeholder="例如：技术方案、架构演进"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleQuickCreateFolder()}
                    disabled={creatingFolder || !newFolderName.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                  >
                    {creatingFolder ? '创建中…' : '确认创建'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Templates */}
          {kind === 'md' && (
            <div>
              <label className="block text-slate-500 font-medium mb-1.5">选择模板</label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplate === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => setSelectedTemplate(tpl.id)}
                      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span>{tpl.icon}</span> {tpl.name}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate">{tpl.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-[11px] text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={creating}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow"
              style={{ background: 'var(--accent-600, #059669)' }}
            >
              {creating ? '创建中…' : '创建并打开 ↵'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
