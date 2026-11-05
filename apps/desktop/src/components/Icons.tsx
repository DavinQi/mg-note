import React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  className?: string;
}

// -------------------------------------------------------------
// 1. Folders & Directories
// -------------------------------------------------------------

/** 闭合文件夹图标 (暖琥珀色 Mac 拟真质感) */
export const FolderIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M2.5 5.5C2.5 4.39543 3.39543 3.5 4.5 3.5H7.79289C8.32332 3.5 8.83207 3.71071 9.20711 4.08579L10.4142 5.29289C10.7893 5.66793 11.298 5.87868 11.8284 5.87868H15.5C16.6046 5.87868 17.5 6.77325 17.5 7.87868V14.5C17.5 15.6046 16.6046 16.5 15.5 16.5H4.5C3.39543 16.5 2.5 15.6046 2.5 14.5V5.5Z"
      fill="#F59E0B"
    />
    <path
      d="M2.5 8C2.5 6.89543 3.39543 6 4.5 6H15.5C16.6046 6 17.5 6.89543 17.5 8V14.5C17.5 15.6046 16.6046 16.5 15.5 16.5H4.5C3.39543 16.5 2.5 15.6046 2.5 14.5V8Z"
      fill="#FBBF24"
    />
    <path
      d="M4.5 6.75H15.5C16.1904 6.75 16.75 7.30964 16.75 8V8.25H3.25V8C3.25 7.30964 3.80964 6.75 4.5 6.75Z"
      fill="#FDE68A"
      fillOpacity="0.6"
    />
  </svg>
);

/** 展开文件夹图标 (打开状态，可见内部文件纸片) */
export const FolderOpenIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    {/* Folder back */}
    <path
      d="M2.5 5.5C2.5 4.39543 3.39543 3.5 4.5 3.5H7.79289C8.32332 3.5 8.83207 3.71071 9.20711 4.08579L10.4142 5.29289C10.7893 5.66793 11.298 5.87868 11.8284 5.87868H15.5C16.6046 5.87868 17.5 6.77325 17.5 7.87868V14C17.5 15.1046 16.6046 16 15.5 16H4.5C3.39543 16 2.5 15.1046 2.5 14V5.5Z"
      fill="#D97706"
    />
    {/* Inner Paper sheets */}
    <rect x="5" y="5" width="10" height="7" rx="1" fill="#FFFFFF" fillOpacity="0.9" />
    <line x1="7" y1="7.5" x2="12" y2="7.5" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" />
    <line x1="7" y1="9.5" x2="10" y2="9.5" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" />
    {/* Folder front flap opened */}
    <path
      d="M2.2 9.2C2.35 8.5 2.95 8 3.7 8H16.3C17.05 8 17.65 8.5 17.8 9.2L18.8 14.2C19 15.2 18.2 16 17.2 16H2.8C1.8 16 1 15.2 1.2 14.2L2.2 9.2Z"
      fill="#FBBF24"
    />
  </svg>
);

/** 根目录 / 仓库保险库图标 (Root Directory / Vault) */
export const RootFolderIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="3" y="4" width="14" height="12" rx="2.5" fill="#475569" />
    <rect x="4.5" y="5.5" width="11" height="9" rx="1.5" fill="#1E293B" />
    <circle cx="10" cy="10" r="2.5" stroke="#94A3B8" strokeWidth="1.2" />
    <circle cx="10" cy="10" r="1" fill="#38BDF8" />
    <line x1="10" y1="6" x2="10" y2="7.5" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
    <line x1="10" y1="12.5" x2="10" y2="14" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
    <line x1="6" y1="10" x2="7.5" y2="10" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
    <line x1="12.5" y1="10" x2="14" y2="10" stroke="#94A3B8" strokeWidth="1" strokeLinecap="round" />
  </svg>
);

