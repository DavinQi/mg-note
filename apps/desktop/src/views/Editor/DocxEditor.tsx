import React, { useEffect, useRef, useState } from 'react';

interface DocxEditorProps {
  initialHtml: string;
  title: string;
  kind?: string; // 'docx' | 'html'
  loadError?: string;
  onSave: (html: string) => Promise<void>;
  onContentChange: (html: string) => void;
}

const DEFAULT_DOCUMENT = '<!doctype html><html><head><meta charset="utf-8"></head><body><p><br></p></body></html>';

const sanitizeDocumentHtml = (html: string, isFluid = false): string => {
  const doc = new DOMParser().parseFromString(html || DEFAULT_DOCUMENT, 'text/html');

  // Strip dangerous active content while preserving formatting and media
  doc.querySelectorAll('script, iframe, object, embed, form, link[rel="stylesheet"]').forEach((node) => node.remove());

  // Clean dangerous inline JS event handlers (onload, onclick, etc.)
  doc.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
  });

  // Inject or update Word-like document styles
  let editorStyle = doc.querySelector('style[data-mg-node-editor]') as HTMLStyleElement | null;
  if (!editorStyle) {
    editorStyle = doc.createElement('style');
    editorStyle.dataset.mgNodeEditor = 'true';
    doc.head.appendChild(editorStyle);
  }

  editorStyle.textContent = `
    html {
      background: var(--bg, #f3f4f6);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #1f2937;
      height: 100%;
    }
    body {
      box-sizing: border-box;
      width: ${isFluid ? '100%' : '816px'};
      min-height: ${isFluid ? '100%' : '1056px'};
      margin: ${isFluid ? '0' : '28px auto'};
      padding: ${isFluid ? '32px 48px' : '64px 72px'};
      background: #ffffff;
      color: #1f2937;
      box-shadow: ${isFluid ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.08)'};
      outline: none;
      line-height: 1.75;
      font-size: 14.5px;
      word-break: break-word;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 14px 0;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 8px 12px;
      min-width: 48px;
    }
    th {
      background-color: #f9fafb;
      font-weight: 600;
      text-align: left;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 8px 0;
    }
    blockquote {
      border-left: 4px solid #10b981;
      background: #f0fdf4;
      padding: 8px 16px;
      margin: 12px 0;
      color: #374151;
      border-radius: 0 6px 6px 0;
    }
    pre {
      background: #1f2937;
      color: #f9fafb;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      background: #f3f4f6;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 12.5px;
    }
    h1, h2, h3, h4 {
      font-weight: 700;
      line-height: 1.35;
      margin: 20px 0 10px;
      color: #111827;
    }
    h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    h2 { font-size: 20px; }
    h3 { font-size: 16px; }
    hr {
      border: 0;
      border-top: 1px solid #e5e7eb;
      margin: 20px 0;
    }
    ul, ol {
      padding-left: 24px;
      margin: 8px 0;
    }
    li {
      margin: 4px 0;
    }
  `;

  return `<!doctype html>${doc.documentElement.outerHTML}`;
};

