export type NoteKind = 'md' | 'html' | 'docx' | 'pptx' | 'pdf' | 'txt' | 'folder';

export interface NoteItem {
  id: string;
  path: string;
  name: string;
  title: string;
  kind: NoteKind;
  isFolder: boolean;
  children?: NoteItem[];
  updatedAt?: string;
  public: boolean;
  tags: string[];
  content?: string;
}

export type ViewMode = 'preview' | 'edit' | 'split';

export interface NoteState {
  viewMode: ViewMode;
  scrollLine: number;
  cursor: number;
}

export interface RepoStorageUsage {
  repoName: string;
  workingSizeBytes: number;
  gitSizeBytes: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  fileCount: number;
  quotaBytes: number;
  quotaFormatted: string;
  usagePercentage: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  remoteProvider: 'gitee' | 'github' | 'local' | string;
  remoteUrl?: string;
}

export interface DataRootGroupInfo {
  name: string;
  displayName: string;
  provider: string;
  remoteUrl?: string;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  quotaBytes: number;
  quotaFormatted: string;
  usagePercentage: number;
  healthStatus: 'healthy' | 'warning' | 'critical';
  fileCount: number;
  currentBranch: string;
  lastSyncTime?: string;
  isCurrent: boolean;
}