/** 新建文件夹图标 (带 + 号) */
export const FolderPlusIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M2.5 5.5C2.5 4.39543 3.39543 3.5 4.5 3.5H7.79289C8.32332 3.5 8.83207 3.71071 9.20711 4.08579L10.4142 5.29289C10.7893 5.66793 11.298 5.87868 11.8284 5.87868H15.5C16.6046 5.87868 17.5 6.77325 17.5 7.87868V14.5C17.5 15.6046 16.6046 16.5 15.5 16.5H4.5C3.39543 16.5 2.5 15.6046 2.5 14.5V5.5Z"
      fill="#F59E0B"
    />
    <path
      d="M2.5 8C2.5 6.89543 3.39543 6 4.5 6H15.5C16.6046 6 17.5 6.89543 17.5 8V14.5C17.5 15.6046 16.6046 16.5 15.5 16.5H4.5C3.39543 16.5 2.5 15.6046 2.5 14.5V8Z"
      fill="#FBBF24"
    />
    {/* Plus circle */}
    <circle cx="13" cy="11.5" r="3.5" fill="#059669" />
    <path d="M13 9.8V13.2M11.3 11.5H14.7" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

// -------------------------------------------------------------
// 2. File Formats & Documents
// -------------------------------------------------------------

/** Markdown 文件图标 (经典 M↓ 标识与薄荷绿/深青微质感) */
export const MarkdownIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2.5" y="3" width="15" height="14" rx="2.5" fill="#047857" />
    {/* M symbol */}
    <path
      d="M5.5 13V7H7.2L9 9.5L10.8 7H12.5V13H11V9.2L9.5 11.2H8.5L7 9.2V13H5.5Z"
      fill="#FFFFFF"
    />
    {/* Down arrow */}
    <path
      d="M14.5 7V10.8H16L13.8 13.2L11.6 10.8H13.1V7H14.5Z"
      fill="#6EE7B7"
    />
  </svg>
);

/** Word / DOCX 文档图标 (微软蓝 + 醒目 'W') */
export const DocxIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    {/* Paper outline */}
    <path
      d="M4 3.5C4 2.67157 4.67157 2 5.5 2H12.5L16.5 6V16.5C16.5 17.3284 15.8284 18 15 18H5.5C4.67157 18 4 17.3284 4 16.5V3.5Z"
      fill="#2563EB"
    />
    {/* Fold corner */}
    <path d="M12.5 2V5.5C12.5 5.77614 12.7239 6 13 6H16.5L12.5 2Z" fill="#93C5FD" />
    {/* W letter */}
    <path
      d="M6.2 8H7.7L8.8 12.4L10 8H11.2L12.4 12.4L13.5 8H15L13.2 14H11.7L10.6 9.8L9.5 14H8L6.2 8Z"
      fill="#FFFFFF"
    />
  </svg>
);

/** PDF 文档图标 (Adobe 经典绯红 + 折角与 PDF 标识) */
export const PdfIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M4 3.5C4 2.67157 4.67157 2 5.5 2H12.5L16.5 6V16.5C16.5 17.3284 15.8284 18 15 18H5.5C4.67157 18 4 17.3284 4 16.5V3.5Z"
      fill="#DC2626"
    />
    <path d="M12.5 2V5.5C12.5 5.77614 12.7239 6 13 6H16.5L12.5 2Z" fill="#FCA5A5" />
    {/* PDF text */}
    <text
      x="10.2"
      y="13.2"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="5.2"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="-0.3"
    >
      PDF
    </text>
  </svg>
);

/** HTML5 / 富文本图标 (亮橙色 + 代码尖括号 </>) */
export const HtmlIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M4 3.5C4 2.67157 4.67157 2 5.5 2H12.5L16.5 6V16.5C16.5 17.3284 15.8284 18 15 18H5.5C4.67157 18 4 17.3284 4 16.5V3.5Z"
      fill="#EA580C"
    />
    <path d="M12.5 2V5.5C12.5 5.77614 12.7239 6 13 6H16.5L12.5 2Z" fill="#FDBA74" />
    {/* Code brackets </> */}
    <path
      d="M8.2 8.5L6.5 10.5L8.2 12.5M12.8 8.5L14.5 10.5L12.8 12.5M11.2 8L9.8 13"
      stroke="#FFFFFF"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** PPTX / 幻灯片图标 (珊瑚橙 + 饼图/幻灯片) */
export const PptxIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M4 3.5C4 2.67157 4.67157 2 5.5 2H12.5L16.5 6V16.5C16.5 17.3284 15.8284 18 15 18H5.5C4.67157 18 4 17.3284 4 16.5V3.5Z"
      fill="#D97706"
    />
    <path d="M12.5 2V5.5C12.5 5.77614 12.7239 6 13 6H16.5L12.5 2Z" fill="#FDE68A" />
    {/* Presentation icon */}
    <text
      x="10.2"
      y="13"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="5.2"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      PPT
    </text>
  </svg>
);

