export type NoteColor = 'yellow' | 'lavender' | 'pink' | 'mint' | 'blue' | 'peach' | 'coral' | 'neutral';

export type NoteFont = 'sans' | 'handwriting' | 'mono' | 'serif';

export type NoteScope = 'local' | 'shared';

export type NoteSize = 'small' | 'medium' | 'large' | 'full';

export type NoteKind = 'quick' | 'comprehensive';

export interface NoteUser {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Note {
  id: string;
  title: string;
  content: string; // HTML string or rich text
  color: NoteColor;
  font: NoteFont;
  folderId: string; // 'all' or custom folder ID
  isPinned: boolean;
  order: number;
  images: string[]; // Base64 data URLs or image URLs
  tags?: string[];
  stickers?: string[]; // Stickers attached to note
  isSticky?: boolean; // Quick sticky note between notes
  kind?: NoteKind; // 'quick' (Kopyalanabilir) or 'comprehensive' (OneNote tam sayfa çizimli)
  drawingData?: string; // OneNote HTML5 Canvas drawing image
  size?: NoteSize; // 'small' | 'medium' | 'large' | 'full'
  customHeight?: number; // Custom drag-resized height
  scope: NoteScope; // 'local' or 'shared'
  roomId?: string; // If shared, the room ID
  lastEditedBy: {
    userId: string;
    userName: string;
    userAvatar: string;
    userColor: string;
    timestamp: number;
  };
  createdAt: number;
  updatedAt: number;
}

export interface Folder {
  id: string;
  name: string;
  emoji: string;
  color: string;
  isSystem?: boolean;
  scope: NoteScope; // 'local' or 'shared'
  roomId?: string;
}

export interface ColorDefinition {
  id: NoteColor;
  name: string;
  bgClass: string;
  borderClass: string;
  cardBg: string;
  accent: string;
  borderHex: string;
  badgeHex: string;
  textClass: string;
}
