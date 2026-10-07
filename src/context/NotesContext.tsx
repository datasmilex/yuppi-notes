'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { Note, Folder, NoteColor, NoteScope, NoteKind, SortMode } from '../types/note';
import { DEFAULT_FOLDERS, DEFAULT_SHARED_FOLDERS } from '../utils/colors';
import { ensureSystemFolders, normalizeNote, normalizeTags, noteSearchText } from '../utils/notes';
import { kvGet, kvSet } from '../utils/storage';
import { copyText, uid } from '../utils/text';
import { useUser } from './UserContext';
import { useToast } from '../components/Common/Toast';

export interface TagInfo {
  tag: string;
  count: number;
}

interface NotesContextType {
  notes: Note[];
  folders: Folder[];
  scopeFolders: Folder[];
  hydrated: boolean;
  activeScope: NoteScope;
  setActiveScope: (scope: NoteScope) => void;
  currentRoomId: string;
  setCurrentRoomId: (roomId: string) => void;
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeColor: NoteColor | null;
  setActiveColor: (color: NoteColor | null) => void;
  activeTag: string | null;
  setActiveTag: (tag: string | null) => void;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  allTags: TagInfo[];
  filteredNotes: Note[];
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  createNote: (note: Partial<Note>) => Note;
  updateNote: (note: Note) => void;
  patchNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  togglePin: (id: string) => void;
  reorderNotes: (activeId: string, overId: string) => void;
  saveFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  isConnected: boolean;
  activeNoteForEdit: Note | null;
  setActiveNoteForEdit: (note: Note | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isTypeSelectorOpen: boolean;
  setIsTypeSelectorOpen: (open: boolean) => void;
  newNoteKind: NoteKind;
  setNewNoteKind: (kind: NoteKind) => void;
  duplicateNote: (note: Note) => void;
  getInviteLink: () => Promise<string>;
  copyInviteLink: () => Promise<{ url: string; ok: boolean }>;
  exportBackup: () => string;
  importBackup: (json: string) => { notes: number; folders: number };
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const PREFS_KEY = 'yuppi_prefs';
const LEGACY_NOTE_KEYS = ['yuppi_notes_v3', 'yuppi_notes_v2'];
const LEGACY_FOLDER_KEYS = ['yuppi_folders_v3', 'yuppi_folders_v2'];
const SORT_MODES: SortMode[] = ['manual', 'updated', 'created', 'title'];

const stripTags = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');

function readLegacy<T>(keys: string[]): T[] | undefined {
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as T[];
      }
    } catch {
      // bozuk eski kayıt: sonrakini dene
    }
  }
  return undefined;
}