/** 纯文本 / TXT 图标 (中性石板灰 + 横线文本行) */
export const TextIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M4 3.5C4 2.67157 4.67157 2 5.5 2H12.5L16.5 6V16.5C16.5 17.3284 15.8284 18 15 18H5.5C4.67157 18 4 17.3284 4 16.5V3.5Z"
      fill="#64748B"
    />
    <path d="M12.5 2V5.5C12.5 5.77614 12.7239 6 13 6H16.5L12.5 2Z" fill="#CBD5E1" />
    <line x1="7" y1="9" x2="13" y2="9" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="7" y1="11.5" x2="13" y2="11.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="7" y1="14" x2="10.5" y2="14" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/** 通用笔记/文件图标 (New Note / Generic File) */
export const FileGenericIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M4.5 3C3.67157 3 3 3.67157 3 4.5V15.5C3 16.3284 3.67157 17 4.5 17H15.5C16.3284 17 17 16.3284 17 15.5V7L13 3H4.5Z"
      fill="#F1F5F9"
      stroke="#CBD5E1"
      strokeWidth="1.2"
    />
    <path d="M13 3V7H17" fill="#E2E8F0" />
    <line x1="6" y1="9.5" x2="14" y2="9.5" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="6" y1="12" x2="12" y2="12" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="6" y1="14.5" x2="10" y2="14.5" stroke="#94A3B8" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/** 新建文件图标 (带绿色加号) */
export const FilePlusIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M4.5 3C3.67157 3 3 3.67157 3 4.5V15.5C3 16.3284 3.67157 17 4.5 17H11.5V15H5V5H12V8.5H15.5V11.5H17.5V7L13 3H4.5Z"
      fill="#059669"
    />
    <circle cx="14.5" cy="14.5" r="4" fill="#10B981" />
    <path d="M14.5 12.5V16.5M12.5 14.5H16.5" stroke="#FFFFFF" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/** 根据笔记类型自动返回对应的高保真矢量图标 */
export const NoteFormatIcon: React.FC<{ kind: string; size?: number; className?: string }> = ({
  kind,
  size = 16,
  className = '',
}) => {
  const normalized = (kind || '').toLowerCase().replace(/^\./, '');
  switch (normalized) {
    case 'md':
    case 'markdown':
      return <MarkdownIcon size={size} className={className} />;
    case 'docx':
    case 'doc':
      return <DocxIcon size={size} className={className} />;
    case 'pdf':
      return <PdfIcon size={size} className={className} />;
    case 'html':
    case 'htm':
      return <HtmlIcon size={size} className={className} />;
    case 'pptx':
    case 'ppt':
      return <PptxIcon size={size} className={className} />;
    case 'txt':
    case 'text':
      return <TextIcon size={size} className={className} />;
    default:
      return <FileGenericIcon size={size} className={className} />;
  }
};

// -------------------------------------------------------------
// 3. Action Buttons & UI Controls (新建、同步、导入、移动等)
// -------------------------------------------------------------

/** 优雅的新增加号 + */
export const PlusIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <line x1="8" y1="2.5" x2="8" y2="13.5" />
    <line x1="2.5" y1="8" x2="13.5" y2="8" />
  </svg>
);

/** 优雅的 Git 同步双弧线旋转箭头 (Sync / Refresh) */
export const SyncIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M13.6 7.2A6 6 0 1 0 13.8 10"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <polyline
      points="14.2 4.2 14 7.4 10.8 7.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** 下拉小箭头 Chevron Down */
