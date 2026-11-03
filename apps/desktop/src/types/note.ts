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
