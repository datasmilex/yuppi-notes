'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note } from '../../types/note';
import { NoteCard } from '../Card/NoteCard';

interface SortableNoteCardProps {
  note: Note;
}

export const SortableNoteCard: React.FC<SortableNoteCardProps> = ({ note }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const getColSpanClass = () => {
    switch (note.size) {
      case 'full':
        return 'col-span-full';
      case 'large':
        return 'col-span-1 sm:col-span-2';
      default:
        return 'col-span-1';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-full ${getColSpanClass()}`}
    >
      <NoteCard note={note} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};