export const ChevronDownIcon: React.FC<IconProps> = ({ size = 12, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <polyline points="4 6 8 10 12 6" />
  </svg>
);

/** 展开/折叠小箭头 Chevron Right */
export const ChevronRightIcon: React.FC<IconProps> = ({ size = 12, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <polyline points="6 4 10 8 6 12" />
  </svg>
);

/** 导入本地文件图标 (带有下箭头的文档) */
export const FileImportIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="3" y="3" width="14" height="14" rx="3" fill="#EFF6FF" stroke="#3B82F6" strokeWidth="1.2" />
    <path d="M10 6V13M10 13L7.5 10.5M10 13L12.5 10.5" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 导入整个文件夹图标 */
export const FolderImportIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      d="M2.5 5C2.5 4.17 3.17 3.5 4 3.5H7.5L9.5 5.5H16C16.83 5.5 17.5 6.17 17.5 7V14C17.5 14.83 16.83 15.5 16 15.5H4C3.17 15.5 2.5 14.83 2.5 14V5Z"
      fill="#EEF2FF"
      stroke="#6366F1"
      strokeWidth="1.2"
    />
    <path d="M10 7.5V13.5M10 13.5L8 11.5M10 13.5L12 11.5" stroke="#4F46E5" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** 预览眼睛图标 (Eye / Preview) */
export const EyeIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M1.5 8C1.5 8 4 3.5 8 3.5C12 3.5 14.5 8 14.5 8C14.5 8 12 12.5 8 12.5C4 12.5 1.5 8 1.5 8Z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);

/** 双栏分屏图标 (Columns / Split View) */
export const ColumnsIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <line x1="8" y1="2.5" x2="8" y2="13.5" />
  </svg>
);

/** 放大镜搜索图标 (Search) */
export const SearchIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <circle cx="7" cy="7" r="4.5" />
    <line x1="10.5" y1="10.5" x2="14" y2="14" />
  </svg>
);

/** Git 分支图标 (Branch) */
export const GitBranchIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <circle cx="4.5" cy="4" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="4.5" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="11.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M4.5 6V10M4.5 7.5C4.5 9 7.5 8.5 9.5 7.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/** 安全锁 / 私有仓库图标 (Lock) */
export const LockClosedIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="3.5" y="6.5" width="9" height="7" rx="1.5" />
    <path d="M5.5 6.5V4.5C5.5 3.12 6.62 2 8 2C9.38 2 10.5 3.12 10.5 4.5V6.5" />
  </svg>
);

/** 密钥 / Token 图标 (Key) */
export const KeyIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <circle cx="5.5" cy="8" r="3" />
    <path d="M8.5 8H13.5V10.5M11.5 8V10" />
  </svg>
);

/** 调色板 / 个性化主题图标 (Palette) */
export const PaletteIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M8 2C4.69 2 2 4.69 2 8C2 11.31 4.69 14 8 14C8.83 14 9.5 13.33 9.5 12.5C9.5 12.11 9.35 11.76 9.11 11.5C8.87 11.24 8.73 10.89 8.73 10.5C8.73 9.67 9.4 9 10.23 9H11.5C12.88 9 14 7.88 14 6.5C14 4.01 11.31 2 8 2Z" />
    <circle cx="5" cy="6" r="0.8" fill="currentColor" />
    <circle cx="7.5" cy="4.5" r="0.8" fill="currentColor" />
    <circle cx="10.5" cy="5.5" r="0.8" fill="currentColor" />
  </svg>
);

/** 仓库 / 归档盒子图标 (Archive / Repo) */
export const RepositoryIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="3" width="12" height="3" rx="1" />
    <path d="M3 6V12.5C3 13.05 3.45 13.5 4 13.5H12C12.55 13.5 13 13.05 13 12.5V6" />
    <line x1="6.5" y1="8.5" x2="9.5" y2="8.5" />
  </svg>
);

/** 闪烁星芒 (AI Sparkles) */
export const SparklesIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M8 1L9.5 5.5L14 7L9.5 8.5L8 13L6.5 8.5L2 7L6.5 5.5L8 1Z" />
    <path d="M13 11L13.7 13L15.7 13.7L13.7 14.4L13 16.4L12.3 14.4L10.3 13.7L12.3 13L13 11Z" opacity="0.75" />
  </svg>
);

/** 外部应用打开图标 (External Open ↗) */
export const ExternalLinkIcon: React.FC<IconProps> = ({ size = 13, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M12 9V12.5C12 13.33 11.33 14 10.5 14H3.5C2.67 14 2 13.33 2 12.5V5.5C2 4.67 2.67 4 3.5 4H7" />
    <polyline points="9.5 2 14 2 14 6.5" />
    <line x1="6.5" y1="9.5" x2="13.5" y2="2.5" />
  </svg>
);

/** 对勾图标 (Checkmark) */
export const CheckIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <polyline points="3 8.5 6.5 12 13 4.5" />
  </svg>
);

/** 关闭图标 (Cross / Close) */
export const CloseIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <line x1="4" y1="4" x2="12" y2="12" />
    <line x1="12" y1="4" x2="4" y2="12" />
  </svg>
);

