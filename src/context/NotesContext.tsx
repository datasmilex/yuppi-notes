'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Note, Folder, NoteColor, NoteScope, NoteKind } from '../types/note';
import { DEFAULT_LOCAL_FOLDERS, DEFAULT_SHARED_FOLDERS, DEFAULT_FOLDERS } from '../utils/colors';
import { useUser } from './UserContext';

interface NotesContextType {
  notes: Note[];
  folders: Folder[];
  activeScope: NoteScope;
  setActiveScope: (scope: NoteScope) => void;
  currentRoomId: string;
  setCurrentRoomId: (roomId: string) => void;
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredNotes: Note[];
  pinnedNotes: Note[];
  unpinnedNotes: Note[];
  createNote: (note: Partial<Note>) => void;
  updateNote: (note: Note) => void;
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
  copyInviteLink: () => string;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, setOnlineCount } = useUser();
  const [activeScope, setActiveScope] = useState<NoteScope>('local');
  const [currentRoomId, setCurrentRoomId] = useState<string>('ana-oda');
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<Folder[]>(DEFAULT_FOLDERS);
  const [activeFolderId, setActiveFolderId] = useState<string>('all_local');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeNoteForEdit, setActiveNoteForEdit] = useState<Note | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState<boolean>(false);
  const [newNoteKind, setNewNoteKind] = useState<NoteKind>('comprehensive');
  const [socket, setSocket] = useState<Socket | null>(null);

  // Check URL query param for invite link (?room=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam) {
        setCurrentRoomId(roomParam);
        setActiveScope('shared');
        setActiveFolderId('all_shared');
      }
    }
  }, []);

  // Initialize Local notes & folders from LocalStorage (strip out old mock notes)
  useEffect(() => {
    try {
      const savedLocalNotes = localStorage.getItem('yuppi_notes_v3') || localStorage.getItem('yuppi_notes_v2');
      if (savedLocalNotes && !savedLocalNotes.includes('Ã') && !savedLocalNotes.includes('Å')) {
        const parsed = JSON.parse(savedLocalNotes);
        const cleaned = parsed.filter((n: Note) => !n.id.startsWith('note-1') && !n.id.startsWith('note-2') && !n.id.startsWith('note-3'));
        setNotes(cleaned);
      } else {
        setNotes([]);
      }

      const savedFolders = localStorage.getItem('yuppi_folders_v3') || localStorage.getItem('yuppi_folders_v2');
      if (savedFolders && !savedFolders.includes('Ã') && !savedFolders.includes('Å')) {
        setFolders(JSON.parse(savedFolders));
      } else {
        setFolders(DEFAULT_FOLDERS);
      }
    } catch {
      setNotes([]);
      setFolders(DEFAULT_FOLDERS);
    }
  }, []);

  // Update default folder when switching scope
  useEffect(() => {
    if (activeScope === 'local') {
      setActiveFolderId('all_local');
    } else {
      setActiveFolderId('all_shared');
    }
  }, [activeScope]);

  // Save changes to localStorage for local items
  const persistState = useCallback((updatedNotes: Note[], updatedFolders?: Folder[]) => {
    try {
      localStorage.setItem('yuppi_notes_v3', JSON.stringify(updatedNotes));
      if (updatedFolders) {
        localStorage.setItem('yuppi_folders_v3', JSON.stringify(updatedFolders));
      }
    } catch {}
  }, []);

  // Setup Socket.IO connection when in 'shared' mode or room changes
  useEffect(() => {
    let newSocket: Socket | null = null;

    if (typeof window !== 'undefined') {
      try {
        newSocket = io(window.location.origin, {
          transports: ['websocket', 'polling'],
          timeout: 5000,
        });

        newSocket.on('connect', () => {
          setIsConnected(true);
          newSocket?.emit('join:room', currentRoomId);
        });

        newSocket.on('disconnect', () => {
          setIsConnected(false);
        });

        newSocket.on('presence:update', (data: { count: number }) => {
          if (data && typeof data.count === 'number') {
            setOnlineCount(data.count);
          }
        });

        newSocket.on('sync:response', (data: { notes: Note[] | null; folders: Folder[] | null }) => {
          if (data.notes && Array.isArray(data.notes)) {
            // Merge shared notes from server with current local notes
            setNotes((prev) => {
              const localNotes = prev.filter((n) => n.scope === 'local');
              const sharedNotes = data.notes!.map((n) => ({ ...n, scope: 'shared' as NoteScope }));
              const merged = [...localNotes, ...sharedNotes];
              persistState(merged);
              return merged;
            });
          }
          if (data.folders && Array.isArray(data.folders) && data.folders.length > 0) {
            setFolders((prev) => {
              const localFolders = prev.filter((f) => f.scope === 'local');
              const sharedFolders = data.folders!.map((f) => ({ ...f, scope: 'shared' as NoteScope }));
              const merged = [...localFolders, ...sharedFolders];
              persistState(notes, merged);
              return merged;
            });
          }
        });

        newSocket.on('note:created', (newNote: Note) => {
          setNotes((prev) => {
            const next = [newNote, ...prev.filter((n) => n.id !== newNote.id)];
            persistState(next);
            return next;
          });
        });

        newSocket.on('note:updated', (updatedNote: Note) => {
          setNotes((prev) => {
            const next = prev.map((n) => (n.id === updatedNote.id ? updatedNote : n));
            persistState(next);
            return next;
          });
        });

        newSocket.on('note:deleted', (noteId: string) => {
          setNotes((prev) => {
            const next = prev.filter((n) => n.id !== noteId);
            persistState(next);
            return next;
          });
        });

        newSocket.on('notes:reordered', (reorderedShared: Note[]) => {
          setNotes((prev) => {
            const localNotes = prev.filter((n) => n.scope === 'local');
            const merged = [...localNotes, ...reorderedShared];
            persistState(merged);
            return merged;
          });
        });

        newSocket.on('folder:saved', (folder: Folder) => {
          setFolders((prev) => {
            const idx = prev.findIndex((f) => f.id === folder.id);
            const next = idx !== -1 ? prev.map((f) => (f.id === folder.id ? folder : f)) : [...prev, folder];
            persistState(notes, next);
            return next;
          });
        });

        newSocket.on('folder:deleted', (folderId: string) => {
          setFolders((prev) => {
            const next = prev.filter((f) => f.id !== folderId);
            persistState(notes, next);
            return next;
          });
        });

        setSocket(newSocket);
      } catch {}
    }

    return () => {
      newSocket?.disconnect();
    };
  }, [currentRoomId, setOnlineCount, persistState]);

  const copyInviteLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}?room=${encodeURIComponent(currentRoomId)}`;
      navigator.clipboard.writeText(url);
      return url;
    }
    return '';
  }, [currentRoomId]);

  const createNote = useCallback(
    (noteData: Partial<Note>) => {
      const now = Date.now();
      const scope = noteData.scope || activeScope;
      const defaultFolder = scope === 'local' ? 'all_local' : 'all_shared';

      const newNote: Note = {
        id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: noteData.title?.trim() || 'Başlıksız Not',
        content: noteData.content || '',
        color: noteData.color || 'yellow',
        font: noteData.font || 'sans',
        folderId: noteData.folderId || (activeFolderId && !activeFolderId.startsWith('all_') ? activeFolderId : defaultFolder),
        isPinned: noteData.isPinned || false,
        order: 0,
        images: noteData.images || [],
        tags: noteData.tags || [],
        stickers: noteData.stickers || [],
        isSticky: noteData.isSticky || false,
        scope,
        roomId: scope === 'shared' ? currentRoomId : undefined,
        lastEditedBy: {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userColor: currentUser.color,
          timestamp: now,
        },
        createdAt: now,
        updatedAt: now,
      };

      setNotes((prev) => {
        const next = [newNote, ...prev.filter((n) => n.id !== newNote.id)];
        persistState(next);
        return next;
      });

      // Emit to server ONLY if in shared scope
      if (scope === 'shared') {
        socket?.emit('note:create', { note: newNote, roomId: currentRoomId });
      }
    },
    [activeScope, activeFolderId, currentRoomId, currentUser, persistState, socket]
  );

  const updateNote = useCallback(
    (updatedNote: Note) => {
      const now = Date.now();
      const noteToSave: Note = {
        ...updatedNote,
        title: updatedNote.title.trim() || 'Başlıksız Not',
        lastEditedBy: {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userColor: currentUser.color,
          timestamp: now,
        },
        updatedAt: now,
      };

      setNotes((prev) => {
        const next = prev.map((n) => (n.id === noteToSave.id ? noteToSave : n));
        persistState(next);
        return next;
      });

      // Emit to server ONLY if shared
      if (noteToSave.scope === 'shared') {
        socket?.emit('note:update', { note: noteToSave, roomId: noteToSave.roomId || currentRoomId });
      }
    },
    [currentRoomId, currentUser, persistState, socket]
  );

  const deleteNote = useCallback(
    (id: string) => {
      const target = notes.find((n) => n.id === id);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== id);
        persistState(next);
        return next;
      });

      if (target && target.scope === 'shared') {
        socket?.emit('note:delete', { noteId: id, roomId: target.roomId || currentRoomId });
      }
    },
    [notes, currentRoomId, persistState, socket]
  );

  const togglePin = useCallback(
    (id: string) => {
      const target = notes.find((n) => n.id === id);
      if (!target) return;
      const updatedNote: Note = {
        ...target,
        isPinned: !target.isPinned,
        updatedAt: Date.now(),
        lastEditedBy: {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userColor: currentUser.color,
          timestamp: Date.now(),
        },
      };

      setNotes((prev) => {
        const next = prev.map((n) => (n.id === id ? updatedNote : n));
        persistState(next);
        return next;
      });

      if (target.scope === 'shared') {
        socket?.emit('note:update', { note: updatedNote, roomId: target.roomId || currentRoomId });
      }
    },
    [notes, currentRoomId, currentUser, persistState, socket]
  );

  const duplicateNote = useCallback(
    (sourceNote: Note) => {
      const now = Date.now();
      const cloned: Note = {
        ...sourceNote,
        id: 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: `${sourceNote.title} (Kopya)`,
        order: 0,
        createdAt: now,
        updatedAt: now,
        lastEditedBy: {
          userId: currentUser.id,
          userName: currentUser.name,
          userAvatar: currentUser.avatar,
          userColor: currentUser.color,
          timestamp: now,
        },
      };

      setNotes((prev) => {
        const next = [cloned, ...prev];
        persistState(next);
        return next;
      });

      if (cloned.scope === 'shared') {
        socket?.emit('note:create', { note: cloned, roomId: cloned.roomId || currentRoomId });
      }
    },
    [currentRoomId, currentUser, persistState, socket]
  );

  const reorderNotes = useCallback(
    (activeId: string, overId: string) => {
      if (activeId === overId) return;
      const oldIndex = notes.findIndex((n) => n.id === activeId);
      const newIndex = notes.findIndex((n) => n.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const updated = [...notes];
      const [movedItem] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, movedItem);

      const reindexed = updated.map((note, idx) => ({ ...note, order: idx }));
      setNotes(reindexed);
      persistState(reindexed);

      if (movedItem.scope === 'shared') {
        const sharedOnly = reindexed.filter((n) => n.scope === 'shared');
        socket?.emit('notes:reorder', { newNotes: sharedOnly, roomId: currentRoomId });
      }
    },
    [notes, currentRoomId, persistState, socket]
  );

  const saveFolder = useCallback(
    (folder: Folder) => {
      const folderWithScope: Folder = {
        ...folder,
        scope: folder.scope || activeScope,
        roomId: folder.scope === 'shared' ? currentRoomId : undefined,
      };

      setFolders((prev) => {
        const idx = prev.findIndex((f) => f.id === folderWithScope.id);
        const next = idx !== -1 ? prev.map((f) => (f.id === folderWithScope.id ? folderWithScope : f)) : [...prev, folderWithScope];
        persistState(notes, next);
        return next;
      });

      if (folderWithScope.scope === 'shared') {
        socket?.emit('folder:save', { folder: folderWithScope, roomId: currentRoomId });
      }
    },
    [activeScope, currentRoomId, notes, persistState, socket]
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const target = folders.find((f) => f.id === folderId);
      if (!target || target.isSystem) return;

      const updatedFolders = folders.filter((f) => f.id !== folderId);
      setFolders(updatedFolders);

      // Move notes inside to default scope folder
      const defaultFolder = target.scope === 'local' ? 'all_local' : 'all_shared';
      const updatedNotes = notes.map((n) => (n.folderId === folderId ? { ...n, folderId: defaultFolder } : n));
      setNotes(updatedNotes);
      persistState(updatedNotes, updatedFolders);

      if (activeFolderId === folderId) {
        setActiveFolderId(defaultFolder);
      }

      if (target.scope === 'shared') {
        socket?.emit('folder:delete', { folderId, roomId: currentRoomId });
      }
    },
    [folders, notes, activeFolderId, currentRoomId, persistState, socket]
  );

  // Filter notes strictly by activeScope, activeFolderId, and searchQuery
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      // Scope filter: Yerel vs Ortak
      if (note.scope !== activeScope) return false;

      // Room filter for shared
      if (activeScope === 'shared' && note.roomId && note.roomId !== currentRoomId) {
        return false;
      }

      // Folder filter
      if (activeFolderId && !activeFolderId.startsWith('all_')) {
        if (note.folderId !== activeFolderId) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = note.title.toLowerCase().includes(query);
        const plainText = note.content.replace(/<[^>]*>?/gm, '').toLowerCase();
        const contentMatch = plainText.includes(query);
        const authorMatch = note.lastEditedBy?.userName?.toLowerCase().includes(query);
        if (!titleMatch && !contentMatch && !authorMatch) return false;
      }

      return true;
    });
  }, [notes, activeScope, currentRoomId, activeFolderId, searchQuery]);

  const pinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => n.isPinned);
  }, [filteredNotes]);

  const unpinnedNotes = useMemo(() => {
    return filteredNotes.filter((n) => !n.isPinned);
  }, [filteredNotes]);

  return (
    <NotesContext.Provider
      value={{
        notes,
        folders,
        activeScope,
        setActiveScope,
        currentRoomId,
        setCurrentRoomId,
        activeFolderId,
        setActiveFolderId,
        searchQuery,
        setSearchQuery,
        filteredNotes,
        pinnedNotes,
        unpinnedNotes,
        createNote,
        updateNote,
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
        copyInviteLink,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};

export const useNotes = () => {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
};
