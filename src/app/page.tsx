'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { SettingsModal } from '../components/Sidebar/SettingsModal';
import { Header } from '../components/Header/Header';
import { NotesBoard } from '../components/Board/NotesBoard';
import { NoteModal } from '../components/Editor/NoteModal';
import { NewNoteTypeModal } from '../components/Editor/NewNoteTypeModal';
import { CommandPalette } from '../components/Common/CommandPalette';
import { StatsModal } from '../components/Common/StatsModal';
import { ShortcutsModal } from '../components/Common/ShortcutsModal';
import { ReminderWatcher } from '../components/Common/ReminderWatcher';
import { useNotes } from '../context/NotesContext';
import { useUI } from '../context/UIContext';
import { Plus } from 'lucide-react';

const isTypingTarget = (el: EventTarget | null) =>
  el instanceof HTMLElement && Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));

export default function Home() {
  const {
    isTypeSelectorOpen,
    setIsTypeSelectorOpen,
    startNewNote,
    activeNoteForEdit,
    isCreateModalOpen,
    setSearchQuery,
  } = useNotes();
  const { openModal, setOpenModal, selectMode } = useUI();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);

  const isEditorOpen = Boolean(activeNoteForEdit || isCreateModalOpen);

  // Masaüstünde kenar çubuğunun daraltılmış hali hatırlanır
  useEffect(() => {
    try {
      setIsCollapsedDesktop(localStorage.getItem('yuppi_sidebar_collapsed') === '1');
    } catch {
      // yoksay
    }
  }, []);

  const toggleDesktop = () => {
    setIsCollapsedDesktop((prev) => {
      try {
        localStorage.setItem('yuppi_sidebar_collapsed', prev ? '0' : '1');
      } catch {
        // yoksay
      }
      return !prev;
    });
  };

  // Genel kısayollar: Ctrl+K komut paleti, / arama, Alt+N yeni not, ? kısayol listesi
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenModal(openModal === 'palette' ? null : 'palette');
        return;
      }
      if (openModal) return;

      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsTypeSelectorOpen(true);
        return;
      }

      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        if (target.id === 'board-search') {
          setSearchQuery('');
          (target as HTMLInputElement).blur();
        }
        return;
      }

      if (isTypingTarget(e.target) || mod || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('board-search') as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      } else if (e.key === '?') {
        e.preventDefault();
        setOpenModal('shortcuts');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, openModal, setOpenModal, setIsTypeSelectorOpen, setSearchQuery]);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-app">
      <Sidebar
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleDesktop={toggleDesktop}
      />

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <Header onOpenMobileMenu={() => setIsOpenMobile(true)} />
        <NotesBoard />

        {/* Mobile Floating Action Button (FAB) */}
        {!selectMode && (
          <button
            onClick={() => setIsTypeSelectorOpen(true)}
            className="md:hidden fixed right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xl shadow-pink-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
            style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            title="Yeni Not Ekle"
            aria-label="Yeni Not Ekle"
          >
            <Plus className="w-7 h-7" />
          </button>
        )}

        <NewNoteTypeModal
          isOpen={isTypeSelectorOpen}
          onClose={() => setIsTypeSelectorOpen(false)}
          onSelectType={(kind) => startNewNote({ kind })}
          onSelectTemplate={(seed) => startNewNote(seed)}
        />

        <NoteModal />
      </main>

      <CommandPalette />
      <StatsModal />
      <ShortcutsModal />
      <SettingsModal />
      <ReminderWatcher />
    </div>
  );
}