/** 警告三角图标 (Alert / Warning) */
export const AlertTriangleIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M7.13 2.5C7.52 1.83 8.48 1.83 8.87 2.5L14.42 12C14.81 12.67 14.33 13.5 13.55 13.5H2.45C1.67 13.5 1.19 12.67 1.58 12L7.13 2.5Z" />
    <line x1="8" y1="6" x2="8" y2="9.5" />
    <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
  </svg>
);

/** 提示信息图标 (Info) */
export const InfoCircleIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <circle cx="8" cy="8" r="6" />
    <line x1="8" y1="7.5" x2="8" y2="11.5" />
    <circle cx="8" cy="5" r="0.6" fill="currentColor" />
  </svg>
);

/** 禁用 / 不可移入图标 (Ban) */
export const BanIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <circle cx="8" cy="8" r="6" />
    <line x1="3.8" y1="3.8" x2="12.2" y2="12.2" />
  </svg>
);

/** 日历模板图标 (Calendar / Daily Note) */
export const CalendarIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
    <line x1="2.5" y1="6.5" x2="13.5" y2="6.5" />
    <line x1="5.5" y1="2" x2="5.5" y2="4.5" />
    <line x1="10.5" y1="2" x2="10.5" y2="4.5" />
    <rect x="5" y="8.5" width="2" height="2" fill="currentColor" />
    <rect x="9" y="8.5" width="2" height="2" fill="currentColor" />
  </svg>
);

/** 人物团队图标 (Users / Meeting Note) */
export const UsersIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <circle cx="6" cy="5" r="2.2" />
    <path d="M2.5 13C2.5 10.8 4 9.5 6 9.5C8 9.5 9.5 10.8 9.5 13" />
    <path d="M10.5 4C11.3 4.3 11.8 5.1 11.8 6C11.8 6.9 11.3 7.7 10.5 8" />
    <path d="M11.5 10C12.8 10.4 13.5 11.5 13.5 13" />
  </svg>
);

/** 扳手工程技术方案图标 (Wrench / Tech Specs) */
export const WrenchIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M13.5 6.2C13.2 4.2 11.7 2.7 9.7 2.4C8.6 2.2 7.5 2.6 6.8 3.3L8.2 4.7L6.8 6.1L5.4 4.7C4.7 5.4 4.3 6.5 4.5 7.6C4.8 9.6 6.3 11.1 8.3 11.4C8.9 11.5 9.5 11.4 10 11.1L12.5 13.6C12.9 14 13.5 14 13.9 13.6C14.3 13.2 14.3 12.6 13.9 12.2L11.4 9.7C12.2 8.8 12.7 7.6 12.5 6.2H13.5Z" />
  </svg>
);

/** 画笔图标 (Pen / Draw) */
export const PencilIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M11.5 2.5L13.5 4.5L5 13H3V11L11.5 2.5Z" />
  </svg>
);

/** 荧光高亮笔图标 (Highlighter) */
export const HighlighterIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M9.5 2.5L13.5 6.5L8.5 11.5L4.5 7.5L9.5 2.5Z" />
    <path d="M4.5 7.5L3 13L8.5 11.5" />
    <line x1="2" y1="14.5" x2="6" y2="14.5" strokeWidth="2" stroke="currentColor" />
  </svg>
);

/** 批注气泡图标 (ChatBubble / Annotation) */
export const ChatBubbleIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M3 4C3 2.9 3.9 2 5 2H11C12.1 2 13 2.9 13 4V9C13 10.1 12.1 11 11 11H6.5L3.5 13.5V11.5C3.2 11.2 3 10.6 3 10V4Z" />
    <circle cx="5.5" cy="6.5" r="0.75" fill="currentColor" />
    <circle cx="8" cy="6.5" r="0.75" fill="currentColor" />
    <circle cx="10.5" cy="6.5" r="0.75" fill="currentColor" />
  </svg>
);

/** 亮暗模式切换图标 (Sun & Moon) */
export const SunMoonIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M8 2.5A5.5 5.5 0 1 0 13.5 8C13.5 5 11 2.5 8 2.5Z" />
    <path d="M8 2.5V13.5C11 13.5 13.5 11 13.5 8C13.5 5 11 2.5 8 2.5Z" fill="currentColor" />
  </svg>
);