export const DocxEditor: React.FC<DocxEditorProps> = ({
  initialHtml,
  title,
  kind = 'docx',
  loadError,
  onSave,
  onContentChange,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestHtmlRef = useRef('');
  const savedHtmlRef = useRef('');
  const dirtyRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onContentChange);

  const [isFluidView, setIsFluidView] = useState(false);
  const [srcDoc, setSrcDoc] = useState(() => sanitizeDocumentHtml(initialHtml, false));
  const [saveStatus, setSaveStatus] = useState('✓ 已保存');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onContentChange;
  }, [onSave, onContentChange]);

  useEffect(() => {
    if (dirtyRef.current) return;
    const safeHtml = sanitizeDocumentHtml(initialHtml, isFluidView);
    latestHtmlRef.current = safeHtml;
    savedHtmlRef.current = safeHtml;
    setSrcDoc(safeHtml);
    setSaveStatus('✓ 已保存');
  }, [initialHtml, isFluidView]);

  const saveLatest = async () => {
    const html = latestHtmlRef.current;
    if (!html || html === savedHtmlRef.current || loadError) return;
    setSaveStatus('⟳ 正在保存…');
    try {
      await onSaveRef.current(html);
      savedHtmlRef.current = html;
      if (latestHtmlRef.current === html) {
        dirtyRef.current = false;
        setSaveStatus('✓ 已保存');
      }
    } catch (error) {
      setSaveStatus(`⚠️ 保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (dirtyRef.current) void saveLatest();
  }, []);

  const captureEdits = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const safeHtml = sanitizeDocumentHtml(doc.documentElement.outerHTML, isFluidView);
    latestHtmlRef.current = safeHtml;
    dirtyRef.current = true;
    onChangeRef.current(safeHtml);
    setSaveStatus('● 有未保存的修改');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => void saveLatest(), 700);
  };

  const handleFrameLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.body.contentEditable = 'true';
    doc.body.spellcheck = true;

    doc.body.addEventListener('input', captureEdits);

    // Prevent navigation on clicking links in edit mode
    doc.body.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest('a');
      if (link) {
        event.preventDefault();
      }
    });

    // Intercept image pastes (e.g. screenshots or copied images) to embed directly as Base64 Data URL
    doc.body.addEventListener('paste', (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const dataUrl = loadEvent.target?.result as string;
              if (dataUrl) {
                doc.execCommand('insertImage', false, dataUrl);
                captureEdits();
              }
            };
            reader.readAsDataURL(file);
            return;
          }
        }
      }
      // For rich HTML and text, WebKit natively pastes preserving full table, colors, and font styles
      setTimeout(captureEdits, 20);
    });

    latestHtmlRef.current = sanitizeDocumentHtml(doc.documentElement.outerHTML, isFluidView);
    if (!dirtyRef.current) savedHtmlRef.current = latestHtmlRef.current;
  };

  const execute = (command: string, value: string = '') => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    doc.body.focus();
    doc.execCommand(command, false, value);
    captureEdits();
  };

  // Insert a clean standard 3x3 table with visible borders
  const handleInsertTable = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const tableHtml = `
      <table style="border-collapse: collapse; width: 100%; margin: 14px 0;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="border: 1px solid #d1d5db; padding: 8px 12px; font-weight: 600; text-align: left;">标题 1</th>
            <th style="border: 1px solid #d1d5db; padding: 8px 12px; font-weight: 600; text-align: left;">标题 2</th>
            <th style="border: 1px solid #d1d5db; padding: 8px 12px; font-weight: 600; text-align: left;">标题 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 8px 12px;">单元格 1</td>
            <td style="border: 1px solid #d1d5db; padding: 8px 12px;">单元格 2</td>
            <td style="border: 1px solid #d1d5db; padding: 8px 12px;">单元格 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 8px 12px;">单元格 4</td>
            <td style="border: 1px solid #d1d5db; padding: 8px 12px;">单元格 5</td>
            <td style="border: 1px solid #d1d5db; padding: 8px 12px;">单元格 6</td>
          </tr>
        </tbody>
      </table>
      <p><br></p>
    `;
    execute('insertHTML', tableHtml);
  };

  const handleInsertTableRow = () => {
    const doc = iframeRef.current?.contentDocument;
    const sel = doc?.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).startContainer;
    const cell = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('td, th');
    const row = cell?.parentElement as HTMLTableRowElement | null;
    const table = row?.closest('table');
    if (!table || !row) return;

    const newRow = table.insertRow(row.rowIndex + 1);
    const colCount = row.cells.length;
    for (let i = 0; i < colCount; i++) {
      const newCell = newRow.insertCell(i);
      newCell.style.border = '1px solid #d1d5db';
      newCell.style.padding = '8px 12px';
      newCell.innerHTML = '<br>';
    }
    captureEdits();
  };

  const handleInsertTableCol = () => {
    const doc = iframeRef.current?.contentDocument;
    const sel = doc?.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).startContainer;
    const cell = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('td, th') as HTMLTableCellElement | null;
    const table = cell?.closest('table');
    if (!table || !cell) return;

    const colIndex = cell.cellIndex;
    for (let r = 0; r < table.rows.length; r++) {
      const row = table.rows[r];
      const newCell = row.insertCell(colIndex + 1);
      newCell.style.border = '1px solid #d1d5db';
      newCell.style.padding = '8px 12px';
      newCell.innerHTML = '<br>';
    }
    captureEdits();
  };

  const handleDeleteTableRow = () => {
    const doc = iframeRef.current?.contentDocument;
    const sel = doc?.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).startContainer;
    const cell = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('td, th');
    const row = cell?.parentElement as HTMLTableRowElement | null;
    const table = row?.closest('table');
    if (table && row) {
      table.deleteRow(row.rowIndex);
      captureEdits();
    }
  };

  const handleDeleteTable = () => {
    const doc = iframeRef.current?.contentDocument;
    const sel = doc?.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).startContainer;
    const table = (node.nodeType === 1 ? (node as Element) : node.parentElement)?.closest('table');
    if (table) {
      table.remove();
      captureEdits();
    }
  };

  const handleImageFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      if (dataUrl) {
        execute('insertImage', dataUrl);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleInsertLink = () => {
    const url = window.prompt('请输入跳转链接地址:', 'https://');
    if (url) {
      execute('createLink', url);
    }
  };

  return (
    <div className="wb-main-canvas flex flex-col h-full overflow-hidden select-none bg-slate-100 dark:bg-slate-900">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFilePicked}
        className="hidden"
      />

      {/* Top Header & Save Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 select-none">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
            {kind.toUpperCase()} · Word 拟真编辑
          </span>
          <strong className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-sm">
            {title}
          </strong>
          <span className="text-[11px] text-slate-400 font-mono ml-1">
            {loadError || saveStatus}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* A4 Sheet vs Fluid Full View Toggle */}
          <button
            type="button"
            onClick={() => setIsFluidView((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title={isFluidView ? '切换为 A4 纸张拟真视图' : '切换为无界流式页面'}
          >
            <span>{isFluidView ? '📃 A4 纸张' : '💻 流式全宽'}</span>
          </button>

          <button
            type="button"
            onClick={() => void saveLatest()}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
            title="立即保存到本地仓库并准备同步"
          >
            <span>💾 保存</span>
          </button>
        </div>
      </div>

      {/* Word-Style Rich Ribbon Toolbar */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto select-none text-xs"
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Group 1: 撤销 / 重做 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('undo')}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
            title="撤销 (⌘Z)"
          >
            ↩
          </button>
          <button
            type="button"
            onClick={() => execute('redo')}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
            title="重做 (⌘⇧Z)"
          >
            ↪
          </button>
        </div>

        {/* Group 2: 段落格式 / 标题 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-1">
          <select
            onChange={(e) => {
              const val = e.target.value;
              execute('formatBlock', val);
              e.target.value = '';
            }}
            defaultValue=""
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-medium focus:outline-none"
            title="段落与标题样式"
          >
            <option value="" disabled>样式 / 标题</option>
            <option value="<p>">正文段落</option>
            <option value="<h1>">标题 1 (一级标题)</option>
            <option value="<h2>">标题 2 (二级标题)</option>
            <option value="<h3>">标题 3 (三级标题)</option>
            <option value="<h4>">标题 4 (四级标题)</option>
            <option value="<blockquote>">引用块</option>
            <option value="<pre>">代码块</option>
          </select>
        </div>

        {/* Group 3: 字号 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-1">
          <select
            onChange={(e) => {
              const size = e.target.value;
              execute('fontSize', size);
              e.target.value = '';
            }}
            defaultValue=""
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-xs font-medium focus:outline-none"
            title="选择字号"
          >
            <option value="" disabled>字号</option>
            <option value="1">10px (小)</option>
            <option value="2">12px (较小)</option>
            <option value="3">14px (常规标准)</option>
            <option value="4">16px (四号)</option>
            <option value="5">18px (小三)</option>
            <option value="6">24px (二号)</option>
            <option value="7">32px (一号)</option>
          </select>
        </div>

        {/* Group 4: 字体样式 (加粗, 斜体, 下划线, 删除线, 引用) */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('bold')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold"
            title="加粗 (⌘B)"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => execute('italic')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 italic font-serif"
            title="斜体 (⌘I)"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => execute('underline')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 underline"
            title="下划线 (⌘U)"
          >
            U
          </button>
          <button
            type="button"
            onClick={() => execute('strikeThrough')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 line-through"
            title="删除线"
          >
            S
          </button>
        </div>

        {/* Group 5: 字体颜色与高亮底色 */}
        <div className="relative flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-1">
          {/* Font Color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPalette((p) => !p);
                setShowHighlightPalette(false);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-0.5 font-bold"
              title="设置文字颜色"
            >
              <span>A</span>
              <span className="w-2.5 h-1 bg-red-500 inline-block rounded-xs mt-2" />
            </button>

            {showColorPalette && (
              <div
                className="absolute top-full left-0 mt-1 p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex gap-1"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {['#111827', '#4b5563', '#ef4444', '#f97316', '#10b981', '#3b82f6', '#8b5cf6'].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      execute('foreColor', color);
                      setShowColorPalette(false);
                    }}
                    className="w-5 h-5 rounded-full border border-black/10 hover:scale-110 transition-transform"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Highlight Color */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPalette((p) => !p);
                setShowColorPalette(false);
              }}
              className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-0.5"
              title="设置文本背景高亮"
            >
              <span>🖊</span>
              <span className="w-2.5 h-1 bg-yellow-400 inline-block rounded-xs mt-2" />
            </button>

            {showHighlightPalette && (
              <div
                className="absolute top-full left-0 mt-1 p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex gap-1"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {[
                  { label: '无', color: 'transparent' },
                  { label: '黄', color: '#fef08a' },
                  { label: '绿', color: '#bbf7d0' },
                  { label: '蓝', color: '#bae6fd' },
                  { label: '粉', color: '#fbcfe8' },
                  { label: '橙', color: '#fed7aa' },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => {
                      execute('hiliteColor', item.color);
                      setShowHighlightPalette(false);
                    }}
                    className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform flex items-center justify-center text-[9px]"
                    style={{ background: item.color }}
                    title={item.label}
                  >
                    {item.color === 'transparent' ? '✕' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group 6: 对齐方式 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('justifyLeft')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="左对齐"
          >
            ⇤
          </button>
          <button
            type="button"
            onClick={() => execute('justifyCenter')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="居中对齐"
          >
            ⇥⇤
          </button>
          <button
            type="button"
            onClick={() => execute('justifyRight')}
            className="w-6 h-6 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="右对齐"
          >
            ⇥
          </button>
        </div>

        {/* Group 7: 列表与缩进 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('insertUnorderedList')}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1"
            title="无序项目符号列表"
          >
            • 列表
          </button>
          <button
            type="button"
            onClick={() => execute('insertOrderedList')}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1"
            title="编号有序列表"
          >
            1. 列表
          </button>
        </div>

        {/* Group 8: 表格 (插入、加行加列、删行删表) */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={handleInsertTable}
            className="px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-0.5"
            title="插入标准 3×3 表格"
          >
            <span>⊞</span> 插入表格
          </button>
          <button
            type="button"
            onClick={handleInsertTableRow}
            className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]"
            title="在下方增加一行"
          >
            +行
          </button>
          <button
            type="button"
            onClick={handleInsertTableCol}
            className="px-1 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px]"
            title="在右侧增加一列"
          >
            +列
          </button>
          <button
            type="button"
            onClick={handleDeleteTableRow}
            className="px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-[11px]"
            title="删除当前光标所在的行"
          >
            -行
          </button>
          <button
            type="button"
            onClick={handleDeleteTable}
            className="px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-[11px]"
            title="删除整个表格"
          >
            ✕表
          </button>
        </div>

        {/* Group 9: 插入图文/超链接/分割线 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-0.5"
            title="插入本地图片（亦可直接截图并在文档中粘贴）"
          >
            🖼 图片
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="插入超链接"
          >
            🔗 链接
          </button>
          <button
            type="button"
            onClick={() => execute('insertHorizontalRule')}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="插入分割线"
          >
            ― 分割线
          </button>
        </div>

        {/* Group 10: 清除格式 */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => execute('removeFormat')}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700"
            title="清除选中区域的样式格式"
          >
            ⌫ 清除格式
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      {loadError ? (
        <div className="docx-editor-error m-auto p-8 text-center text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800">
          ⚠️ 无法在应用内读取此文档：{loadError}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto relative w-full h-full p-2">
          <iframe
            ref={iframeRef}
            title={`${title} Word 拟真富文本编辑器`}
            srcDoc={srcDoc}
            sandbox="allow-same-origin"
            onLoad={handleFrameLoad}
            className="w-full h-full border-0 block"
            style={{
              minHeight: '100%',
              backgroundColor: 'transparent',
            }}
          />
        </div>
      )}

      {/* Bottom Hint */}
      <div className="px-4 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-slate-400 flex items-center justify-between select-none">
        <span className="flex items-center gap-1.5">
          <span>💡</span> 支持从 Word、网页、Excel 复制带样式的图文与表格并直接粘贴保持原貌；编辑后自动安全保存并同步至 Git 分支。
        </span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">
          mg-node Word Mode
        </span>
      </div>
    </div>
  );
};
