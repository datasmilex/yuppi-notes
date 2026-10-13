// Not sürüm geçmişi: her düzenleme oturumundan önceki hali saklanır, istenince geri yüklenir.
// Notların kendisinden ayrı tutulur; böylece ortak odalarda eşitlenen veri şişmez.

import { kvDel, kvGet, kvSet } from './storage';
import { uid } from './text';

export interface NoteVersion {
  id: string;
  at: number;
  title: string;
  content: string;
  by: string;
}

const MAX_VERSIONS = 30;
const keyFor = (noteId: string) => `history:${noteId}`;

export async function getNoteHistory(noteId: string): Promise<NoteVersion[]> {
  const list = await kvGet<NoteVersion[]>(keyFor(noteId));
  return Array.isArray(list) ? list : [];
}

/** En yeni sürüm başa eklenir; içerik bir öncekiyle aynıysa kayıt atlanır. */
export async function pushNoteVersion(noteId: string, version: Omit<NoteVersion, 'id'>): Promise<void> {
  const list = await getNoteHistory(noteId);
  const latest = list[0];
  if (latest && latest.title === version.title && latest.content === version.content) return;
  const next = [{ ...version, id: uid('v') }, ...list].slice(0, MAX_VERSIONS);
  await kvSet(keyFor(noteId), next);
}

export async function clearNoteHistory(noteId: string): Promise<void> {
  await kvDel(keyFor(noteId));
}