function cleanRoomId(room: string): string {
  return room.trim().replace(/\s+/g, '-').slice(0, 40);
}

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setOnlineCount } = useUser();
  const { showToast } = useToast();

  const [notes, setNotesState] = useState<Note[]>([]);
  const [folders, setFoldersState] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [hydrated, setHydrated] = useState(false);
  const [activeScope, setActiveScope] = useState<NoteScope>('local');
  const [currentRoomId, setRoomState] = useState<string>('ana-oda');
  const [activeFolderId, setActiveFolderId] = useState<string>('all_local');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeColor, setActiveColor] = useState<NoteColor | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortMode, setSortModeState] = useState<SortMode>('manual');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeNoteForEdit, setActiveNoteForEdit] = useState<Note | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState<boolean>(false);
  const [newNoteKind, setNewNoteKind] = useState<NoteKind>('comprehensive');

  // Güncel değerler ref'lerde tutulur: socket olayları ve ardışık işlemler bayat state görmesin
  const notesRef = useRef<Note[]>([]);
  const foldersRef = useRef<Folder[]>(DEFAULT_FOLDERS);
  const socketRef = useRef<Socket | null>(null);
  const roomRef = useRef(currentRoomId);
  roomRef.current = currentRoomId;

  const commitNotes = useCallback((updater: (prev: Note[]) => Note[]) => {
    const next = updater(notesRef.current);
    notesRef.current = next;
    setNotesState(next);
  }, []);

  const commitFolders = useCallback((updater: (prev: Folder[]) => Folder[]) => {
    const next = updater(foldersRef.current);
    foldersRef.current = next;
    setFoldersState(next);
  }, []);

  // ---------- Tercihler & davet linki ----------
  useEffect(() => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (typeof prefs.room === 'string' && prefs.room) setRoomState(prefs.room);
      if (SORT_MODES.includes(prefs.sort)) setSortModeState(prefs.sort);
    } catch {
      // yoksay
    }
    const roomParam = new URLSearchParams(window.location.search).get('room');
    if (roomParam && cleanRoomId(roomParam)) {
      setRoomState(cleanRoomId(roomParam));
      setActiveScope('shared');
      setActiveFolderId('all_shared');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const savePrefs = useCallback((patch: Record<string, unknown>) => {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, ...patch }));
    } catch {
      // yoksay
    }
  }, []);

  const setCurrentRoomId = useCallback(
    (room: string) => {
      const cleaned = cleanRoomId(room);
      if (!cleaned) return;
      setRoomState(cleaned);
      savePrefs({ room: cleaned });
    },
    [savePrefs]
  );

  const setSortMode = useCallback(
    (mode: SortMode) => {
      setSortModeState(mode);
      savePrefs({ sort: mode });
    },
    [savePrefs]
  );

  // ---------- Yükleme (IndexedDB, eski localStorage'dan taşıma) ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let storedNotes = await kvGet<Note[]>('notes');
      let storedFolders = await kvGet<Folder[]>('folders');
      const loadedFromDb = Boolean(storedNotes);

      if (!storedNotes) {
        // Eski sürümden taşı. Yalnızca tohum (örnek) notlar elenir; kullanıcı notlarına dokunulmaz.
        storedNotes = (readLegacy<Note>(LEGACY_NOTE_KEYS) || []).filter((n) => !/^note-[1-9]$/.test(n.id));
      }
      if (!storedFolders) storedFolders = readLegacy<Folder>(LEGACY_FOLDER_KEYS) || DEFAULT_FOLDERS;
      if (cancelled) return;

      const nextNotes = storedNotes.map(normalizeNote);
      const nextFolders = ensureSystemFolders(storedFolders);
      notesRef.current = nextNotes;
      foldersRef.current = nextFolders;
      skipPersistRef.current = loadedFromDb;
      setNotesState(nextNotes);
      setFoldersState(nextFolders);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Kalıcılık ----------
  const skipPersistRef = useRef(false);
  const dirtyRef = useRef(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(Math.random().toString(36).slice(2));

  const writeNow = useCallback(async () => {
    try {
      await kvSet('notes', notesRef.current);
      await kvSet('folders', foldersRef.current);
      dirtyRef.current = false;
      channelRef.current?.postMessage({ from: tabIdRef.current });
    } catch {
      showToast('Depolama alanı dolu! Büyük görselleri silin veya yedek alın.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    dirtyRef.current = true;
    const timer = setTimeout(writeNow, 250);
    return () => clearTimeout(timer);
  }, [notes, folders, hydrated, writeNow]);

  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current && hydrated) void writeNow();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hydrated, writeNow]);

  // Aynı tarayıcıda birden çok sekme: yerel notları sekmeler arasında eşitle
  useEffect(() => {
    if (!hydrated || typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('yuppi-notes');
    channelRef.current = channel;
    channel.onmessage = async (event) => {
      if (event.data?.from === tabIdRef.current) return;
      const [storedNotes, storedFolders] = await Promise.all([
        kvGet<Note[]>('notes'),
        kvGet<Folder[]>('folders'),
      ]);
      if (!storedNotes || !storedFolders) return;
      skipPersistRef.current = true;
      commitNotes((prev) => [
        ...storedNotes.filter((n) => n.scope === 'local').map(normalizeNote),
        ...prev.filter((n) => n.scope === 'shared'),
      ]);
      commitFolders((prev) => [
        ...storedFolders.filter((f) => f.scope === 'local'),
        ...prev.filter((f) => f.scope === 'shared'),
      ]);
    };
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [hydrated, commitNotes, commitFolders]);

  // Kapsam değişince klasör/etiket filtresini sıfırla
  useEffect(() => {
    setActiveFolderId(activeScope === 'local' ? 'all_local' : 'all_shared');
    setActiveTag(null);
  }, [activeScope]);

  // ---------- Socket.IO (yalnızca ORTAK modda) ----------
  const sharedActive = activeScope === 'shared';

  useEffect(() => {
    if (!sharedActive) {
      setIsConnected(false);
      setOnlineCount(1);
      return;
    }

    const room = currentRoomId;
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });
    socketRef.current = socket;

    const isThisRoom = (n: Note) => n.scope === 'shared' && (n.roomId ?? room) === room;
    const asShared = (n: Note): Note => normalizeNote({ ...n, scope: 'shared', roomId: room });

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join:room', room);
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    socket.on('presence:update', (data: { count: number }) => {
      if (data && typeof data.count === 'number') setOnlineCount(Math.max(1, data.count));
    });

    socket.on('sync:response', (data: { notes?: Note[]; folders?: Folder[] | null; roomId?: string }) => {
      if (data.roomId && data.roomId !== room) return;

      if (Array.isArray(data.notes)) {
        const remote = data.notes.map(asShared);
        commitNotes((prev) => [...prev.filter((n) => !isThisRoom(n)), ...remote]);
      }

      const systemFolders = DEFAULT_SHARED_FOLDERS.filter((f) => f.isSystem);
      if (Array.isArray(data.folders)) {
        const remoteFolders = data.folders
          .filter((f) => !f.isSystem)
          .map((f) => ({ ...f, scope: 'shared' as NoteScope, roomId: room }));
        commitFolders((prev) => [...prev.filter((f) => f.scope === 'local'), ...systemFolders, ...remoteFolders]);
      } else if (data.folders === null) {
        // Bu oda ilk kez kullanılıyor: varsayılan klasörleri sunucuya tohumla
        const seeded = DEFAULT_SHARED_FOLDERS.filter((f) => !f.isSystem).map((f) => ({ ...f, roomId: room }));
        seeded.forEach((folder) => socket.emit('folder:save', { folder, roomId: room }));
        commitFolders((prev) => [...prev.filter((f) => f.scope === 'local'), ...systemFolders, ...seeded]);
      }
    });

    socket.on('note:created', (note: Note) => {
      const incoming = asShared(note);
      commitNotes((prev) => [incoming, ...prev.filter((n) => n.id !== incoming.id)]);
    });

    socket.on('note:updated', (note: Note) => {
      const incoming = asShared(note);
      commitNotes((prev) =>
        prev.some((n) => n.id === incoming.id)
          ? prev.map((n) => (n.id === incoming.id ? incoming : n))
          : [incoming, ...prev]
      );
    });

    socket.on('note:deleted', (noteId: string) => {
      commitNotes((prev) => prev.filter((n) => n.id !== noteId));
    });

    socket.on('notes:reordered', (order: string[]) => {
      if (!Array.isArray(order)) return;
      commitNotes((prev) => {
        const roomNotes = prev.filter(isThisRoom);
        const rank = new Map(order.map((id, i) => [id, i]));
        const sorted = [...roomNotes].sort(
          (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        );
        return [...prev.filter((n) => !isThisRoom(n)), ...sorted];
      });
    });

    socket.on('folder:saved', (folder: Folder) => {
      const incoming: Folder = { ...folder, scope: 'shared', roomId: room };
      commitFolders((prev) =>
        prev.some((f) => f.id === incoming.id)
          ? prev.map((f) => (f.id === incoming.id ? incoming : f))
          : [...prev, incoming]
      );
    });

    socket.on('folder:deleted', (folderId: string) => {
      commitFolders((prev) => prev.filter((f) => f.id !== folderId));
      commitNotes((prev) => prev.map((n) => (n.folderId === folderId ? { ...n, folderId: 'all_shared' } : n)));
      setActiveFolderId((current) => (current === folderId ? 'all_shared' : current));
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
      setIsConnected(false);
    };
  }, [sharedActive, currentRoomId, setOnlineCount, commitNotes, commitFolders]);

  const emitShared = useCallback((event: string, payload: Record<string, unknown>) => {
    socketRef.current?.emit(event, { ...payload, roomId: roomRef.current });
  }, []);

  // ---------- Davet ----------
  const getInviteLink = useCallback(async () => {
    let origin = window.location.origin;
    if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname)) {
      try {
        const res = await fetch('/__yuppi/info');
        const info = await res.json();
        if (info?.lanUrl) origin = info.lanUrl;
      } catch {
        // LAN adresi alınamazsa mevcut origin kullanılır
      }
    }
    return `${origin}/?room=${encodeURIComponent(currentRoomId)}`;
  }, [currentRoomId]);

  const copyInviteLink = useCallback(async () => {
    const url = await getInviteLink();
    const ok = await copyText(url);
    return { url, ok };
  }, [getInviteLink]);

  // ---------- Not işlemleri ----------
  const signature = useCallback(
    (timestamp: number) => ({
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      userColor: currentUser.color,
      timestamp,
    }),
    [currentUser]
  );

  const createNote = useCallback(
    (noteData: Partial<Note>): Note => {
      const now = Date.now();
      const scope = noteData.scope || activeScope;
      const defaultFolder = scope === 'local' ? 'all_local' : 'all_shared';
      const folderId =
        noteData.folderId ||
        (activeFolderId && !activeFolderId.startsWith('all_') ? activeFolderId : defaultFolder);

      const newNote = normalizeNote({
        ...noteData,
        id: noteData.id || uid(),
        title: noteData.title?.trim() || 'Başlıksız Not',
        folderId,
        order: 0,
        scope,
        roomId: scope === 'shared' ? noteData.roomId || currentRoomId : undefined,
        lastEditedBy: signature(now),
        createdAt: noteData.createdAt || now,
        updatedAt: now,
      });

      commitNotes((prev) => [newNote, ...prev.filter((n) => n.id !== newNote.id)]);
      if (scope === 'shared') emitShared('note:create', { note: newNote });
      return newNote;
    },
    [activeScope, activeFolderId, currentRoomId, signature, commitNotes, emitShared]
  );

  const updateNote = useCallback(
    (updatedNote: Note) => {
      const now = Date.now();
      const noteToSave = normalizeNote({
        ...updatedNote,
        title: updatedNote.title.trim() || 'Başlıksız Not',
        lastEditedBy: signature(now),
        updatedAt: now,
      });

      commitNotes((prev) =>
        prev.some((n) => n.id === noteToSave.id)
          ? prev.map((n) => (n.id === noteToSave.id ? noteToSave : n))
          : [noteToSave, ...prev]
      );
      if (noteToSave.scope === 'shared') emitShared('note:update', { note: noteToSave });
    },
    [signature, commitNotes, emitShared]
  );

  /** Mevcut notun GÜNCEL halini baz alarak kısmi güncelleme yapar (bayat prop'lar eski veriyi ezmesin). */
  const patchNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      const current = notesRef.current.find((n) => n.id === id);
      if (!current) return;
      updateNote({ ...current, ...patch });
    },
    [updateNote]
  );

  const restoreNote = useCallback(
    (note: Note, index: number) => {
      commitNotes((prev) => {
        if (prev.some((n) => n.id === note.id)) return prev;
        const next = [...prev];
        next.splice(Math.min(index, next.length), 0, note);
        return next;
      });
      if (note.scope === 'shared') emitShared('note:create', { note });
    },
    [commitNotes, emitShared]
  );

  const deleteNote = useCallback(
    (id: string) => {
      const target = notesRef.current.find((n) => n.id === id);
      if (!target) return;
      const index = notesRef.current.indexOf(target);
      commitNotes((prev) => prev.filter((n) => n.id !== id));
      if (target.scope === 'shared') emitShared('note:delete', { noteId: id });
      showToast('Not silindi.', 'info', {
        action: { label: 'Geri Al', onClick: () => restoreNote(target, index) },
      });
    },
    [commitNotes, emitShared, restoreNote, showToast]
  );

  const togglePin = useCallback(
    (id: string) => {
      const target = notesRef.current.find((n) => n.id === id);
      if (target) patchNote(id, { isPinned: !target.isPinned });
    },
    [patchNote]
  );

  const duplicateNote = useCallback(
    (source: Note) => {
      const now = Date.now();
      const cloned: Note = {
        ...source,
        id: uid(),
        title: `${source.title} (Kopya)`,
        isPinned: false,
        order: 0,
        createdAt: now,
        updatedAt: now,
        lastEditedBy: signature(now),
      };
      commitNotes((prev) => [cloned, ...prev]);
      if (cloned.scope === 'shared') emitShared('note:create', { note: cloned });
    },
    [signature, commitNotes, emitShared]
  );

  const reorderNotes = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      const current = notesRef.current;
      const oldIndex = current.findIndex((n) => n.id === activeId);
      const newIndex = current.findIndex((n) => n.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const moved = current[oldIndex];
      commitNotes((prev) => {
        const updated = [...prev];
        updated.splice(oldIndex, 1);
        updated.splice(newIndex, 0, moved);
        return updated.map((note, idx) => ({ ...note, order: idx }));
      });

      if (moved.scope === 'shared') {
        const order = notesRef.current
          .filter((n) => n.scope === 'shared' && (n.roomId ?? currentRoomId) === currentRoomId)
          .map((n) => n.id);
        emitShared('notes:reorder', { order });
      }
    },
    [currentRoomId, commitNotes, emitShared]
  );

  // ---------- Klasörler ----------
  const saveFolder = useCallback(
    (folder: Folder) => {
      const scope = folder.scope || activeScope;
      const folderWithScope: Folder = {
        ...folder,
        scope,
        roomId: scope === 'shared' ? currentRoomId : undefined,
      };
      commitFolders((prev) =>
        prev.some((f) => f.id === folderWithScope.id)
          ? prev.map((f) => (f.id === folderWithScope.id ? folderWithScope : f))
          : [...prev, folderWithScope]
      );
      if (scope === 'shared') emitShared('folder:save', { folder: folderWithScope });
    },
    [activeScope, currentRoomId, commitFolders, emitShared]
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const target = foldersRef.current.find((f) => f.id === folderId);
      if (!target || target.isSystem) return;

      const defaultFolder = target.scope === 'local' ? 'all_local' : 'all_shared';
      commitFolders((prev) => prev.filter((f) => f.id !== folderId));
      commitNotes((prev) => prev.map((n) => (n.folderId === folderId ? { ...n, folderId: defaultFolder } : n)));
      setActiveFolderId((current) => (current === folderId ? defaultFolder : current));

      if (target.scope === 'shared') emitShared('folder:delete', { folderId });
    },
    [commitFolders, commitNotes, emitShared]
  );

  // ---------- Yedekleme ----------
  const exportBackup = useCallback(() => {
    return JSON.stringify(
      {
        app: 'yuppi-notes',
        version: 2,
        exportedAt: new Date().toISOString(),
        notes: notesRef.current.filter((n) => n.scope === 'local'),
        folders: foldersRef.current.filter((f) => f.scope === 'local' && !f.isSystem),
      },
      null,
      2
    );
  }, []);

  const importBackup = useCallback(
    (json: string) => {
      const data = JSON.parse(json);
      if (!data || !Array.isArray(data.notes)) throw new Error('Geçersiz yedek dosyası');

      let noteCount = 0;
      let folderCount = 0;

      if (Array.isArray(data.folders)) {
        const existing = new Set(foldersRef.current.map((f) => f.id));
        const incoming: Folder[] = data.folders
          .filter((f: Folder) => f && typeof f.id === 'string' && typeof f.name === 'string' && !existing.has(f.id))
          .map((f: Folder) => ({ ...f, scope: 'local' as NoteScope, roomId: undefined, isSystem: false }));
        folderCount = incoming.length;
        if (incoming.length) commitFolders((prev) => [...prev, ...incoming]);
      }

      const incomingNotes = data.notes
        .filter((n: Note) => n && typeof n.id === 'string')
        .map((n: Note) => normalizeNote({ ...n, scope: 'local', roomId: undefined }));
      const existingById = new Map(notesRef.current.map((n) => [n.id, n]));
      const toApply = incomingNotes.filter((n: Note) => {
        const old = existingById.get(n.id);
        return !old || n.updatedAt > old.updatedAt;
      });
      noteCount = toApply.length;
      if (toApply.length) {
        const ids = new Set(toApply.map((n: Note) => n.id));
        commitNotes((prev) => [...toApply, ...prev.filter((n) => !ids.has(n.id))]);
      }
      return { notes: noteCount, folders: folderCount };
    },
    [commitNotes, commitFolders]
  );

  // ---------- Türetilmiş veriler ----------
  const scopeFolders = useMemo(
    () =>
      folders.filter(
        (f) => f.scope === activeScope && (activeScope === 'local' || !f.roomId || f.roomId === currentRoomId)
      ),
    [folders, activeScope, currentRoomId]
  );

  const scopeNotes = useMemo(
    () =>
      notes.filter(
        (n) => n.scope === activeScope && (activeScope === 'local' || !n.roomId || n.roomId === currentRoomId)
      ),
    [notes, activeScope, currentRoomId]
  );

  const allTags = useMemo<TagInfo[]>(() => {
    const counts = new Map<string, number>();
    scopeNotes.forEach((n) => (n.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'tr')
    );
  }, [scopeNotes]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const result = scopeNotes.filter((note) => {
      if (activeFolderId && !activeFolderId.startsWith('all_') && note.folderId !== activeFolderId) return false;
      if (activeColor && note.color !== activeColor) return false;
      if (activeTag && !(note.tags || []).includes(activeTag)) return false;
      if (query && !noteSearchText(note, stripTags).includes(query)) return false;
      return true;
    });

    if (sortMode === 'updated') return [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    if (sortMode === 'created') return [...result].sort((a, b) => b.createdAt - a.createdAt);
    if (sortMode === 'title') return [...result].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    return result;
  }, [scopeNotes, activeFolderId, activeColor, activeTag, searchQuery, sortMode]);

  const pinnedNotes = useMemo(() => filteredNotes.filter((n) => n.isPinned), [filteredNotes]);
  const unpinnedNotes = useMemo(() => filteredNotes.filter((n) => !n.isPinned), [filteredNotes]);

  const value = useMemo<NotesContextType>(
    () => ({
      notes,
      folders,
      scopeFolders,
      hydrated,
      activeScope,
      setActiveScope,
      currentRoomId,
      setCurrentRoomId,
      activeFolderId,
      setActiveFolderId,
      searchQuery,
      setSearchQuery,
      activeColor,
      setActiveColor,
      activeTag,
      setActiveTag,
      sortMode,
      setSortMode,
      allTags,
      filteredNotes,
      pinnedNotes,
      unpinnedNotes,
      createNote,
      updateNote,
      patchNote,
      deleteNote,
      togglePin,
      reorderNotes,
      saveFolder,
      deleteFolder,
      isConnected,
      activeNoteForEdit,
      setActiveNoteForEdit,
      isCreateModalOpen,
      setIsCreateModalOpen,
      isTypeSelectorOpen,
      setIsTypeSelectorOpen,
      newNoteKind,
      setNewNoteKind,
      duplicateNote,
      getInviteLink,
      copyInviteLink,
      exportBackup,
      importBackup,
    }),
    [
      notes, folders, scopeFolders, hydrated, activeScope, currentRoomId, setCurrentRoomId, activeFolderId,
      searchQuery, activeColor, activeTag, sortMode, setSortMode, allTags, filteredNotes, pinnedNotes,
      unpinnedNotes, createNote, updateNote, patchNote, deleteNote, togglePin, reorderNotes, saveFolder,
      deleteFolder, isConnected, activeNoteForEdit, isCreateModalOpen, isTypeSelectorOpen, newNoteKind,
      duplicateNote, getInviteLink, copyInviteLink, exportBackup, importBackup,
    ]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
