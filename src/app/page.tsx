'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar/Sidebar';
import { Header } from '../components/Header/Header';
import { NotesBoard } from '../components/Board/NotesBoard';
import { NoteModal } from '../components/Editor/NoteModal';
import { NewNoteTypeModal } from '../components/Editor/NewNoteTypeModal';
import { useNotes } from '../context/NotesContext';
import { Plus } from 'lucide-react';

export default function Home() {
  const {
    isTypeSelectorOpen,
    setIsTypeSelectorOpen,
    setIsCreateModalOpen,
    setNewNoteKind,
    activeNoteForEdit,
    isCreateModalOpen,
    setSearchQuery,
  } = useNotes();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);

  const isEditorOpen = Boolean(activeNoteForEdit || isCreateModalOpen);

  // Kısayollar: Ctrl+K arama, Alt+N yeni not
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditorOpen) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('header input[type="text"]') as HTMLInputElement | null;
        searchInput?.focus();
        searchInput?.select();
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsTypeSelectorOpen(true);
      }
      if (e.key === 'Escape') {
        const target = e.target as HTMLElement;
        if (target.matches('header input[type="text"]')) {
          setSearchQuery('');
          (target as HTMLInputElement).blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditorOpen, setIsTypeSelectorOpen, setSearchQuery]);

  const handleSelectNoteType = (kind: 'quick' | 'comprehensive') => {
    setNewNoteKind(kind);
    setIsTypeSelectorOpen(false);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-app">
      <Sidebar
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
      />

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <Header onOpenMobileMenu={() => setIsOpenMobile(true)} />
        <NotesBoard />

        {/* Mobile Floating Action Button (FAB) */}
        <button
          onClick={() => setIsTypeSelectorOpen(true)}
          className="md:hidden fixed right-5 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xl shadow-pink-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
          title="Yeni Not Ekle"
          aria-label="Yeni Not Ekle"
        >
          <Plus className="w-7 h-7" />
        </button>

        <NewNoteTypeModal
          isOpen={isTypeSelectorOpen}
          onClose={() => setIsTypeSelectorOpen(false)}
          onSelectType={handleSelectNoteType}
        />

        <NoteModal />
      </main>
    </div>
  );
}
