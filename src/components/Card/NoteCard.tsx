'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Note } from '../../types/note';
import { NOTE_COLORS, NOTE_FONTS } from '../../utils/colors';
import { formatRelativeTime } from '../../utils/date';
import { sanitizeHtml } from '../../utils/sanitize';
import { toggleChecklistItem, checklistProgress } from '../../utils/checklist';
import { copyText, downloadFile, noteToText, safeFileName } from '../../utils/text';
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
  Download,
  Minimize2,
  Share2,
} from 'lucide-react';

interface NoteCardProps {
  note: Note;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export const NoteCard: React.FC<NoteCardProps> = ({ note, dragHandleProps }) => {
  const { togglePin, deleteNote, duplicateNote, setActiveNoteForEdit, patchNote, folders, setActiveTag } = useNotes();
  const { showToast } = useToast();
  const [copied, setCopied] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [liveHeight, setLiveHeight] = useState<number | null>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const colorConfig = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
  const fontConfig = NOTE_FONTS.find((f) => f.id === note.font) || NOTE_FONTS[0];
  const folder = folders.find((f) => f.id === note.folderId);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Ortak odalardan gelen içerik güvenli hale getirilmeden render edilmez
  const safeContent = useMemo(() => sanitizeHtml(note.content), [note.content]);
  const progress = useMemo(() => checklistProgress(safeContent), [safeContent]);

  // Açık menü başka kartların altında kalmasın; dışarı tıklayınca kapansın
  useEffect(() => {
    if (!menuOpen) return;
    const wrapper = cardRef.current?.parentElement;
    if (wrapper) wrapper.style.zIndex = '40';
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      if (wrapper) wrapper.style.zIndex = '';
    };
  }, [menuOpen]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyText(noteToText(note.title, note.content));
    if (ok) {
      setCopied(true);
      showToast('Not içeriği panoya kopyalandı! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleCardClick = () => {
    if (!isResizing) setActiveNoteForEdit(note);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    deleteNote(note.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    duplicateNote(note);
    showToast('Notun kopyası oluşturuldu! 📋', 'success');
  };

  const handlePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePin(note.id);
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    downloadFile(`${safeFileName(note.title)}.txt`, noteToText(note.title, note.content));
    showToast('Not .txt olarak indirildi.', 'success');
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await navigator.share({ title: note.title, text: noteToText(note.title, note.content) });
    } catch {
      // paylaşım iptal edildi
    }
  };

  // Önizlemedeki yapılacak kutusuna tıklayınca notu açmadan işaretle
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const li = (e.target as HTMLElement).closest('ul[data-checklist] > li') as HTMLElement | null;
    if (!li) return;
    const fontSize = parseFloat(getComputedStyle(li).fontSize) || 14;
    if (e.clientX - li.getBoundingClientRect().left > fontSize * 1.8) return;

    e.stopPropagation();
    const items = Array.from(e.currentTarget.querySelectorAll('ul[data-checklist] > li'));
    const html = toggleChecklistItem(note.content, items.indexOf(li));
    if (html !== null) patchNote(note.id, { content: html });
  };

