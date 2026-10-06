'use client';

import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { useNotes } from '../../context/NotesContext';
import { SortableNoteCard } from './SortableNoteCard';
import { NoteCard } from '../Card/NoteCard';
import { QuickStickyCreator } from './QuickStickyCreator';
import { Note } from '../../types/note';
import { Pin, Sparkles, Plus, StickyNote, SearchX, FileEdit } from 'lucide-react';

export const NotesBoard: React.FC = () => {
  const {
    pinnedNotes,
    unpinnedNotes,
    filteredNotes,
    reorderNotes,
    setIsCreateModalOpen,
    searchQuery,
    activeFolderId,
    folders,
    activeScope,
  } = useNotes();

  const [activeDragNote, setActiveDragNote] = useState<Note | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = filteredNotes.find((n) => n.id === active.id);
    if (found) {
      setActiveDragNote(found);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragNote(null);
    if (!over || active.id === over.id) return;
    reorderNotes(String(active.id), String(over.id));
  };

  const currentFolder = folders.find((f) => f.id === activeFolderId);

  // Empty state when filtered search yields nothing
  if (filteredNotes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh] max-w-lg mx-auto">
        <div className="w-20 h-20 mb-5 rounded-3xl bg-amber-100/90 border-2 border-dashed border-amber-300 flex items-center justify-center shadow-inner">
          {searchQuery ? (
            <SearchX className="w-8 h-8 text-amber-700" />
          ) : (
            <StickyNote className="w-8 h-8 text-amber-700 animate-bounce" />
          )}
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">
          {searchQuery
            ? `"${searchQuery}" ile ilgili not bulunamadı`
            : activeScope === 'shared'
            ? 'Ortak panoda henüz not yok'
            : 'Henüz hiç not eklenmedi'}
        </h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          {searchQuery
            ? 'Arama terimini değiştirebilir veya yeni bir not açabilirsin.'
            : activeScope === 'shared'
            ? 'Bu ortak panoya eklediğin tüm notlar davet bağlantısıyla katılan kişilerle anında canlı eşitlenir.'
            : 'Boş bir tam sayfa açarak yazmaya başlayabilir veya hızlı bir yapışkan post-it iliştirebilirsin.'}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs sm:text-sm shadow-md hover:scale-102 active:scale-98 transition-all"
          >
            <FileEdit className="w-4 h-4" />
            Boş Tam Sayfa Notu Aç
          </button>
        </div>

        {/* Quick sticky creator box in empty state */}
        <div className="w-full mt-6 text-left">
          <QuickStickyCreator />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 p-4 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
        {/* Pinned Notes Section */}
        {pinnedNotes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700 shadow-2xs">
                <Pin className="w-4 h-4 fill-current" />
              </span>
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-600">
                Sabitlenen Notlar
              </h2>
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900">
                {pinnedNotes.length}
              </span>
            </div>

            <SortableContext items={pinnedNotes.map((n) => n.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5 grid-flow-dense items-start">
                {pinnedNotes.map((note) => (
                  <SortableNoteCard key={note.id} note={note} />
                ))}
              </div>
            </SortableContext>
          </section>
        )}

        {/* Regular Notes Section with Interstitial Sticky Note option */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700 shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xs font-black uppercase tracking-wider text-gray-600">
                {pinnedNotes.length > 0 ? 'Notlar' : 'Tüm Notlar'}
              </h2>
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-purple-200/70 text-purple-900">
                {unpinnedNotes.length}
              </span>
            </div>
          </div>

          <SortableContext items={unpinnedNotes.map((n) => n.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-5 grid-flow-dense items-start">
              {/* Quick sticky note creator widget inside the masonry grid */}
              <QuickStickyCreator />

              {unpinnedNotes.map((note) => (
                <SortableNoteCard key={note.id} note={note} />
              ))}
            </div>
          </SortableContext>
        </section>
      </div>

      {/* Floating Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragNote ? (
          <div className="w-72 rotate-2 scale-105 shadow-2xl pointer-events-none opacity-90">
            <NoteCard note={activeDragNote} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
