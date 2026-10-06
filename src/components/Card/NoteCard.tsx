'use client';

import React, { useState, useRef } from 'react';
import { Note, NoteSize } from '../../types/note';
import { NOTE_COLORS, NOTE_FONTS } from '../../utils/colors';
import { formatRelativeTime } from '../../utils/date';
import { ImageGallery } from './ImageGallery';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import {
  Pin,
  Copy,
  Check,
  MoreVertical,
  Trash2,
  CopyPlus,
  GripVertical,
  Edit3,
  Scaling,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  dragHandleProps?: any;
}

const SIZE_PRESETS: { id: NoteSize; label: string; icon: string }[] = [
  { id: 'small', label: 'Küçük (Mini)', icon: '▫️' },
  { id: 'medium', label: 'Standart', icon: '◽' },
  { id: 'large', label: 'Geniş (2 Sütun)', icon: '◻️' },
  { id: 'full', label: 'Tam Satır', icon: '⬜' },
];

export const NoteCard: React.FC<NoteCardProps> = ({ note, dragHandleProps }) => {
  const { togglePin, deleteNote, duplicateNote, setActiveNoteForEdit, updateNote, folders } = useNotes();
  const { showToast } = useToast();
  const [copied, setCopied] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [liveHeight, setLiveHeight] = useState<number | null>(note.customHeight || null);

  const cardRef = useRef<HTMLDivElement>(null);

  const colorConfig = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
  const fontConfig = NOTE_FONTS.find((f) => f.id === note.font) || NOTE_FONTS[0];
  const folder = folders.find((f) => f.id === note.folderId);

  // One-click copy handler
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = note.content;
      const plainContent = tempDiv.innerText || tempDiv.textContent || '';
      const textToCopy = `${note.title}\n\n${plainContent}`;

      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showToast('Not içeriği panoya kopyalandı! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleCardClick = () => {
    if (!isResizing) {
      setActiveNoteForEdit(note);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (window.confirm('Bu notu silmek istediğinden emin misin? 🗑️')) {
      deleteNote(note.id);
      showToast('Not çöpe atıldı.', 'info');
    }
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    duplicateNote(note);
    showToast('Notun kopyası oluşturuldu! ✨', 'success');
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(note.id);
    showToast(
      note.isPinned ? 'Not sabitlemesi kaldırıldı.' : 'Not başa sabitlendi! 📌',
      'info'
    );
  };

  const handleSizeChange = (e: React.MouseEvent, newSize: NoteSize) => {
    e.stopPropagation();
    setSizeMenuOpen(false);
    updateNote({ ...note, size: newSize });
    showToast(`Boyut değiştirildi: ${newSize}`, 'info');
  };

  // Drag-to-resize handle (mouse & touch)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const currentHeight = cardRef.current?.offsetHeight || 220;
    setIsResizing(true);

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvt ? moveEvt.touches[0].clientY : moveEvt.clientY;
      const delta = currentY - startY;
      const newHeight = Math.max(120, Math.min(850, currentHeight + delta));
      setLiveHeight(newHeight);
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      setIsResizing(false);

      if (cardRef.current) {
        const finalH = cardRef.current.offsetHeight;
        updateNote({ ...note, customHeight: finalH });
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  };

  // Determine padding and text sizing based on note.size
  const isSmall = note.size === 'small';
  const isLarge = note.size === 'large' || note.size === 'full';

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className={`group relative rounded-3xl transition-all duration-200 cursor-pointer border-2 hover:-translate-y-0.5 select-none ${
        isSmall ? 'p-3.5' : isLarge ? 'p-6' : 'p-5'
      } ${colorConfig.bgClass} ${colorConfig.borderClass} ${colorConfig.textClass} hover:shadow-postit-hover shadow-postit mb-5 flex flex-col justify-between`}
      style={{
        minHeight: liveHeight ? `${liveHeight}px` : isSmall ? '130px' : isLarge ? '260px' : '180px',
        boxShadow: `0 10px 25px -5px ${colorConfig.borderHex}40, 0 4px 10px -2px rgba(0, 0, 0, 0.04)`,
      }}
    >
      {/* Tape decoration effect */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/40 backdrop-blur-xs rounded-sm rotate-1 shadow-2xs pointer-events-none border border-black/5" />

      {/* Resizing tooltip indicator while dragging */}
      {isResizing && liveHeight && (
        <div className="absolute -top-8 right-2 z-30 px-2 py-0.5 rounded-lg bg-black text-white text-[11px] font-bold shadow-md">
          📐 {Math.round(liveHeight)}px
        </div>
      )}

      {/* Top Card Area: Header & Body */}
      <div>
        {/* Header bar: Drag Handle, Folder Tag, Size Picker, Pin, Copy, Menu */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {/* Drag Handle for Reordering */}
            <div
              {...dragHandleProps}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-black/30 hover:text-black/70 hover:bg-black/5 cursor-grab active:cursor-grabbing transition-colors"
              title="Sürükle & Sırala"
            >
              <GripVertical className="w-4 h-4" />
            </div>

            {/* Folder Tag */}
            {folder && !folder.id.startsWith('all_') && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-md bg-white/60 border border-white/80 shadow-2xs truncate max-w-[120px]"
                title={folder.name}
              >
                <span>{folder.emoji}</span>
                <span className="truncate">{folder.name}</span>
              </span>
            )}
          </div>

          {/* Action icons */}
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {/* Size Picker Dropdown Button */}
            <div className="relative">
              <button
                onClick={() => setSizeMenuOpen(!sizeMenuOpen)}
                className="p-1.5 rounded-xl text-black/40 hover:text-black/80 hover:bg-black/5 transition-colors"
                title="Kart Boyutunu Değiştir"
              >
                <Scaling className="w-3.5 h-3.5" />
              </button>

              {sizeMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSizeMenuOpen(false);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 z-30 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 text-xs font-semibold text-gray-700 animate-scale-in"
                  >
                    <div className="px-2.5 py-1 text-[10px] uppercase font-bold text-gray-400">
                      Kart Boyutu
                    </div>
                    {SIZE_PRESETS.map((sz) => (
                      <button
                        key={sz.id}
                        onClick={(e) => handleSizeChange(e, sz.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors text-left ${
                          (note.size || 'medium') === sz.id
                            ? 'bg-purple-100 text-purple-900 font-bold'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <span>{sz.label}</span>
                        <span>{sz.icon}</span>
                      </button>
                    ))}
                    {note.customHeight && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSizeMenuOpen(false);
                          setLiveHeight(null);
                          updateNote({ ...note, customHeight: undefined });
                          showToast('Yükseklik sıfırlandı.', 'info');
                        }}
                        className="w-full mt-1 px-2.5 py-1 text-[11px] text-gray-400 hover:text-gray-700 text-left border-t border-gray-100"
                      >
                        Özel Yüksekliği Sıfırla
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Pin Button */}
            <button
              onClick={handlePin}
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                note.isPinned
                  ? 'bg-amber-400/90 text-amber-950 shadow-sm scale-105'
                  : 'text-black/40 hover:text-black/80 hover:bg-black/5'
              }`}
              title={note.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
            </button>

            {/* Quick Copy Button */}
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                copied
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-black/40 hover:text-black/80 hover:bg-black/5'
              }`}
              title="Tüm Notu Kopyala"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Options Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-xl text-black/40 hover:text-black/80 hover:bg-black/5 transition-colors"
                title="Diğer Seçenekler"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-8 z-30 w-36 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 py-1.5 text-xs font-medium text-gray-700 animate-scale-in"
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveNoteForEdit(note);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Düzenle
                    </button>
                    <button
                      onClick={handleDuplicate}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                      Kopyasını Al
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Sil
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        {note.images && note.images.length > 0 && (
          <ImageGallery images={note.images} noteTitle={note.title} />
        )}

        {/* OneNote Drawing Preview */}
        {note.drawingData && (
          <div className="relative mb-3 overflow-hidden rounded-2xl border-2 border-white/80 shadow-xs bg-white/90 aspect-[16/9] flex items-center justify-center">
            <img
              src={note.drawingData}
              alt="OneNote Çizimi"
              className="w-full h-full object-contain"
              loading="lazy"
            />
            <span className="absolute bottom-1.5 right-2 text-[10px] font-bold text-purple-800 bg-purple-100/90 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-purple-200 shadow-2xs">
              ✍️ Çizim
            </span>
          </div>
        )}

        {/* Stickers on Card */}
        {note.stickers && note.stickers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {note.stickers.map((stk, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-lg bg-white/70 backdrop-blur-2xs border border-black/5 shadow-2xs font-extrabold"
              >
                {stk}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3
          className={`font-bold tracking-tight mb-2 leading-snug line-clamp-2 ${fontConfig.cssClass} ${
            isSmall ? 'text-base' : isLarge ? 'text-xl' : 'text-lg'
          }`}
        >
          {note.title}
        </h3>

        {/* Content Preview */}
        <div
          className={`opacity-90 leading-relaxed mb-4 prose prose-sm max-w-none ${fontConfig.cssClass} ${
            isSmall ? 'text-xs line-clamp-3' : isLarge ? 'text-base line-clamp-10' : 'text-sm line-clamp-6'
          }`}
          dangerouslySetInnerHTML={{ __html: note.content }}
        />
      </div>

      {/* Card Footer: Signature / Author Badge AND Drag-to-Resize Handle */}
      <div className="pt-3 border-t border-black/8 flex items-center justify-between text-xs opacity-75 mt-auto relative">
        {/* Author Badge */}
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-2xs flex-shrink-0"
            style={{ backgroundColor: note.lastEditedBy?.userColor || '#F59E0B' }}
          >
            {note.lastEditedBy?.userAvatar || '👤'}
          </span>
          <span className="font-semibold truncate max-w-[90px]">
            {note.lastEditedBy?.userName || 'Anonim'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Time ago */}
          <span className="text-[11px] font-medium whitespace-nowrap">
            {formatRelativeTime(note.lastEditedBy?.timestamp || note.updatedAt)}
          </span>

          {/* Interactive Drag-to-Resize Handle in bottom-right corner */}
          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            onClick={(e) => e.stopPropagation()}
            className="p-1 -mr-2 -mb-2 rounded-lg text-black/30 hover:text-black/80 hover:bg-black/10 cursor-se-resize active:cursor-se-resize transition-all hover:scale-125"
            title="Aşağı çekerek boyutu büyüt veya küçült"
          >
            <svg
              className="w-3.5 h-3.5 fill-current"
              viewBox="0 0 16 16"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14ZM14 6H12V4H14V6ZM6 14H4V12H6V14ZM10 10H8V8H10V10Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