  // Drag-to-resize handle (mouse & touch)
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!('touches' in e)) e.preventDefault();
    const card = cardRef.current;
    if (!card) return;
    const wrapper = card.parentElement as HTMLElement | null;
    const grid = wrapper?.parentElement as HTMLElement | null;

    const gridStyle = grid ? getComputedStyle(grid) : null;
    const cols = gridStyle ? gridStyle.gridTemplateColumns.split(' ').filter(Boolean).length || 1 : 1;
    const gap = gridStyle ? parseFloat(gridStyle.columnGap) || 20 : 20;
    const colW = grid ? (grid.clientWidth - gap * (cols - 1)) / cols : card.offsetWidth;
    const toSpan = (w: number) => Math.max(1, Math.min(cols, Math.round((w + gap) / (colW + gap))));

    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const startH = card.offsetHeight;
    const startW = card.offsetWidth;
    const maxW = grid ? grid.clientWidth - (wrapper?.offsetLeft || 0) : startW;

    setIsResizing(true);
    if (wrapper) wrapper.style.zIndex = '40';

    let lastW = startW;
    let lastH = startH;

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      const point = 'touches' in moveEvt ? moveEvt.touches[0] : moveEvt;
      lastH = Math.max(120, Math.min(1200, startH + (point.clientY - startY)));
      lastW = Math.max(Math.min(colW, 180), Math.min(maxW, startW + (point.clientX - startX)));
      setLiveHeight(lastH);
      setLiveWidth(lastW);
    };

    const onEnd = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      if (wrapper) wrapper.style.zIndex = '';
      setLiveWidth(null);
      setLiveHeight(null);
      // mouseup'ın karta tıklama sayılmaması için bir tur beklet
      setTimeout(() => setIsResizing(false), 0);
      patchNote(note.id, { customHeight: Math.round(lastH), colSpan: toSpan(lastW), customWidth: undefined });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
  };

  const handleResetSize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    patchNote(note.id, { customHeight: undefined, customWidth: undefined, colSpan: 1, size: 'medium' });
    showToast('Kart boyutu sıfırlandı.', 'info');
  };

  const isSmall = note.size === 'small';
  const isLarge = note.size === 'large' || note.size === 'full';
  const height = liveHeight ?? note.customHeight ?? null;

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className={`paper-scope group relative rounded-3xl transition-shadow duration-200 cursor-pointer border-2 select-none ${
        isSmall ? 'p-3.5' : isLarge ? 'p-6' : 'p-5'
      } ${colorConfig.bgClass} ${colorConfig.borderClass} ${colorConfig.textClass} hover:shadow-postit-hover shadow-postit flex flex-col justify-between`}
      style={{
        minHeight: height ? `${height}px` : isSmall ? '130px' : isLarge ? '260px' : '180px',
        width: liveWidth ? `${liveWidth}px` : undefined,
        boxShadow: `0 10px 25px -5px ${colorConfig.borderHex}40, 0 4px 10px -2px rgba(0, 0, 0, 0.04)`,
      }}
    >
      {/* Tape decoration effect */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-white/40 backdrop-blur-xs rounded-sm rotate-1 shadow-2xs pointer-events-none border border-black/5" />

      {isResizing && (liveHeight || liveWidth) && (
        <div className="absolute -top-8 right-2 z-30 px-2 py-0.5 rounded-lg bg-black text-white text-[11px] font-bold shadow-md">
          📐 {Math.round(liveWidth || cardRef.current?.offsetWidth || 280)}x{Math.round(liveHeight || cardRef.current?.offsetHeight || 220)}px
        </div>
      )}

      <div>
        {/* Header bar: Drag Handle, Folder Tag, Pin, Copy, Menu */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {dragHandleProps && (
              <div
                {...dragHandleProps}
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded-lg text-black/30 hover:text-black/70 hover:bg-black/5 cursor-grab active:cursor-grabbing transition-colors touch-none"
                title="Sürükle & Sırala"
              >
                <GripVertical className="w-4 h-4" />
              </div>
            )}

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

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handlePin}
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                note.isPinned
                  ? 'bg-amber-400/90 text-amber-950 shadow-sm scale-105'
                  : 'text-black/40 hover:text-black/80 hover:bg-black/5'
              }`}
              title={note.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
              aria-label={note.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
            >
              <Pin className={`w-3.5 h-3.5 ${note.isPinned ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-xl transition-all duration-200 ${
                copied ? 'bg-emerald-500 text-white shadow-sm' : 'text-black/40 hover:text-black/80 hover:bg-black/5'
              }`}
              title="Tüm Notu Kopyala"
              aria-label="Tüm Notu Kopyala"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1.5 rounded-xl text-black/40 hover:text-black/80 hover:bg-black/5 transition-colors"
                title="Diğer Seçenekler"
                aria-label="Diğer Seçenekler"
                aria-expanded={menuOpen}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 text-xs font-medium text-gray-700 animate-scale-in">
                  <MenuItem
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    label="Düzenle"
                    onClick={() => {
                      setMenuOpen(false);
                      setActiveNoteForEdit(note);
                    }}
                  />
                  <MenuItem icon={<CopyPlus className="w-3.5 h-3.5" />} label="Kopyasını Al" onClick={handleDuplicate} />
                  <MenuItem icon={<Download className="w-3.5 h-3.5" />} label="Dışa Aktar (.txt)" onClick={handleExport} />
                  {canShare && <MenuItem icon={<Share2 className="w-3.5 h-3.5" />} label="Paylaş" onClick={handleShare} />}
                  {(note.customHeight || (note.colSpan && note.colSpan > 1)) && (
                    <MenuItem icon={<Minimize2 className="w-3.5 h-3.5" />} label="Boyutu Sıfırla" onClick={handleResetSize} muted />
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-left font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sil
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {note.images && note.images.length > 0 && <ImageGallery images={note.images} noteTitle={note.title} />}

        {note.drawingData && (
          <div className="relative mb-3 overflow-hidden rounded-2xl border-2 border-white/80 shadow-xs bg-white/90 aspect-[16/9] flex items-center justify-center">
            <img src={note.drawingData} alt="Detaylı Not Görseli" className="w-full h-full object-contain" loading="lazy" />
          </div>
        )}

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

        <h3
          className={`font-bold tracking-tight mb-2 leading-snug line-clamp-2 ${fontConfig.cssClass} ${
            isSmall ? 'text-base' : isLarge ? 'text-xl' : 'text-lg'
          }`}
        >
          {note.title}
        </h3>

        <div
          onClick={handleContentClick}
          className={`rich-content opacity-90 leading-relaxed mb-3 max-w-none ${fontConfig.cssClass} ${
            isSmall ? 'text-xs line-clamp-3' : isLarge ? 'text-base line-clamp-10' : 'text-sm line-clamp-6'
          }`}
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />

        {progress.total > 0 && (
          <div className="mb-3 flex items-center gap-2 text-[11px] font-bold opacity-80" title="Tamamlanan görevler">
            <div className="flex-1 h-1.5 rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
            <span>
              {progress.done}/{progress.total}
            </span>
          </div>
        )}

        {note.tags && note.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-2" onClick={(e) => e.stopPropagation()}>
            {note.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/8 hover:bg-black/15 transition-colors"
                title={`#${tag} etiketine göre filtrele`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer: Signature / Author Badge AND Drag-to-Resize Handle */}
      <div className="pt-3 border-t border-black/8 flex items-center justify-between text-xs opacity-75 mt-auto relative">
        <div className="flex items-center gap-1.5 overflow-hidden">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-2xs flex-shrink-0"
            style={{ backgroundColor: note.lastEditedBy?.userColor || '#F59E0B' }}
          >
            {note.lastEditedBy?.userAvatar || '👤'}
          </span>
          <span className="font-semibold truncate max-w-[90px]">{note.lastEditedBy?.userName || 'Anonim'}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium whitespace-nowrap">
            {formatRelativeTime(note.lastEditedBy?.timestamp || note.updatedAt)}
          </span>

          <div
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            onClick={(e) => e.stopPropagation()}
            className="p-1 -mr-2 -mb-2 rounded-lg text-black/30 hover:text-black/80 hover:bg-black/10 cursor-se-resize active:cursor-se-resize transition-all hover:scale-125 touch-none"
            title="Sürükleyerek boyutu değiştir"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14ZM14 6H12V4H14V6ZM6 14H4V12H6V14ZM10 10H8V8H10V10Z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  muted?: boolean;
}> = ({ icon, label, onClick, muted }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-2 transition-colors text-left ${
      muted ? 'text-gray-600 hover:bg-gray-100' : 'hover:bg-purple-50 hover:text-purple-700'
    }`}
  >
    {icon}
    {label}
  </button>
);
