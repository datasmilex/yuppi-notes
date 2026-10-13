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
import { Note, Folder, NoteColor, NoteScope, SortMode, BoardView, NoteSeed } from '../types/note';
import { DEFAULT_FOLDERS, DEFAULT_SHARED_FOLDERS } from '../utils/colors';
import { ensureSystemFolders, isTrashExpired, normalizeNote, noteSearchText } from '../utils/notes';
import { clearNoteHistory } from '../utils/history';
import { kvGet, kvSet } from '../utils/storage';
import { copyText, uid } from '../utils/text';
import { useUser } from './UserContext';
import { useToast } from '../components/Common/Toast';

export interface TagInfo {
  tag: string;
  count: number;
}

export type ViewCounts = Record<BoardView, number>;

interface WriteOptions {
  /** false: yalnızca düzen/durum değişikliği; "son düzenleyen" imzası ve updatedAt korunur. */
  touch?: boolean;
}

interface NewNoteRequest {
  id: number;
  seed: NoteSeed;
}

interface NotesContextType {
  notes: Note[];
  folders: Folder[];
  scopeFolders: Folder[];
  scopeNotes: Note[];
  hydrated: boolean;
  activeScope: NoteScope;
  setActiveScope: (scope: NoteScope) => void;
  currentRoomId: string;
  setCurrentRoomId: (roomId: string) => void;
  activeView: BoardView;
  setActiveView: (view: BoardView) => void;
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
  viewCounts: ViewCounts;
  folderCounts: Map<string, number>;
  filteredNotes: Note[];
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  createNote: (note: Partial<Note>) => Note;
  updateNote: (note: Note, options?: WriteOptions) => void;
  patchNote: (id: string, patch: Partial<Note>, options?: WriteOptions) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  deleteForever: (id: string) => void;
  emptyTrash: () => number;
  setArchived: (id: string, archived: boolean) => void;
  setReminder: (id: string, at: number | null) => void;
  togglePin: (id: string) => void;
  bulkPatch: (ids: string[], patch: Partial<Note>) => void;
  bulkTrash: (ids: string[]) => void;
  bulkRestore: (ids: string[]) => void;
  bulkDeleteForever: (ids: string[]) => void;
  reorderNotes: (activeId: string, overId: string) => void;
  saveFolder: (folder: Folder) => void;
  deleteFolder: (id: string) => void;
  isConnected: boolean;
  activeNoteForEdit: Note | null;
  setActiveNoteForEdit: (note: Note | null) => void;
  getNote: (id: string) => Note | undefined;
  openNoteById: (id: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isTypeSelectorOpen: boolean;
  setIsTypeSelectorOpen: (open: boolean) => void;
  newNoteRequest: NewNoteRequest | null;
  startNewNote: (seed?: NoteSeed) => void;
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
  const [activeView, setActiveViewState] = useState<BoardView>('notes');
  const [activeFolderId, setActiveFolderState] = useState<string>('all_local');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeColor, setActiveColor] = useState<NoteColor | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortMode, setSortModeState] = useState<SortMode>('manual');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeNoteForEdit, setActiveNoteForEdit] = useState<Note | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState<boolean>(false);
  const [newNoteRequest, setNewNoteRequest] = useState<NewNoteRequest | null>(null);

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

  // Klasör seçmek her zaman normal not görünümüne döndürür (arşiv/çöp klasöre göre süzülmez)
  const setActiveFolderId = useCallback((id: string) => {
    setActiveFolderState(id);
    setActiveViewState('notes');
  }, []);

  // Akıllı görünümler (hatırlatıcı/arşiv/çöp) klasörden bağımsızdır; klasör seçimi "Tüm Notlar"a döner
  const setActiveView = useCallback(
    (view: BoardView) => {
      setActiveViewState(view);
      if (view !== 'notes') setActiveFolderState(activeScope === 'local' ? 'all_local' : 'all_shared');
    },
    [activeScope]
  );

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
      setActiveFolderState('all_shared');
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
  const skipPersistRef = useRef(false);

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

      const normalized = storedNotes.map(normalizeNote);
      // Çöpte saklama süresi dolan yerel notlar açılışta kalıcı olarak temizlenir
      const expired = normalized.filter((n) => n.scope === 'local' && isTrashExpired(n));
      const nextNotes = expired.length ? normalized.filter((n) => !expired.includes(n)) : normalized;
      expired.forEach((n) => void clearNoteHistory(n.id));

      const nextFolders = ensureSystemFolders(storedFolders);
      notesRef.current = nextNotes;
      foldersRef.current = nextFolders;
      skipPersistRef.current = loadedFromDb && expired.length === 0;
      setNotesState(nextNotes);
      setFoldersState(nextFolders);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- Kalıcılık ----------
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

  // Kapsam değişince görünüm/klasör/etiket filtresini sıfırla
  useEffect(() => {
    setActiveFolderState(activeScope === 'local' ? 'all_local' : 'all_shared');
    setActiveViewState('notes');
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
        const all = data.notes.map(asShared);
        // Ortak çöpte süresi dolanlar odadan da kalıcı olarak silinir
        const expired = all.filter((n) => isTrashExpired(n));
        expired.forEach((n) => socket.emit('note:delete', { noteId: n.id, roomId: room }));
        const remote = expired.length ? all.filter((n) => !expired.includes(n)) : all;
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
      setActiveFolderState((current) => (current === folderId ? 'all_shared' : current));
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
    (updatedNote: Note, options: WriteOptions = {}) => {
      const touch = options.touch !== false;
      const now = Date.now();
      const noteToSave = normalizeNote({
        ...updatedNote,
        title: updatedNote.title.trim() || 'Başlıksız Not',
        ...(touch ? { lastEditedBy: signature(now), updatedAt: now } : {}),
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
    (id: string, patch: Partial<Note>, options?: WriteOptions) => {
      const current = notesRef.current.find((n) => n.id === id);
      if (!current) return;
      updateNote({ ...current, ...patch }, options);
    },
    [updateNote]
  );

  const bulkPatch = useCallback(
    (ids: string[], patch: Partial<Note>) => {
      ids.forEach((id) => patchNote(id, patch, { touch: false }));
    },
    [patchNote]
  );

  const restoreNote = useCallback(
    (id: string) => patchNote(id, { deletedAt: null }, { touch: false }),
    [patchNote]
  );

  const bulkRestore = useCallback((ids: string[]) => ids.forEach(restoreNote), [restoreNote]);

  /** Notu çöp kutusuna taşır; "Geri Al" ile anında geri getirilebilir. */
  const deleteNote = useCallback(
    (id: string) => {
      const target = notesRef.current.find((n) => n.id === id);
      if (!target || target.deletedAt) return;
      patchNote(id, { deletedAt: Date.now(), isPinned: false }, { touch: false });
      showToast('Not çöp kutusuna taşındı.', 'info', {
        icon: '🗑️',
        action: { label: 'Geri Al', onClick: () => patchNote(id, { deletedAt: null, isPinned: target.isPinned }, { touch: false }) },
      });
    },
    [patchNote, showToast]
  );

  const bulkTrash = useCallback(
    (ids: string[]) => {
      const targets = notesRef.current.filter((n) => ids.includes(n.id) && !n.deletedAt);
      if (!targets.length) return;
      const now = Date.now();
      targets.forEach((n) => patchNote(n.id, { deletedAt: now, isPinned: false }, { touch: false }));
      showToast(`${targets.length} not çöp kutusuna taşındı.`, 'info', {
        icon: '🗑️',
        action: {
          label: 'Geri Al',
          onClick: () => targets.forEach((n) => patchNote(n.id, { deletedAt: null, isPinned: n.isPinned }, { touch: false })),
        },
      });
    },
    [patchNote, showToast]
  );

  const removeNotes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      const idSet = new Set(ids);
      const shared = notesRef.current.filter((n) => idSet.has(n.id) && n.scope === 'shared');
      commitNotes((prev) => prev.filter((n) => !idSet.has(n.id)));
      shared.forEach((n) => emitShared('note:delete', { noteId: n.id }));
      ids.forEach((id) => void clearNoteHistory(id));
    },
    [commitNotes, emitShared]
  );

  const deleteForever = useCallback((id: string) => removeNotes([id]), [removeNotes]);
  const bulkDeleteForever = useCallback((ids: string[]) => removeNotes(ids), [removeNotes]);

  const setArchived = useCallback(
    (id: string, archived: boolean) => {
      const wasPinned = Boolean(notesRef.current.find((n) => n.id === id)?.isPinned);
      patchNote(id, archived ? { isArchived: true, isPinned: false } : { isArchived: false }, { touch: false });
      showToast(archived ? 'Not arşivlendi.' : 'Not arşivden çıkarıldı.', 'info', {
        icon: archived ? '📦' : '📤',
        action: {
          label: 'Geri Al',
          onClick: () => patchNote(id, { isArchived: !archived, isPinned: wasPinned }, { touch: false }),
        },
      });
    },
    [patchNote, showToast]
  );

  const setReminder = useCallback(
    (id: string, at: number | null) => patchNote(id, { reminderAt: at }, { touch: false }),
    [patchNote]
  );

  const togglePin = useCallback(
    (id: string) => {
      const target = notesRef.current.find((n) => n.id === id);
      if (target) patchNote(id, { isPinned: !target.isPinned }, { touch: false });
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
        isArchived: false,
        deletedAt: null,
        reminderAt: null,
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

  /** Notun en güncel hali (render beklemeden; ör. editör kapanırken yazılan son kayıt dahil). */
  const getNote = useCallback((id: string) => notesRef.current.find((n) => n.id === id), []);

  const openNoteById = useCallback((id: string) => {
    const target = notesRef.current.find((n) => n.id === id);
    if (!target) return;
    setIsCreateModalOpen(false);
    setActiveNoteForEdit(target);
  }, []);

  const requestCounter = useRef(0);
  const startNewNote = useCallback((seed: NoteSeed = {}) => {
    requestCounter.current += 1;
    setNewNoteRequest({ id: requestCounter.current, seed });
    setIsTypeSelectorOpen(false);
    setActiveNoteForEdit(null);
    setIsCreateModalOpen(true);
    // Yeni not arşiv/çöp görünümünde kaybolmasın
    setActiveViewState((view) => (view === 'archive' || view === 'trash' ? 'notes' : view));
  }, []);

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
      setActiveFolderState((current) => (current === folderId ? defaultFolder : current));

      if (target.scope === 'shared') emitShared('folder:delete', { folderId });
    },
    [commitFolders, commitNotes, emitShared]
  );

  // ---------- Yedekleme ----------
  const exportBackup = useCallback(() => {
    return JSON.stringify(
      {
        app: 'yuppi-notes',
        version: 3,
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

  const emptyTrash = useCallback(() => {
    const ids = scopeNotes.filter((n) => n.deletedAt).map((n) => n.id);
    removeNotes(ids);
    return ids.length;
  }, [scopeNotes, removeNotes]);

  const viewCounts = useMemo<ViewCounts>(() => {
    const counts: ViewCounts = { notes: 0, reminders: 0, archive: 0, trash: 0 };
    scopeNotes.forEach((n) => {
      if (n.deletedAt) {
        counts.trash += 1;
        return;
      }
      if (n.isArchived) counts.archive += 1;
      else counts.notes += 1;
      if (n.reminderAt) counts.reminders += 1;
    });
    return counts;
  }, [scopeNotes]);

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scopeNotes.forEach((n) => {
      if (n.deletedAt || n.isArchived) return;
      counts.set(n.folderId, (counts.get(n.folderId) || 0) + 1);
    });
    return counts;
  }, [scopeNotes]);

  const allTags = useMemo<TagInfo[]>(() => {
    const counts = new Map<string, number>();
    scopeNotes.forEach((n) => {
      if (n.deletedAt) return;
      (n.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    });
    return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
      (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'tr')
    );
  }, [scopeNotes]);

  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('tr-TR');
    const inFolder = activeView === 'notes' && activeFolderId && !activeFolderId.startsWith('all_');
    const result = scopeNotes.filter((note) => {
      if (activeView === 'trash') {
        if (!note.deletedAt) return false;
      } else {
        if (note.deletedAt) return false;
        if (activeView === 'notes' && note.isArchived) return false;
        if (activeView === 'archive' && !note.isArchived) return false;
        if (activeView === 'reminders' && !note.reminderAt) return false;
      }
      if (inFolder && note.folderId !== activeFolderId) return false;
      if (activeColor && note.color !== activeColor) return false;
      if (activeTag && !(note.tags || []).includes(activeTag)) return false;
      if (query && !noteSearchText(note, stripTags).includes(query)) return false;
      return true;
    });

    if (activeView === 'reminders') return [...result].sort((a, b) => (a.reminderAt || 0) - (b.reminderAt || 0));
    if (activeView === 'trash') return [...result].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    if (sortMode === 'updated') return [...result].sort((a, b) => b.updatedAt - a.updatedAt);
    if (sortMode === 'created') return [...result].sort((a, b) => b.createdAt - a.createdAt);
    if (sortMode === 'title') return [...result].sort((a, b) => a.title.localeCompare(b.title, 'tr'));
    return result;
  }, [scopeNotes, activeView, activeFolderId, activeColor, activeTag, searchQuery, sortMode]);

  // Sabitlenenler yalnızca normal görünümde ayrı bölümde gösterilir
  const pinnedNotes = useMemo(
    () => (activeView === 'notes' ? filteredNotes.filter((n) => n.isPinned) : []),
    [filteredNotes, activeView]
  );
  const unpinnedNotes = useMemo(
    () => (activeView === 'notes' ? filteredNotes.filter((n) => !n.isPinned) : filteredNotes),
    [filteredNotes, activeView]
  );

  const value = useMemo<NotesContextType>(
    () => ({
      notes,
      folders,
      scopeFolders,
      scopeNotes,
      hydrated,
      activeScope,
      setActiveScope,
      currentRoomId,
      setCurrentRoomId,
      activeView,
      setActiveView,
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
      viewCounts,
      folderCounts,
      filteredNotes,
      pinnedNotes,
      unpinnedNotes,
      createNote,
      updateNote,
      patchNote,
      deleteNote,
      restoreNote,
      deleteForever,
      emptyTrash,
      setArchived,
      setReminder,
      togglePin,
      bulkPatch,
      bulkTrash,
      bulkRestore,
      bulkDeleteForever,
      reorderNotes,
      saveFolder,
      deleteFolder,
      isConnected,
      activeNoteForEdit,
      setActiveNoteForEdit,
      getNote,
      openNoteById,
      isCreateModalOpen,
      setIsCreateModalOpen,
      isTypeSelectorOpen,
      setIsTypeSelectorOpen,
      newNoteRequest,
      startNewNote,
      duplicateNote,
      getInviteLink,
      copyInviteLink,
      exportBackup,
      importBackup,
    }),
    [
      notes, folders, scopeFolders, scopeNotes, hydrated, activeScope, currentRoomId, setCurrentRoomId,
      activeView, setActiveView, activeFolderId, setActiveFolderId, searchQuery, activeColor, activeTag,
      sortMode, setSortMode, allTags, viewCounts, folderCounts, filteredNotes, pinnedNotes, unpinnedNotes,
      createNote, updateNote, patchNote, deleteNote, restoreNote, deleteForever, emptyTrash, setArchived,
      setReminder, togglePin, bulkPatch, bulkTrash, bulkRestore, bulkDeleteForever, reorderNotes, saveFolder,
      deleteFolder, isConnected, activeNoteForEdit, getNote, openNoteById, isCreateModalOpen, isTypeSelectorOpen,
      newNoteRequest, startNewNote, duplicateNote, getInviteLink, copyInviteLink, exportBackup, importBackup,
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