/** 登出/退出图标 (Logout) */
export const LogoutIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M6 3H3.5C2.67 3 2 3.67 2 4.5V11.5C2 12.33 2.67 13 3.5 13H6" />
    <polyline points="10.5 4.5 14 8 10.5 11.5" />
    <line x1="5.5" y1="8" x2="13.5" y2="8" />
  </svg>
);

/** 垃圾桶 / 删除图标 (Trash) */
export const TrashIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M2.5 4.5H13.5M5.5 4.5V3C5.5 2.45 5.95 2 6.5 2H9.5C10.05 2 10.5 2.45 10.5 3V4.5M12.5 4.5V13C12.5 13.55 12.05 14 11.5 14H4.5C3.95 14 3.5 13.55 3.5 13V4.5" />
    <line x1="6.5" y1="7" x2="6.5" y2="11.5" />
    <line x1="9.5" y1="7" x2="9.5" y2="11.5" />
  </svg>
);

/** 云端图标 (Cloud) */
export const CloudIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M4.5 12.5H11.5C13.16 12.5 14.5 11.16 14.5 9.5C14.5 7.9 13.25 6.6 11.7 6.5C11.3 4.2 9.35 2.5 7 2.5C4.3 2.5 2.1 4.5 2 7.15C1.1 7.6 0.5 8.5 0.5 9.5C0.5 11.16 1.84 12.5 3.5 12.5" />
  </svg>
);

/** 本地电脑图标 (Desktop / Computer) */
export const ComputerDesktopIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="8.5" rx="1.5" />
    <line x1="5.5" y1="13.5" x2="10.5" y2="13.5" />
    <line x1="8" y1="11" x2="8" y2="13.5" />
  </svg>
);

/** 图片图标 (Photo / Image) */
export const PhotoIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="2" />
    <circle cx="5.5" cy="5.5" r="1" fill="currentColor" />
    <path d="M14 10.5L10.5 7L3 13.5" />
  </svg>
);

/** 引用块图标 (Quote) */
export const QuoteIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M3.5 10C3.5 8 4.2 6.5 6 5.5L6.5 6.5C5.5 7.2 5 8 5 9H6.5V12H3.5V10ZM9.5 10C9.5 8 10.2 6.5 12 5.5L12.5 6.5C11.5 7.2 11 8 11 9H12.5V12H9.5V10Z" />
  </svg>
);

/** 任务清单图标 (Check Square) */
export const CheckSquareIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
    <polyline points="5.5 8 7.5 10 11 5.5" />
  </svg>
);

/** 表格图标 (Table) */
export const TableIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <line x1="2" y1="6.5" x2="14" y2="6.5" />
    <line x1="7" y1="2.5" x2="7" y2="13.5" />
  </svg>
);

/** 链接图标 (Link) */
export const LinkIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M6.5 9.5C5.4 10.6 3.6 10.6 2.5 9.5C1.4 8.4 1.4 6.6 2.5 5.5L4.5 3.5C5.6 2.4 7.4 2.4 8.5 3.5" />
    <path d="M9.5 6.5C10.6 5.4 12.4 5.4 13.5 6.5C14.6 7.6 14.6 9.4 13.5 10.5L11.5 12.5C10.4 13.6 8.6 13.6 7.5 12.5" />
    <line x1="5.5" y1="10.5" x2="10.5" y2="5.5" />
  </svg>
);

/** GitHub 品牌徽标 SVG */
export const GitHubBrandIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
    />
  </svg>
);

/** Gitee 品牌徽标 SVG */
export const GiteeBrandIcon: React.FC<IconProps> = ({ size = 16, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M11.984 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.016 0zm6.09 5.333c.328 0 .593.266.592.593v1.482a.594.594 0 0 1-.593.592H9.777c-.982 0-1.778.796-1.778 1.778v5.63c0 .327.266.592.593.592h5.63c.326 0 .592-.265.592-.592v-2.074a.593.593 0 0 0-.592-.593h-3.26a.593.593 0 0 1-.592-.592V10.67c0-.327.265-.593.592-.593h5.334c.327 0 .592.266.592.593v4.741c0 1.964-1.592 3.555-3.556 3.555H8.593C6.629 18.963 5.037 17.37 5.037 15.407V9.778c0-1.963 1.592-3.555 3.556-3.555h9.481z" />
  </svg>
);

/** 复制图标 (Copy) */
export const CopyIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 5.5V3.5C10.5 2.67 9.83 2 9 2H3.5C2.67 2 2 2.67 2 3.5V9C2 9.83 2.67 10.5 3.5 10.5H5.5" />
  </svg>
);

