import React, { useState } from 'react';
import { NoteKind } from '../../types/note';

interface NewNoteModalProps {
  categories: string[];
  defaultCategory?: string;
  onConfirm: (folder: string, title: string, kind: NoteKind, templateContent: string) => void;
  onClose: () => void;
}

const TEMPLATES = [
  {
    id: 'blank',
    name: '空白文档',
    desc: '从白纸开始记录灵感',
    icon: '📝',
    content: (title: string) => `# ${title}\n\n`,
  },
  {
    id: 'daily',
    name: '🗓 工作日报',
    desc: '今日完成、明日计划与遇到的问题',
    icon: '🗓',
    content: (title: string) => `# ${title}\n\n## 1. 今日完成事项\n- \n\n## 2. 明日推进计划\n- \n\n## 3. 阻塞与思考\n- 无\n`,
  },
  {
    id: 'meeting',
    name: '🧑‍🤝‍🧑 会议纪要',
    desc: '参会人、讨论要点与行动项 Action Items',
    icon: '🧑‍🤝‍🧑',
    content: (title: string) => `# ${title}\n\n- **时间**：${new Date().toLocaleDateString()}\n- **参会人**：\n- **议题**：\n\n## 讨论核心纪要\n1. \n\n## 行动项 (TODO)\n- [ ] 负责人：完成项\n`,
  },
  {
    id: 'tech',
    name: '🛠 技术方案',
    desc: '背景、架构选型、接口定义与压测指标',
    icon: '🛠',
    content: (title: string) => `# ${title}\n\n## 1. 背景与业务价值\n\n## 2. 总体架构图\n\n## 3. 核心 API 与数据模型\n\n## 4. 上线与回滚预案\n`,
  },
];

export const NewNoteModal: React.FC<NewNoteModalProps> = ({
  categories,
  defaultCategory = '',
  onConfirm,
  onClose,
}) => {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<NoteKind>('md');
  const [selectedFolder, setSelectedFolder] = useState(defaultCategory || categories[0] || '默认分类');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim() || '未命名笔记';
    const tpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
    const initialBody = tpl.content(cleanTitle);

    onConfirm(selectedFolder, cleanTitle, kind, initialBody);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs select-none">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 animate-in fade-in zoom-in-95 duration-150"
        style={{ background: 'var(--c-surface, #ffffff)' }}
      >
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <span>📄</span> 新建笔记文件
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm">
            ✕
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 font-medium mb-1.5">存放位置</label>
              <select
                value={selectedFolder}
                onChange={(e) => setSelectedFolder(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    📁 {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 font-medium mb-1.5">格式类型</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as NoteKind)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="md">Markdown (.md)</option>
                <option value="html">HTML 文件 (.html)</option>
                <option value="txt">纯文本 (.txt)</option>
                <option value="docx">Word 文档 (.docx)</option>
                <option value="pptx">PPT 幻灯片 (.pptx)</option>
              </select>
            </div>
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow"
              style={{ background: 'var(--accent-600, #059669)' }}
            >
              创建并打开 ↵
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
