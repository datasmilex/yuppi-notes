import { Folder, Note, NoteFont, NoteScope } from '../types/note';
import { NOTE_COLORS, DEFAULT_FOLDERS } from './colors';
import { uid } from './text';

const FONTS: NoteFont[] = ['sans', 'handwriting', 'mono', 'serif'];

export function normalizeTag(tag: string): string {
  return tag.replace(/^#+/, '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, '-').slice(0, 30);
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  tags.forEach((t) => {
    if (typeof t !== 'string') return;
    const n = normalizeTag(t);
    if (n) seen.add(n);
  });
  return Array.from(seen);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeNote(raw: any): Note {
  const scope: NoteScope = raw?.scope === 'shared' ? 'shared' : 'local';
  const now = Date.now();
  return {
    ...raw,
    id: typeof raw?.id === 'string' && raw.id ? raw.id : uid(),
    title: typeof raw?.title === 'string' ? raw.title : '',
    content: typeof raw?.content === 'string' ? raw.content : '',
    color: raw?.color in NOTE_COLORS ? raw.color : 'yellow',
    font: FONTS.includes(raw?.font) ? raw.font : 'sans',
    folderId:
      !raw?.folderId || raw.folderId === 'all'
        ? scope === 'local'
          ? 'all_local'
          : 'all_shared'
        : raw.folderId,
    isPinned: Boolean(raw?.isPinned),
    order: Number.isFinite(raw?.order) ? raw.order : 0,
    images: Array.isArray(raw?.images) ? raw.images.filter((i: unknown) => typeof i === 'string') : [],
    tags: normalizeTags(raw?.tags),
    stickers: Array.isArray(raw?.stickers) ? raw.stickers.filter((s: unknown) => typeof s === 'string') : [],
    scope,
    roomId: scope === 'shared' ? raw?.roomId : undefined,
    lastEditedBy: raw?.lastEditedBy || {
      userId: 'unknown',
      userName: 'Anonim',
      userAvatar: '👤',
      userColor: '#F59E0B',
      timestamp: raw?.updatedAt || now,
    },
    createdAt: Number.isFinite(raw?.createdAt) ? raw.createdAt : now,
    updatedAt: Number.isFinite(raw?.updatedAt) ? raw.updatedAt : now,
  };
}

/** Sistem klasörleri (Tüm Notlar / Ortak Notlar) her zaman bulunmalı. */
export function ensureSystemFolders(folders: Folder[]): Folder[] {
  const result = [...folders];
  DEFAULT_FOLDERS.filter((f) => f.isSystem).forEach((sys) => {
    if (!result.some((f) => f.id === sys.id)) result.unshift(sys);
  });
  return result;
}

export function noteSearchText(note: Note, htmlToText: (html: string) => string): string {
  return [note.title, htmlToText(note.content), note.lastEditedBy?.userName || '', (note.tags || []).join(' ')]
    .join('\n')
    .toLocaleLowerCase('tr-TR');
}