/** 保存磁盘图标 (Save / Floppy) */
export const SaveIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <path d="M13 13.5H3C2.45 13.5 2 13.05 2 12.5V3.5C2 2.95 2.45 2.5 3 2.5H11L14 5.5V12.5C14 13.05 13.55 13.5 13 13.5Z" />
    <path d="M11 13.5V9.5H5V13.5" />
    <path d="M4.5 2.5V5.5H10.5" />
  </svg>
);

/** 闪电 / 快速生成图标 (Lightning) */
export const LightningIcon: React.FC<IconProps> = ({ size = 14, className = '', ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    className={`inline-block flex-shrink-0 ${className}`}
    {...props}
  >
    <polygon points="8.5 1.5 2.5 9 7.5 9 6.5 14.5 13.5 7 8.5 7 8.5 1.5" />
  </svg>
);

// -------------------------------------------------------------
// 4. Large Vector Illustrations (文档居中预览插画、空状态等)
// -------------------------------------------------------------

/** 空文件夹大插画 (无笔记时的质感插图) */
export const EmptyFolderIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 64,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    <rect x="8" y="16" width="48" height="38" rx="6" fill="#F1F5F9" />
    <path
      d="M10 20C10 16.6863 12.6863 14 16 14H25.1716C26.7628 14 28.2893 14.6321 29.4142 15.7574L31.6569 18H50C52.2091 18 54 19.7909 54 22V48C54 50.2091 52.2091 52 50 52H14C11.7909 52 10 50.2091 10 48V20Z"
      fill="#FCD34D"
    />
    <path
      d="M8 26C8 23.7909 9.79086 22 12 22H52C54.2091 22 56 23.7909 56 26V48C56 50.2091 54.2091 52 52 52H12C9.79086 52 8 50.2091 8 48V26Z"
      fill="#FBBF24"
    />
    <circle cx="32" cy="37" r="8" fill="#F59E0B" fillOpacity="0.4" />
    <path d="M32 33V41M28 37H36" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/** DOCX 文档高保真预览大插画 */
export const DocxPreviewIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 72,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    {/* Page base shadow */}
    <rect x="18" y="10" width="38" height="52" rx="4" fill="#000000" fillOpacity="0.04" />
    {/* Sheet */}
    <path
      d="M16 10C16 7.79 17.79 6 20 6H42L56 20V62C56 64.21 54.21 66 52 66H20C17.79 66 16 64.21 16 62V10Z"
      fill="#FFFFFF"
      stroke="#E2E8F0"
      strokeWidth="1.5"
    />
    {/* Fold corner */}
    <path d="M42 6V18C42 19.1 42.9 20 44 20H56L42 6Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
    {/* Word Badge in center */}
    <rect x="23" y="27" width="26" height="22" rx="3.5" fill="#2563EB" />
    <path
      d="M27 32H29.5L31.2 39.5L33.2 32H35.2L37.2 39.5L38.9 32H41.4L38.5 42.5H36L34.2 35.8L32.4 42.5H29.9L27 32Z"
      fill="#FFFFFF"
    />
  </svg>
);

/** PDF 文档高保真预览大插画 */
export const PdfPreviewIllustration: React.FC<{ size?: number; className?: string }> = ({
  size = 72,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 72 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`inline-block ${className}`}
  >
    <path
      d="M16 10C16 7.79 17.79 6 20 6H42L56 20V62C56 64.21 54.21 66 52 66H20C17.79 66 16 64.21 16 62V10Z"
      fill="#FFFFFF"
      stroke="#E2E8F0"
      strokeWidth="1.5"
    />
    <path d="M42 6V18C42 19.1 42.9 20 44 20H56L42 6Z" fill="#FEE2E2" stroke="#FECACA" strokeWidth="1" />
    {/* PDF Badge in center */}
    <rect x="22" y="27" width="28" height="22" rx="3.5" fill="#DC2626" />
    <text
      x="36"
      y="41.5"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="8.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="-0.3"
    >
      PDF
    </text>
  </svg>
);
