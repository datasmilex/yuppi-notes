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
  } = useNotes();
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isCollapsedDesktop, setIsCollapsedDesktop] = useState(false);

  // Keyboard shortcut: Press Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectNoteType = (kind: 'quick' | 'comprehensive') => {
    setNewNoteKind(kind);
    setIsTypeSelectorOpen(false);
    setIsCreateModalOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#FFFDF9] via-[#FAF5FF] to-[#F0FDF4]">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        isCollapsedDesktop={isCollapsedDesktop}
        onToggleDesktop={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header onOpenMobileMenu={() => setIsOpenMobile(true)} />
        <NotesBoard />

        {/* Mobile Floating Action Button (FAB) */}
        <button
          onClick={() => setIsTypeSelectorOpen(true)}
          className="md:hidden fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-xl shadow-pink-500/30 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
          title="Yeni Not Ekle"
        >
          <Plus className="w-7 h-7" />
        </button>

        {/* 2-Option Selector Modal: Kopyalanabilir vs Detaylı Kapsamlı Not */}
        <NewNoteTypeModal
          isOpen={isTypeSelectorOpen}
          onClose={() => setIsTypeSelectorOpen(false)}
          onSelectType={handleSelectNoteType}
        />

        {/* Full-Page Editor Modal */}
        <NoteModal />
      </main>
    </div>
  );
}
