'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Note, NoteColor, NoteFont, NoteKind, NoteScope } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { RichEditor } from './RichEditor';
import { FontSelector } from './FontSelector';
import { ColorPicker } from './ColorPicker';
import { ImageGallery } from '../Card/ImageGallery';
import { StickerPicker } from './StickerPicker';
import { NOTE_COLORS, NOTE_FONTS } from '../../utils/colors';
import { StickerItem } from '../../utils/stickers';
import { copyText, noteToText, uid } from '../../utils/text';
import { normalizeTag } from '../../utils/notes';
import {
  ArrowLeft,
  Pin,
  Folder as FolderIcon,
  ImagePlus,
  Trash2,
  Smile,
  Check,
  Palette,
  Type,
  X,
  Copy,
  PenTool,
  Share2,
  Hash,
} from 'lucide-react';

interface Draft {
  title: string;
  content: string;
  kind: NoteKind;
  color: NoteColor;
  font: NoteFont;
  folderId: string;
  isPinned: boolean;
  images: string[];
  stickers: string[];
  tags: string[];
}

const EMPTY_DRAFT: Draft = {
  title: '',
  content: '',
  kind: 'comprehensive',
  color: 'yellow',
  font: 'sans',
  folderId: 'all_local',
  isPinned: false,
  images: [],
  stickers: [],
  tags: [],
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function formatFullDate(timestamp: number) {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Görsel açılamadı'));
      img.onload = () => {
        const maxDim = 1200;
        const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * ratio));
        canvas.height = Math.max(1, Math.round(img.height * ratio));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas desteklenmiyor'));
          return;
        }
        // PNG saydamlığı JPEG'e çevrilince siyah kalmasın
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export const NoteModal: React.FC = () => {
  const {
    notes,
    activeNoteForEdit,
    setActiveNoteForEdit,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newNoteKind,
    createNote,
    updateNote,
    deleteNote,
    scopeFolders,
    activeFolderId,
    activeScope,
    allTags,
  } = useNotes();
  const { showToast } = useToast();

  const sessionKey = activeNoteForEdit ? activeNoteForEdit.id : isCreateModalOpen ? 'new' : null;
  const isOpen = sessionKey !== null;

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [persisted, setPersisted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showFontPopover, setShowFontPopover] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Oturum boyunca değişmeyen / en güncel tutulan değerler
  const draftRef = useRef<Draft>(EMPTY_DRAFT);
  const dirtyRef = useRef(false);
  const idRef = useRef('');
  const createdRef = useRef(false);
  const scopeRef = useRef<NoteScope>('local');
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Not açıldığında (veya yeni not başlatıldığında) taslağı yükle
  useEffect(() => {
    if (sessionKey === null) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    let next: Draft;
    if (activeNoteForEdit) {
      idRef.current = activeNoteForEdit.id;
      createdRef.current = true;
      scopeRef.current = activeNoteForEdit.scope;
      next = {
        title: activeNoteForEdit.title,
        content: activeNoteForEdit.content,
        kind: activeNoteForEdit.kind || 'comprehensive',
        color: activeNoteForEdit.color,
        font: activeNoteForEdit.font,
        folderId: activeNoteForEdit.folderId,
        isPinned: activeNoteForEdit.isPinned,
        images: activeNoteForEdit.images || [],
        stickers: activeNoteForEdit.stickers || [],
        tags: activeNoteForEdit.tags || [],
      };
    } else {
      idRef.current = uid();
      createdRef.current = false;
      scopeRef.current = activeScope;
      next = {
        ...EMPTY_DRAFT,
        kind: newNoteKind || 'comprehensive',
        folderId:
          activeFolderId && !activeFolderId.startsWith('all_')
            ? activeFolderId
            : activeScope === 'local'
            ? 'all_local'
            : 'all_shared',
      };
    }

    draftRef.current = next;
    dirtyRef.current = false;
    setDraft(next);
    setPersisted(createdRef.current);
    setSaveStatus('saved');
    setTagInput('');
    // Yalnızca not oturumu değiştiğinde çalışmalı; aksi halde uzaktan gelen güncellemeler yazılanı sıfırlar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionKey]);

  const saveNow = () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!dirtyRef.current) return;
    const d = draftRef.current;

    const isEmpty =
      !d.title.trim() && !stripTags(d.content).trim() && d.images.length === 0 && d.stickers.length === 0;
    if (isEmpty && !createdRef.current) return; // boş yeni notu kaydetme

    dirtyRef.current = false;
    const fields = {
      title: d.title,
      content: d.content,
      kind: d.kind,
      color: d.color,
      font: d.font,
      folderId: d.folderId,
      isPinned: d.isPinned,
      images: d.images,
      stickers: d.stickers,
      tags: d.tags,
    };

    if (createdRef.current) {
      const existing = notesRef.current.find((n) => n.id === idRef.current) || activeNoteForEdit;
      if (existing) updateNote({ ...existing, ...fields });
    } else {
      createNote({ ...fields, id: idRef.current, scope: scopeRef.current });
      createdRef.current = true;
      setPersisted(true);
    }
    setSaveStatus('saved');
  };
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  const update = (patch: Partial<Draft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    dirtyRef.current = true;
    setDraft(next);
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveNowRef.current(), 300);
  };
  const updateRef = useRef(update);
  updateRef.current = update;

  const handleClose = () => {
    saveNow();
    setShowColorPopover(false);
    setShowFontPopover(false);
    setShowStickerPicker(false);
    setActiveNoteForEdit(null);
    setIsCreateModalOpen(false);
  };
  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  // Esc ile kapat (açık bir açılır pencere varsa önce onu kapat)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || showStickerPicker) return;
      if (showColorPopover || showFontPopover) {
        setShowColorPopover(false);
        setShowFontPopover(false);
        return;
      }
      handleCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, showStickerPicker, showColorPopover, showFontPopover]);

  // Sekme kapanırken/arka plana giderken bekleyen kaydı yaz
  useEffect(() => {
    if (!isOpen) return;
    const flush = () => saveNowRef.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isOpen]);

  const stats = useMemo(() => {
    const plain = stripTags(draft.content).trim();
    const words = plain ? plain.split(/\s+/).length : 0;
    return { words, chars: plain.replace(/\s/g, '').length, minutes: Math.max(1, Math.ceil(words / 200)) };
  }, [draft.content]);

  if (!isOpen) return null;

  const colorConfig = NOTE_COLORS[draft.color] || NOTE_COLORS.yellow;
  const fontConfig = NOTE_FONTS.find((f) => f.id === draft.font) || NOTE_FONTS[0];
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const timestamp = (activeNoteForEdit && activeNoteForEdit.updatedAt) || Date.now();

  const handleCopyNote = async () => {
    const ok = await copyText(noteToText(draft.title, draft.content));
    if (ok) {
      setCopied(true);
      showToast('Not panoya kopyalandı! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    } else {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({ title: draft.title || 'YuPPi Notu', text: noteToText(draft.title, draft.content) });
    } catch {
      // kullanıcı paylaşımı iptal etti
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (files.length === 0) return;

    const results = await Promise.allSettled(files.map(compressImage));
    const added = results.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
    if (added.length > 0) updateRef.current({ images: [...draftRef.current.images, ...added] });
    if (added.length < files.length) showToast('Bazı görseller eklenemedi.', 'error');
  };

  const handleAddSticker = (sticker: StickerItem) => {
    update({ stickers: [...draft.stickers, sticker.content] });
    showToast(`Sticker eklendi: ${sticker.content}`, 'success');
  };

  const commitTag = (raw: string) => {
    const tag = normalizeTag(raw);
    setTagInput('');
    if (tag && !draft.tags.includes(tag)) update({ tags: [...draft.tags, tag] });
  };

  const handleDelete = () => {
    const id = idRef.current;
    if (!createdRef.current) {
      handleClose();
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    dirtyRef.current = false;
    setActiveNoteForEdit(null);
    setIsCreateModalOpen(false);
    deleteNote(id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto animate-fade-in bg-white"
      style={{ borderTop: `6px solid ${colorConfig.borderHex}` }}
    >
      <div className="sticky top-0 z-30 bg-white border-b border-black/8 px-3 sm:px-8 py-2.5 flex items-center justify-between gap-2 shadow-xs">
        {/* Left: Back & Live Save Status */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-gray-100 border border-black/10 text-xs sm:text-sm font-bold text-gray-800 shadow-2xs hover:scale-102 active:scale-98 transition-all"
            title="Kaydet ve panoya dön (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Panoya Dön</span>
          </button>

          {/* Mode Switcher Toggle */}
          <div className="hidden md:flex items-center p-1 bg-gray-100/90 rounded-2xl border border-black/5 gap-1">
            <button
              type="button"
              onClick={() => update({ kind: 'quick' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                draft.kind === 'quick' ? 'bg-amber-400 text-amber-950 shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Kopyalanabilir Not</span>
            </button>
            <button
              type="button"
              onClick={() => update({ kind: 'comprehensive' })}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                draft.kind === 'comprehensive' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Detaylı Kapsamlı Not</span>
            </button>
          </div>

          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-black/5 shadow-2xs"
            aria-live="polite"
          >
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-800 hidden xs:inline">Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 hidden xs:inline">Kaydedildi</span>
              </>
            )}
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-1.5 sm:gap-2 justify-end overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={handleCopyNote}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
            }`}
            title="Tüm Not İçeriğini Panoya Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
          </button>

          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="flex-shrink-0 p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-700 transition-all shadow-2xs"
              title="Paylaş"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {/* Folder Selector */}
          <div className="flex-shrink-0 flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-black/10 text-xs font-bold text-gray-700 shadow-2xs">
            <FolderIcon className="w-3.5 h-3.5 text-purple-600" />
            <select
              value={draft.folderId}
              onChange={(e) => update({ folderId: e.target.value })}
              className="bg-transparent outline-hidden cursor-pointer max-w-[110px] truncate"
              aria-label="Klasör"
            >
              {scopeFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowStickerPicker(true)}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 text-xs font-bold transition-all shadow-2xs"
            title="Nota Sticker Yapıştır"
          >
            <Smile className="w-3.5 h-3.5 text-pink-600" />
            <span className="hidden lg:inline">Sticker</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition-all shadow-2xs"
            title="Görsel Ekle"
          >
            <ImagePlus className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden lg:inline">Fotoğraf</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Color Picker Toggle */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowFontPopover(false);
                setShowColorPopover(!showColorPopover);
              }}
              className="p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-700 transition-all shadow-2xs"
              title="Post-it Rengini Değiştir"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPopover && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowColorPopover(false)} />
                <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-10 z-30 w-72 max-w-[calc(100vw-1.5rem)] p-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in">
                  <ColorPicker
                    selectedColor={draft.color}
                    onSelectColor={(c) => {
                      update({ color: c });
                      setShowColorPopover(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Font Selector Toggle */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowColorPopover(false);
                setShowFontPopover(!showFontPopover);
              }}
              className="p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-700 transition-all shadow-2xs"
              title="Yazı Tipini Değiştir"
            >
              <Type className="w-4 h-4" />
            </button>
            {showFontPopover && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowFontPopover(false)} />
                <div className="fixed sm:absolute right-3 sm:right-0 top-16 sm:top-10 z-30 w-80 max-w-[calc(100vw-1.5rem)] p-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in">
                  <FontSelector
                    selectedFont={draft.font}
                    onSelectFont={(f) => {
                      update({ font: f });
                      setShowFontPopover(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => update({ isPinned: !draft.isPinned })}
            className={`flex-shrink-0 p-1.5 rounded-xl border transition-all ${
              draft.isPinned
                ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm'
                : 'bg-white hover:bg-gray-50 border-black/10 text-gray-700 shadow-2xs'
            }`}
            title={draft.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
          >
            <Pin className={`w-4 h-4 ${draft.isPinned ? 'fill-current' : ''}`} />
          </button>

          {persisted && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex-shrink-0 p-1.5 rounded-xl text-red-600 hover:bg-red-100/70 transition-colors"
              title="Notu Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="flex-shrink-0 px-4 py-1.5 rounded-xl bg-gray-950 hover:bg-black text-white text-xs font-bold shadow-md transition-transform hover:scale-102"
          >
            Bitti
          </button>
        </div>
      </div>

      {/* Main Full-Screen Writing Canvas */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-10 flex flex-col">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
              {draft.kind === 'comprehensive' ? <PenTool className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </span>
            <span className="text-xs font-bold text-gray-700">
              {draft.kind === 'comprehensive' ? '📝 Detaylı Tam Sayfa Not' : '📋 Kopyalanabilir Pratik Not'}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-gray-500">{formatFullDate(timestamp)}</div>
        </div>

        {/* Stickers Banner */}
        {draft.stickers.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap p-2.5 rounded-2xl bg-white border border-black/5 shadow-2xs">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-pink-500" />
              Çıkartmalar:
            </span>
            {draft.stickers.map((stk, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs text-sm font-bold border border-black/5 animate-scale-in"
              >
                <span>{stk}</span>
                <button
                  type="button"
                  onClick={() => update({ stickers: draft.stickers.filter((_, idx) => idx !== i) })}
                  className="text-gray-400 hover:text-red-500 p-0.5 rounded-full"
                  aria-label="Çıkartmayı kaldır"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Photos Preview Frame */}
        {draft.images.length > 0 && (
          <div className="mb-6">
            <ImageGallery
              images={draft.images}
              noteTitle={draft.title}
              isEditable={true}
              onRemoveImage={(index) => update({ images: draft.images.filter((_, idx) => idx !== index) })}
            />
          </div>
        )}

        <input
          type="text"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder="Not Başlığı..."
          className={`w-full bg-transparent text-2xl sm:text-4xl font-extrabold text-gray-900 placeholder-black/30 outline-hidden mb-3 ${fontConfig.cssClass}`}
          autoFocus={!activeNoteForEdit}
        />

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <Hash className="w-4 h-4 text-gray-400" />
          {draft.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold"
            >
              #{tag}
              <button
                type="button"
                onClick={() => update({ tags: draft.tags.filter((t) => t !== tag) })}
                className="p-0.5 rounded-full hover:bg-purple-200"
                aria-label={`#${tag} etiketini kaldır`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            list="yuppi-tag-suggestions"
            onChange={(e) => {
              const v = e.target.value;
              if (v.endsWith(',') || v.endsWith(' ')) commitTag(v);
              else setTagInput(v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitTag(tagInput);
              } else if (e.key === 'Backspace' && !tagInput && draft.tags.length > 0) {
                update({ tags: draft.tags.slice(0, -1) });
              }
            }}
            onBlur={() => tagInput && commitTag(tagInput)}
            placeholder={draft.tags.length ? 'etiket ekle' : 'Etiket ekle (Enter)'}
            className="min-w-[110px] flex-1 bg-transparent text-base sm:text-xs font-semibold text-gray-700 placeholder-black/30 outline-hidden"
            maxLength={30}
          />
          <datalist id="yuppi-tag-suggestions">
            {allTags
              .filter((t) => !draft.tags.includes(t.tag))
              .map((t) => (
                <option key={t.tag} value={t.tag} />
              ))}
          </datalist>
        </div>

        {/* Rich Text Editor */}
        <div className="flex-1 flex flex-col">
          <RichEditor
            value={draft.content}
            onChange={(html) => update({ content: html })}
            fontClass={fontConfig.cssClass}
            placeholder={
              draft.kind === 'comprehensive'
                ? 'Sayfanıza notlarınızı, fikirlerinizi veya listelerinizi yazmaya başlayın...'
                : 'Kopyalanabilir notunuzun içeriğini buraya yazın...'
            }
            fullHeight={true}
          />
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-4 text-[11px] font-semibold text-gray-500">
          <span>{stats.words} kelime</span>
          <span>{stats.chars} karakter</span>
          <span>~{stats.minutes} dk okuma</span>
          <span className="ml-auto hidden sm:inline">Esc ile kaydet ve kapat</span>
        </div>
      </div>

      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleAddSticker}
      />
    </div>
  );
};
