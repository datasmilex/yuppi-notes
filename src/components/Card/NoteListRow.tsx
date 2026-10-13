'use client';

import React, { useMemo } from 'react';
import { Note } from '../../types/note';
import { NOTE_COLORS } from '../../utils/colors';
import { formatRelativeTime, formatReminder } from '../../utils/date';
import { htmlToPlainText } from '../../utils/text';
import { checklistProgress } from '../../utils/checklist';
import { trashDaysLeft } from '../../utils/notes';
import { HighlightText } from './HighlightText';
import { useNotes } from '../../context/NotesContext';
import { useUI } from '../../context/UIContext';
import { useToast } from '../Common/Toast';
import { useConfirm } from '../Common/Confirm';
import {
  Pin,
  Archive,
  ArchiveRestore,
  Trash2,
  RotateCcw,
  BellRing,
  GripVertical,
  CheckCircle2,
  Circle,
  ImageIcon,
  CheckSquare,
} from 'lucide-react';

interface NoteListRowProps {
  note: Note;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

/** Liste görünümü: yoğun, taranabilir satır; sağda hızlı eylemler. */
export const NoteListRow: React.FC<NoteListRowProps> = ({ note, dragHandleProps }) => {
  const { folders, togglePin, setArchived, deleteNote, restoreNote, deleteForever, setActiveNoteForEdit, searchQuery } = useNotes();
  const { selectMode, selectedIds, toggleSelected } = useUI();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const color = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
  const folder = folders.find((f) => f.id === note.folderId);
  const isTrashed = Boolean(note.deletedAt);
  const isSelected = selectedIds.has(note.id);
  const snippet = useMemo(() => htmlToPlainText(note.content).replace(/\s+/g, ' ').slice(0, 180), [note.content]);
  const progress = useMemo(() => checklistProgress(note.content), [note.content]);
  const reminderOverdue = Boolean(note.reminderAt && note.reminderAt <= Date.now());

  const onClick = (e: React.MouseEvent) => {
    if (selectMode || e.shiftKey) {
      e.preventDefault();
      toggleSelected(note.id);
      return;
    }
    if (!isTrashed) setActiveNoteForEdit(note);
  };

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  const removeForever = async () => {
    const ok = await confirm({
      title: 'Kalıcı olarak silinsin mi?',
      message: 'Bu not ve sürüm geçmişi tamamen silinecek. Bu işlem geri alınamaz.',
      confirmLabel: 'Kalıcı Olarak Sil',
      danger: true,
    });
    if (ok) deleteForever(note.id);
  };

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-stretch gap-3 pl-2 pr-3 py-3 rounded-2xl bg-white border transition-all ${
        isSelected ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      } ${isTrashed && !selectMode ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
    >
      <span className="w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color.accent }} aria-hidden="true" />

      <div className="flex items-center gap-1 flex-shrink-0">
        {(selectMode || isSelected) && (
          <button type="button" onClick={stop(() => toggleSelected(note.id))} aria-pressed={isSelected} aria-label="Seç">
            {isSelected ? <CheckCircle2 className="w-5 h-5 text-white fill-purple-600" /> : <Circle className="w-5 h-5 text-gray-400" />}
          </button>
        )}
        {dragHandleProps && !selectMode && !isTrashed && (
          <div
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
            className="p-0.5 rounded-lg text-gray-300 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
            title="Sürükle & Sırala"
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          {note.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-current flex-shrink-0" />}
          <h3 className="text-sm font-extrabold text-gray-900 truncate">
            <HighlightText text={note.title || 'Başlıksız Not'} query={searchQuery} />
          </h3>
          {note.stickers?.slice(0, 2).map((s, i) => (
            <span key={i} className="hidden sm:inline text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700 flex-shrink-0">
              {s}
            </span>
          ))}
        </div>
        {snippet && <p className="text-xs text-gray-500 truncate mt-0.5">{snippet}</p>}
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5 text-[11px] font-semibold text-gray-500">
          {folder && !folder.id.startsWith('all_') && (
            <span className="px-2 py-0.5 rounded-full bg-gray-100">
              {folder.emoji} {folder.name}
            </span>
          )}
          {note.reminderAt && !isTrashed && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${reminderOverdue ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-800'}`}>
              <BellRing className="w-3 h-3" />
              {formatReminder(note.reminderAt)}
            </span>
          )}
          {progress.total > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              <CheckSquare className="w-3 h-3" />
              {progress.done}/{progress.total}
            </span>
          )}
          {note.images.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ImageIcon className="w-3 h-3" />
              {note.images.length}
            </span>
          )}
          {(note.tags || []).slice(0, 3).map((t) => (
            <span key={t} className="text-purple-700">
              #{t}
            </span>
          ))}
          {note.isArchived && !isTrashed && (
            <span className="inline-flex items-center gap-1 text-gray-500">
              <Archive className="w-3 h-3" /> Arşiv
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-1 flex-shrink-0">
        <span className="text-[11px] font-semibold text-gray-400 whitespace-nowrap">
          {isTrashed ? `${trashDaysLeft(note)} gün kaldı` : formatRelativeTime(note.updatedAt)}
        </span>
        {!selectMode && (
          <div className="flex items-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {isTrashed ? (
              <>
                <RowButton title="Geri yükle" onClick={stop(() => { restoreNote(note.id); showToast('Not geri yüklendi. ♻️', 'success'); })}>
                  <RotateCcw className="w-4 h-4" />
                </RowButton>
                <RowButton title="Kalıcı olarak sil" danger onClick={stop(removeForever)}>
                  <Trash2 className="w-4 h-4" />
                </RowButton>
              </>
            ) : (
              <>
                <RowButton title={note.isPinned ? 'Sabitlemeyi kaldır' : 'Sabitle'} onClick={stop(() => togglePin(note.id))}>
                  <Pin className={`w-4 h-4 ${note.isPinned ? 'fill-current text-amber-500' : ''}`} />
                </RowButton>
                <RowButton title={note.isArchived ? 'Arşivden çıkar' : 'Arşivle'} onClick={stop(() => setArchived(note.id, !note.isArchived))}>
                  {note.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </RowButton>
                <RowButton title="Çöp kutusuna taşı" danger onClick={stop(() => deleteNote(note.id))}>
                  <Trash2 className="w-4 h-4" />
                </RowButton>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const RowButton: React.FC<{ title: string; onClick: (e: React.MouseEvent) => void; danger?: boolean; children: React.ReactNode }> = ({
  title,
  onClick,
  danger,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    aria-label={title}
    className={`p-1.5 rounded-lg transition-colors ${danger ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-100'}`}
  >
    {children}
  </button>
);
