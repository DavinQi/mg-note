import React, { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table,
  Image as ImageIcon,
  Link as LinkIcon,
  Minus,
  RemoveFormatting,
  Undo,
  Redo,
  Indent,
  Outdent,
  Calendar,
  Save,
  Monitor,
  FileText,
  ChevronDown,
  Paintbrush,
} from 'lucide-react';
import { HighlighterIcon, InfoCircleIcon, AlertTriangleIcon, CheckIcon, CloseIcon } from '../../components/Icons';

interface DocxEditorProps {
  initialHtml: string;
  title: string;
  kind?: string; // 'docx' | 'html'
  loadError?: string;
  onSave: (html: string) => Promise<void>;
  onContentChange: (html: string) => void;
}

const DEFAULT_DOCUMENT = '<!doctype html><html><head><meta charset="utf-8"></head><body><p><br></p></body></html>';

const FONT_FAMILIES = [
  { label: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: '宋体', value: 'SimSun, "Songti SC", STSong, serif' },
  { label: '黑体', value: 'SimHei, "Heiti SC", STHeiti, sans-serif' },
  { label: '楷体', value: 'KaiTi, "Kaiti SC", STKaiti, serif' },
  { label: '仿宋', value: 'FangSong, "Fangsong SC", STFangsong, serif' },
  { label: '等宽代码体', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
];

const FONT_SIZES = [
  { label: '12px (小四)', value: '12px' },
  { label: '14px (五号/正文)', value: '14px' },
  { label: '16px (小三)', value: '16px' },
  { label: '18px (三号)', value: '18px' },
  { label: '20px (小二)', value: '20px' },
  { label: '24px (二号)', value: '24px' },
  { label: '28px (小一)', value: '28px' },
  { label: '32px (一号)', value: '32px' },
  { label: '36px (初号)', value: '36px' },
];

const BLOCK_STYLES = [
  { label: '正文段落', tag: 'p' },
  { label: '一级标题 H1', tag: 'h1' },
  { label: '二级标题 H2', tag: 'h2' },
  { label: '三级标题 H3', tag: 'h3' },
  { label: '四级标题 H4', tag: 'h4' },
  { label: '引用块', tag: 'blockquote' },
  { label: '代码块', tag: 'pre' },
];

const sanitizeDocumentHtml = (html: string, isFluid = false): string => {
  const doc = new DOMParser().parseFromString(html || DEFAULT_DOCUMENT, 'text/html');

  // Strip dangerous active content
  doc.querySelectorAll('script, iframe, object, embed, form, link[rel="stylesheet"]').forEach((node) => node.remove());

  // Clean inline event handlers
  doc.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attr) => {
      if (attr.name.toLowerCase().startsWith('on')) {
        element.removeAttribute(attr.name);
      }
    });
  });

  // Inject Word-like document styles
  let editorStyle = doc.querySelector('style[data-mg-node-editor]') as HTMLStyleElement | null;
  if (!editorStyle) {
    editorStyle = doc.createElement('style');
    editorStyle.dataset.mgNodeEditor = 'true';
    doc.head.appendChild(editorStyle);
  }

  editorStyle.textContent = `
    html {
      background: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      color: #1e293b;
      height: 100%;
    }
    body {
      box-sizing: border-box;
      width: ${isFluid ? '100%' : '816px'};
      min-height: ${isFluid ? '100%' : '1056px'};
      margin: ${isFluid ? '0' : '28px auto'};
      padding: ${isFluid ? '32px 48px' : '64px 72px'};
      background: #ffffff;
      color: #1e293b;
      box-shadow: ${isFluid ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.08)'};
      outline: none;
      line-height: 1.75;
      font-size: 14.5px;
      word-break: break-word;
      transition: width 0.15s ease, padding 0.15s ease;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      min-width: 48px;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 600;
      text-align: left;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      margin: 10px 0;
      display: inline-block;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
    }
    blockquote {
      border-left: 4px solid #10b981;
      background: #f0fdf4;
      padding: 8px 16px;
      margin: 12px 0;
      color: #334155;
      border-radius: 0 6px 6px 0;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #f1f5f9;
      padding: 2px 5px;
      border-radius: 4px;
      font-size: 12.5px;
      color: #0f172a;
    }
    h1, h2, h3, h4 {
      font-weight: 700;
      line-height: 1.35;
      margin: 20px 0 10px;
      color: #0f172a;
    }
    h1 { font-size: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 20px; }
    h3 { font-size: 16px; }
    h4 { font-size: 14.5px; }
    hr {
      border: 0;
      border-top: 1px solid #cbd5e1;
      margin: 16px 0;
    }
    ul, ol {
      padding-left: 24px;
      margin: 8px 0;
    }
    li {
      margin: 4px 0;
    }
    a {
      color: #0284c7;
      text-decoration: underline;
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
  const savedRangeRef = useRef<Range | null>(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onContentChange);

  // Format Painter data reference
  const formatBrushDataRef = useRef<{
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    color?: string;
    backgroundColor?: string;
    tagName?: string;
  } | null>(null);

  const [isFluidView, setIsFluidView] = useState(false);
  const [srcDoc] = useState(() => sanitizeDocumentHtml(initialHtml, false));
  const [saveStatus, setSaveStatus] = useState('已保存');

  // Popover state
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showSizeMenu, setShowSizeMenu] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  const [isFormatBrushActive, setIsFormatBrushActive] = useState(false);

  const [currentFontLabel, setCurrentFontLabel] = useState('默认字体');
  const [currentSizeLabel, setCurrentSizeLabel] = useState('14px');
  const [currentBlockLabel, setCurrentBlockLabel] = useState('正文');

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onContentChange;
  }, [onSave, onContentChange]);

  const closeAllMenus = () => {
    setShowFontMenu(false);
    setShowSizeMenu(false);
    setShowBlockMenu(false);
    setShowColorPalette(false);
    setShowHighlightPalette(false);
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleDocumentClick = () => closeAllMenus();
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Selection preservation
  const updateSavedSelection = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc || !savedRangeRef.current) return;
    const sel = doc.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const saveLatest = async () => {
    const html = latestHtmlRef.current;
    if (!html || html === savedHtmlRef.current || loadError) return;
    setSaveStatus('正在保存…');
    try {
      await onSaveRef.current(html);
      savedHtmlRef.current = html;
      if (latestHtmlRef.current === html) {
        dirtyRef.current = false;
        setSaveStatus('已保存');
      }
    } catch (error) {
      setSaveStatus(`保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (dirtyRef.current) void saveLatest();
    };
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
    saveTimeoutRef.current = setTimeout(() => void saveLatest(), 600);
  };

  // Toggle fluid / paper view without reloading iframe DOM
  const handleToggleViewMode = () => {
    const nextFluid = !isFluidView;
    setIsFluidView(nextFluid);
    const body = iframeRef.current?.contentDocument?.body;
    if (body) {
      body.style.width = nextFluid ? '100%' : '816px';
      body.style.margin = nextFluid ? '0' : '28px auto';
      body.style.padding = nextFluid ? '32px 48px' : '64px 72px';
      body.style.boxShadow = nextFluid ? 'none' : '0 4px 24px rgba(0, 0, 0, 0.08)';
    }
  };

  const handleFrameLoad = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.body.contentEditable = 'true';
    doc.body.spellcheck = false;

    // Enable CSS styles instead of legacy HTML tags
    try {
      doc.execCommand('styleWithCSS', false, 'true');
    } catch (_) {}

    // Track user input
    doc.body.addEventListener('input', captureEdits);

    // Track selection changes while document has focus
    const handleSelectionUpdate = () => {
      if (doc.hasFocus()) {
        updateSavedSelection();
      }
    };
    doc.addEventListener('selectionchange', handleSelectionUpdate);
    doc.body.addEventListener('mouseup', () => {
      updateSavedSelection();

      // If format painter is active, apply the captured styles to the newly selected text
      if (formatBrushDataRef.current) {
        const style = formatBrushDataRef.current;
        const sel = doc.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          if (style.fontFamily) handleApplyFontFamily(style.fontFamily);
          if (style.fontSize) handleApplyFontSize(style.fontSize);
          if (style.color) doc.execCommand('foreColor', false, style.color);
          if (style.backgroundColor && style.backgroundColor !== 'transparent') {
            doc.execCommand('hiliteColor', false, style.backgroundColor);
          }
          if (style.fontWeight === 'bold' || style.fontWeight === '700' || Number(style.fontWeight) >= 600) {
            doc.execCommand('bold', false);
          }
          if (style.fontStyle === 'italic') {
            doc.execCommand('italic', false);
          }
          if (style.textDecoration?.includes('underline')) {
            doc.execCommand('underline', false);
          }
          if (style.textDecoration?.includes('line-through')) {
            doc.execCommand('strikeThrough', false);
          }
          if (style.tagName && ['h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(style.tagName)) {
            handleApplyBlockFormat(style.tagName);
          }
          captureEdits();
        }
        // Turn off format painter after application
        formatBrushDataRef.current = null;
        setIsFormatBrushActive(false);
        if (doc.body) doc.body.style.cursor = 'auto';
      }
    });

    doc.body.addEventListener('keyup', handleSelectionUpdate);

    // Close React toolbar menus on clicking document canvas
    doc.body.addEventListener('mousedown', () => {
      closeAllMenus();
    });

    // Prevent navigation on clicking links in edit mode
    doc.body.addEventListener('click', (event) => {
      const link = (event.target as HTMLElement).closest('a');
      if (link) {
        event.preventDefault();
      }
    });

    // Paste handler for images and clipboard rich text
    doc.body.addEventListener('paste', (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      let imageFile: File | null = null;
      if (clipboardData.items) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          if (clipboardData.items[i].type.startsWith('image/')) {
            imageFile = clipboardData.items[i].getAsFile();
            if (imageFile) break;
          }
        }
      }
      if (!imageFile && clipboardData.files) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          if (clipboardData.files[i].type.startsWith('image/')) {
            imageFile = clipboardData.files[i];
            break;
          }
        }
      }

      if (imageFile) {
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = (loadEvent) => {
          const dataUrl = loadEvent.target?.result as string;
          if (dataUrl) {
            restoreSelection();
            doc.execCommand(
              'insertHTML',
              false,
              `<p><img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; display: inline-block;" alt="Pasted Image" /></p><p><br></p>`
            );
            updateSavedSelection();
            captureEdits();
          }
        };
        reader.readAsDataURL(imageFile);
        return;
      }

      setTimeout(captureEdits, 30);
    });

    // Drag-and-drop image support
    doc.body.addEventListener('dragover', (event) => event.preventDefault());
    doc.body.addEventListener('drop', (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          if (files[i].type.startsWith('image/')) {
            event.preventDefault();
            const reader = new FileReader();
            reader.onload = (loadEvent) => {
              const dataUrl = loadEvent.target?.result as string;
              if (dataUrl) {
                doc.execCommand(
                  'insertHTML',
                  false,
                  `<p><img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; display: inline-block;" alt="Image" /></p><p><br></p>`
                );
                updateSavedSelection();
                captureEdits();
              }
            };
            reader.readAsDataURL(files[i]);
            return;
          }
        }
      }
    });

    latestHtmlRef.current = sanitizeDocumentHtml(doc.documentElement.outerHTML, isFluidView);
    savedHtmlRef.current = latestHtmlRef.current;
  };

  // Execute standard formatting commands on restored selection
  const execute = (command: string, value: string = '') => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    restoreSelection();
    doc.body.focus();
    try {
      doc.execCommand('styleWithCSS', false, 'true');
    } catch (_) {}
    doc.execCommand(command, false, value);
    updateSavedSelection();
    captureEdits();
  };

  // 1. Apply Font Family
  const handleApplyFontFamily = (fontValue: string, fontLabel?: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    restoreSelection();
    doc.body.focus();
    try {
      doc.execCommand('styleWithCSS', false, 'true');
    } catch (_) {}
    doc.execCommand('fontName', false, fontValue);

    // Ensure all font tags or newly wrapped elements have inline font-family
    doc.querySelectorAll(`font[face="${fontValue}"]`).forEach((el) => {
      (el as HTMLElement).style.fontFamily = fontValue;
      el.removeAttribute('face');
    });

    if (fontLabel) setCurrentFontLabel(fontLabel);
    setShowFontMenu(false);
    updateSavedSelection();
    captureEdits();
  };

  // 2. Apply Font Size
  const handleApplyFontSize = (sizePx: string, sizeLabel?: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    restoreSelection();
    doc.body.focus();
    try {
      doc.execCommand('styleWithCSS', false, 'true');
    } catch (_) {}

    // Use fontSize 7 as a unique placeholder, then replace with exact CSS pixel size
    doc.execCommand('fontSize', false, '7');
    const placeholders = doc.querySelectorAll('font[size="7"], span[style*="xxx-large"], span[style*="-webkit-xxx-large"]');
    placeholders.forEach((el) => {
      const htmlEl = el as HTMLElement;
      htmlEl.removeAttribute('size');
      htmlEl.style.fontSize = sizePx;
      htmlEl.style.lineHeight = '1.45';
    });

    if (sizeLabel) setCurrentSizeLabel(sizeLabel);
    setShowSizeMenu(false);
    updateSavedSelection();
    captureEdits();
  };

  // 3. Apply Block Style (Paragraph, H1-H4, Blockquote, Pre)
  const handleApplyBlockFormat = (tag: string, label?: string) => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    restoreSelection();
    doc.body.focus();

    const cleanTag = tag.toLowerCase();
    try {
      doc.execCommand('formatBlock', false, `<${cleanTag}>`);
    } catch (_) {
      try {
        doc.execCommand('formatBlock', false, cleanTag);
      } catch (_) {}
    }

    // Secondary assurance: if selection is across a block, transform the enclosing block element
    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      let blockNode: Node | null = sel.getRangeAt(0).startContainer;
      while (
        blockNode &&
        blockNode !== doc.body &&
        !['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'PRE'].includes((blockNode as Element).tagName || '')
      ) {
        blockNode = blockNode.parentNode;
      }
      if (blockNode && blockNode !== doc.body && (blockNode as Element).tagName?.toLowerCase() !== cleanTag) {
        const newElem = doc.createElement(cleanTag);
        newElem.innerHTML = (blockNode as Element).innerHTML;
        blockNode.parentNode?.replaceChild(newElem, blockNode);
        const newRange = doc.createRange();
        newRange.selectNodeContents(newElem);
        sel.removeAllRanges();
        sel.addRange(newRange);
      }
    }

    if (label) setCurrentBlockLabel(label);
    setShowBlockMenu(false);
    updateSavedSelection();
    captureEdits();
  };

  // 4. Insert Horizontal Rule exactly below the current cursor line
  const handleInsertHorizontalRule = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    restoreSelection();
    doc.body.focus();

    const sel = doc.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      let blockNode: Node | null = range.startContainer;
      while (
        blockNode &&
        blockNode !== doc.body &&
        !['P', 'H1', 'H2', 'H3', 'H4', 'DIV', 'BLOCKQUOTE', 'PRE', 'TABLE', 'UL', 'OL', 'LI'].includes(
          (blockNode as Element).tagName || ''
        )
      ) {
        blockNode = blockNode.parentNode;
      }

      const hr = doc.createElement('hr');
      hr.style.border = '0';
      hr.style.borderTop = '1px solid #cbd5e1';
      hr.style.margin = '16px 0';

      const newP = doc.createElement('p');
      newP.innerHTML = '<br>';

      if (blockNode && blockNode !== doc.body && blockNode.parentNode) {
        // Insert right after current cursor block line
        blockNode.parentNode.insertBefore(hr, blockNode.nextSibling);
        blockNode.parentNode.insertBefore(newP, hr.nextSibling);
      } else {
        range.collapse(false);
        range.insertNode(hr);
        range.insertNode(newP);
      }

      // Position cursor in the new paragraph below the HR line
      const newRange = doc.createRange();
      newRange.setStart(newP, 0);
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);
    } else {
      doc.execCommand('insertHorizontalRule');
    }

    updateSavedSelection();
    captureEdits();
  };

  // 5. Clear Formatting completely (both HTML tags and inline CSS styles)
  const handleClearFormat = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    restoreSelection();
    doc.body.focus();

    const sel = doc.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

    // 1. Run native removeFormat & unlink
    doc.execCommand('removeFormat', false, '');
    doc.execCommand('unlink', false, '');

    // 2. Strip all inline styles, font sizes, colors, and reset headings to normal <p>
    const range = sel.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    const container = (commonAncestor.nodeType === 1 ? commonAncestor : commonAncestor.parentNode) as HTMLElement;

    if (container) {
      const allElements = container.querySelectorAll('*');
      allElements.forEach((el) => {
        if (sel.containsNode(el, true)) {
          const htmlEl = el as HTMLElement;
          htmlEl.removeAttribute('style');
          htmlEl.removeAttribute('color');
          htmlEl.removeAttribute('face');
          htmlEl.removeAttribute('size');
          if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(htmlEl.tagName)) {
            const p = doc.createElement('p');
            p.innerHTML = htmlEl.innerHTML;
            htmlEl.parentNode?.replaceChild(p, htmlEl);
          }
        }
      });

      if (container !== doc.body && sel.containsNode(container, true)) {
        container.removeAttribute('style');
        container.removeAttribute('color');
        container.removeAttribute('face');
        container.removeAttribute('size');
        if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(container.tagName)) {
          const p = doc.createElement('p');
          p.innerHTML = container.innerHTML;
          container.parentNode?.replaceChild(p, container);
        }
      }
    }

    updateSavedSelection();
    captureEdits();
  };

  // 6. Format Painter (格式刷)
  const handleToggleFormatBrush = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    if (isFormatBrushActive) {
      // Deactivate
      setIsFormatBrushActive(false);
      formatBrushDataRef.current = null;
      doc.body.style.cursor = 'auto';
      return;
    }

    restoreSelection();
    const sel = doc.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    const element = (node.nodeType === 1 ? node : node.parentElement) as HTMLElement | null;

    if (element) {
      const computed = doc.defaultView?.getComputedStyle(element);
      formatBrushDataRef.current = {
        fontFamily: element.style.fontFamily || computed?.fontFamily || '',
        fontSize: element.style.fontSize || computed?.fontSize || '',
        fontWeight: element.style.fontWeight || computed?.fontWeight || '',
        fontStyle: element.style.fontStyle || computed?.fontStyle || '',
        textDecoration: element.style.textDecoration || computed?.textDecorationLine || '',
        color: element.style.color || computed?.color || '',
        backgroundColor:
          element.style.backgroundColor ||
          (computed?.backgroundColor !== 'rgba(0, 0, 0, 0)' ? computed?.backgroundColor || '' : ''),
        tagName: element.tagName.toLowerCase(),
      };
      setIsFormatBrushActive(true);
      doc.body.style.cursor = 'crosshair';
    }
  };

  // Table Handlers
  const handleInsertTable = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const tableHtml = `
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 600; text-align: left;">标题 1</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 600; text-align: left;">标题 2</th>
            <th style="border: 1px solid #cbd5e1; padding: 8px 12px; font-weight: 600; text-align: left;">标题 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">单元格 1</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">单元格 2</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">单元格 3</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">单元格 4</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">单元格 5</td>
            <td style="border: 1px solid #cbd5e1; padding: 8px 12px;">单元格 6</td>
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
      newCell.style.border = '1px solid #cbd5e1';
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
      newCell.style.border = '1px solid #cbd5e1';
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

  const handleDeleteTableCol = () => {
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
      if (row.cells[colIndex]) {
        row.deleteCell(colIndex);
      }
    }
    captureEdits();
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
        execute(
          'insertHTML',
          `<p><img src="${dataUrl}" style="max-width: 100%; height: auto; border-radius: 6px; margin: 10px 0; display: inline-block;" alt="Image" /></p><p><br></p>`
        );
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleInsertLink = () => {
    const url = window.prompt('请输入超链接 URL (例如 https://example.com):', 'https://');
    if (url && url !== 'https://') {
      execute('createLink', url);
    }
  };

  const handleInsertDateTime = () => {
    const now = new Date();
    const formatted = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    execute('insertHTML', `<span>${formatted}</span>&nbsp;`);
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
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 flex items-center gap-1">
            <FileText size={12} />
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
          {/* View Mode Switcher */}
          <button
            type="button"
            onClick={handleToggleViewMode}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title={isFluidView ? '切换为 A4 纸张拟真视图' : '切换为无界流式全宽页面'}
          >
            {isFluidView ? <FileText size={13} /> : <Monitor size={13} />}
            <span>{isFluidView ? 'A4 纸张' : '流式全宽'}</span>
          </button>

          <button
            type="button"
            onClick={() => void saveLatest()}
            className="flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors cursor-pointer"
            title="立即保存到本地仓库并准备同步"
          >
            <Save size={13} />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* Comprehensive Word Ribbon Toolbar (with custom non-blur dropdown popovers) */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto select-none text-xs"
        onMouseDown={(e) => {
          // Prevent transferring focus away from iframe document!
          e.preventDefault();
        }}
      >
        {/* Group 1: 撤销 / 重做 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('undo')}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="撤销 (⌘Z)"
          >
            <Undo size={14} />
          </button>
          <button
            type="button"
            onClick={() => execute('redo')}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="重做 (⌘⇧Z)"
          >
            <Redo size={14} />
          </button>
        </div>

        {/* Group 2: 格式刷 (Format Painter) */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5">
          <button
            type="button"
            onClick={handleToggleFormatBrush}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 font-medium transition-colors ${
              isFormatBrushActive
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
            title={
              isFormatBrushActive
                ? '格式刷已激活：请在文档中划选文字以套用格式（再次点击取消）'
                : '格式刷：先选中带有样式的文字，点击本按钮，再去划选目标文字即可快速套用格式'
            }
          >
            <Paintbrush size={13} />
            <span>格式刷</span>
          </button>
        </div>

        {/* Group 3: 字体系列 (Custom Non-Blur Dropdown) */}
        <div className="relative flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowFontMenu((p) => !p);
              setShowSizeMenu(false);
              setShowBlockMenu(false);
              setShowColorPalette(false);
              setShowHighlightPalette(false);
            }}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 max-w-[110px]"
            title="选择字体系列"
          >
            <span className="truncate">{currentFontLabel}</span>
            <ChevronDown size={11} className="text-slate-400 shrink-0" />
          </button>

          {showFontMenu && (
            <div
              className="absolute top-full left-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 max-h-64 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {FONT_FAMILIES.map((font) => (
                <button
                  key={font.label}
                  type="button"
                  onClick={() => handleApplyFontFamily(font.value, font.label)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center justify-between"
                  style={{ fontFamily: font.value }}
                >
                  <span>{font.label}</span>
                  {currentFontLabel === font.label && <CheckIcon size={12} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Group 4: 字号 (Custom Non-Blur Dropdown) */}
        <div className="relative flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSizeMenu((p) => !p);
              setShowFontMenu(false);
              setShowBlockMenu(false);
              setShowColorPalette(false);
              setShowHighlightPalette(false);
            }}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 min-w-[70px]"
            title="选择文字大小"
          >
            <span>{currentSizeLabel}</span>
            <ChevronDown size={11} className="text-slate-400 shrink-0" />
          </button>

          {showSizeMenu && (
            <div
              className="absolute top-full left-0 mt-1 w-36 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1 max-h-64 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {FONT_SIZES.map((size) => (
                <button
                  key={size.label}
                  type="button"
                  onClick={() => handleApplyFontSize(size.value, size.label.split(' ')[0])}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center justify-between"
                >
                  <span>{size.label}</span>
                  {currentSizeLabel.startsWith(size.value) && <CheckIcon size={12} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Group 5: 段落层级 / 标题样式 (Custom Non-Blur Dropdown) */}
        <div className="relative flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowBlockMenu((p) => !p);
              setShowFontMenu(false);
              setShowSizeMenu(false);
              setShowColorPalette(false);
              setShowHighlightPalette(false);
            }}
            className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 min-w-[85px]"
            title="段落与标题样式"
          >
            <span className="truncate">{currentBlockLabel}</span>
            <ChevronDown size={11} className="text-slate-400 shrink-0" />
          </button>

          {showBlockMenu && (
            <div
              className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 py-1"
              onMouseDown={(e) => e.preventDefault()}
            >
              {BLOCK_STYLES.map((block) => (
                <button
                  key={block.tag}
                  type="button"
                  onClick={() => handleApplyBlockFormat(block.tag, block.label)}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors flex items-center justify-between"
                >
                  <span>{block.label}</span>
                  {currentBlockLabel === block.label && <CheckIcon size={12} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Group 6: 字符样式 (加粗, 斜体, 下划线, 删除线, 下标, 上标) */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('bold')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold"
            title="加粗 (⌘B)"
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('italic')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="斜体 (⌘I)"
          >
            <Italic size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('underline')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="下划线 (⌘U)"
          >
            <Underline size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('strikeThrough')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="删除线"
          >
            <Strikethrough size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('subscript')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="下标 (X₂)"
          >
            <Subscript size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('superscript')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="上标 (X²)"
          >
            <Superscript size={13} />
          </button>
        </div>

        {/* Group 7: 字体颜色与荧光高亮底色 */}
        <div className="relative flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-1">
          {/* Font Color */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPalette((p) => !p);
                setShowHighlightPalette(false);
                setShowFontMenu(false);
                setShowSizeMenu(false);
                setShowBlockMenu(false);
              }}
              className="px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-0.5"
              title="设置文字颜色"
            >
              <span className="font-bold text-[13px] leading-none">A</span>
              <div className="w-2.5 h-1 bg-red-500 rounded-xs mt-1" />
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {showColorPalette && (
              <div
                className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 grid grid-cols-5 gap-1.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {[
                  '#0f172a', '#475569', '#ef4444', '#f97316', '#eab308',
                  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      execute('foreColor', color);
                      setShowColorPalette(false);
                    }}
                    className="w-5 h-5 rounded-full border border-black/10 hover:scale-115 transition-transform"
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
              onClick={(e) => {
                e.stopPropagation();
                setShowHighlightPalette((p) => !p);
                setShowColorPalette(false);
                setShowFontMenu(false);
                setShowSizeMenu(false);
                setShowBlockMenu(false);
              }}
              className="px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-0.5"
              title="设置文本荧光高亮底色"
            >
              <HighlighterIcon size={13} className="text-amber-500" />
              <div className="w-2.5 h-1 bg-yellow-400 rounded-xs mt-1" />
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {showHighlightPalette && (
              <div
                className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 flex gap-1.5"
                onMouseDown={(e) => e.preventDefault()}
              >
                {[
                  { label: '清除高亮', color: 'transparent' },
                  { label: '荧光黄', color: '#fef08a' },
                  { label: '清爽绿', color: '#bbf7d0' },
                  { label: '晴空蓝', color: '#bae6fd' },
                  { label: '樱花粉', color: '#fbcfe8' },
                  { label: '暖阳橙', color: '#fed7aa' },
                  { label: '淡紫', color: '#e9d5ff' },
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => {
                      execute('hiliteColor', item.color);
                      setShowHighlightPalette(false);
                    }}
                    className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-115 transition-transform flex items-center justify-center text-[9px]"
                    style={{ background: item.color }}
                    title={item.label}
                  >
                    {item.color === 'transparent' ? <CloseIcon size={10} className="text-slate-400" /> : ''}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Group 8: 对齐与缩进 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('justifyLeft')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="左对齐"
          >
            <AlignLeft size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('justifyCenter')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="居中对齐"
          >
            <AlignCenter size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('justifyRight')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="右对齐"
          >
            <AlignRight size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('justifyFull')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="两端对齐"
          >
            <AlignJustify size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('outdent')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="减少缩进"
          >
            <Outdent size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('indent')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="增加缩进"
          >
            <Indent size={13} />
          </button>
        </div>

        {/* Group 9: 列表 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => execute('insertUnorderedList')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="无序列表 (项目符号)"
          >
            <List size={13} />
          </button>
          <button
            type="button"
            onClick={() => execute('insertOrderedList')}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="有序列表 (数字编号)"
          >
            <ListOrdered size={13} />
          </button>
        </div>

        {/* Group 10: 表格套件 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={handleInsertTable}
            className="px-1.5 py-0.5 rounded hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1"
            title="插入标准 3×3 表格"
          >
            <Table size={13} />
            <span>表格</span>
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
            title="删除光标所在的行"
          >
            -行
          </button>
          <button
            type="button"
            onClick={handleDeleteTableCol}
            className="px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-[11px]"
            title="删除光标所在的列"
          >
            -列
          </button>
          <button
            type="button"
            onClick={handleDeleteTable}
            className="px-1 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 text-[11px]"
            title="删除整个表格"
          >
            删表
          </button>
        </div>

        {/* Group 11: 插入图片、超链接、精确水平分割线、日期 */}
        <div className="flex items-center border-r border-slate-200 dark:border-slate-800 pr-1.5 gap-0.5">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1 font-medium"
            title="插入本地图片（亦可直接截图在文档中粘贴 ⌘V）"
          >
            <ImageIcon size={13} />
            <span>图片</span>
          </button>
          <button
            type="button"
            onClick={handleInsertLink}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="插入超链接"
          >
            <LinkIcon size={13} />
          </button>
          <button
            type="button"
            onClick={handleInsertHorizontalRule}
            className="px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center gap-1"
            title="在当前光标行正下方插入分割线"
          >
            <Minus size={13} />
            <span>分割线</span>
          </button>
          <button
            type="button"
            onClick={handleInsertDateTime}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
            title="插入当前日期时间"
          >
            <Calendar size={13} />
          </button>
        </div>

        {/* Group 12: 彻底清除格式 */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleClearFormat}
            className="px-2 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-slate-600 hover:text-red-600 dark:text-slate-300 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
            title="清除选中区域的所有样式（字体、字号、颜色、背景、标题全部还原为纯正文）"
          >
            <RemoveFormatting size={13} />
            <span>清除格式</span>
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      {loadError ? (
        <div className="docx-editor-error m-auto p-8 text-center text-red-600 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 flex items-center justify-center gap-2">
          <AlertTriangleIcon size={18} className="text-red-500 flex-shrink-0" />
          <span>无法在应用内读取此文档：{loadError}</span>
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

      {/* Bottom Status & Feature Hint */}
      <div className="px-4 py-1.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[11px] text-slate-400 flex items-center justify-between select-none">
        <span className="flex items-center gap-1.5">
          <InfoCircleIcon size={13} className="text-amber-500" />
          <span>选中文字后点击工具栏可即时改变字体/字号；使用「格式刷」划选文字快速套用样式；点击「清除格式」可一键彻底还原纯正文。</span>
        </span>
        <span className="font-mono text-emerald-600 dark:text-emerald-400">
          mg-node Word Mode
        </span>
      </div>
    </div>
  );
};
