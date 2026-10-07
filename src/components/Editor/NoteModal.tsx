'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Note, NoteColor, NoteFont, NoteScope, NoteKind } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { useUser } from '../../context/UserContext';
import { useToast } from '../Common/Toast';
import { RichEditor } from './RichEditor';
import { FontSelector } from './FontSelector';
import { ColorPicker } from './ColorPicker';
import { ImageGallery } from '../Card/ImageGallery';
import { StickerPicker } from './StickerPicker';
import { NOTE_COLORS, NOTE_FONTS } from '../../utils/colors';
import { StickerItem } from '../../utils/stickers';
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
  FileText,
} from 'lucide-react';

export const NoteModal: React.FC = () => {
  const {
    activeNoteForEdit,
    setActiveNoteForEdit,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newNoteKind,
    createNote,
    updateNote,
    deleteNote,
    folders,
    activeFolderId,
    activeScope,
    currentRoomId,
  } = useNotes();
  const { currentUser } = useUser();
  const { showToast } = useToast();

  const isOpen = Boolean(activeNoteForEdit || isCreateModalOpen);
  const isEditing = Boolean(activeNoteForEdit);

  const [currentId, setCurrentId] = useState<string>('');
  const [kind, setKind] = useState<NoteKind>('comprehensive');
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [drawingData, setDrawingData] = useState<string>('');
  const [showDrawing, setShowDrawing] = useState<boolean>(true);
  const [color, setColor] = useState<NoteColor>('neutral');
  const [font, setFont] = useState<NoteFont>('sans');
  const [folderId, setFolderId] = useState<string>('all_local');
  const [isPinned, setIsPinned] = useState<boolean>(false);
  const [images, setImages] = useState<string[]>([]);
  const [stickers, setStickers] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [copied, setCopied] = useState<boolean>(false);

  const [showColorPopover, setShowColorPopover] = useState(false);
  const [showFontPopover, setShowFontPopover] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef<boolean>(true);

  // Initialize or reset state on open
  useEffect(() => {
    isInitialMount.current = true;
    if (activeNoteForEdit) {
      setCurrentId(activeNoteForEdit.id);
      setKind(activeNoteForEdit.kind || 'comprehensive');
      setTitle(activeNoteForEdit.title);
      setContent(activeNoteForEdit.content);
      setDrawingData(activeNoteForEdit.drawingData || '');
      setShowDrawing(Boolean(activeNoteForEdit.drawingData || activeNoteForEdit.kind === 'comprehensive'));
      setColor(activeNoteForEdit.color);
      setFont(activeNoteForEdit.font);
      setFolderId(activeNoteForEdit.folderId);
      setIsPinned(activeNoteForEdit.isPinned);
      setImages(activeNoteForEdit.images || []);
      setStickers(activeNoteForEdit.stickers || []);
    } else if (isCreateModalOpen) {
      const newId = 'note-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
      setCurrentId(newId);
      setKind(newNoteKind || 'comprehensive');
      setTitle('');
      setContent('');
      setDrawingData('');
      setShowDrawing(newNoteKind === 'comprehensive');
      setColor('yellow');
      setFont('sans');
      setFolderId(
        activeFolderId && activeFolderId !== 'all_local' && activeFolderId !== 'all_shared'
          ? activeFolderId
          : activeScope === 'local'
          ? 'all_local'
          : 'all_shared'
      );
      setIsPinned(false);
      setImages([]);
      setStickers([]);
    }
    setSaveStatus('saved');
    setTimeout(() => {
      isInitialMount.current = false;
    }, 100);
  }, [activeNoteForEdit, isCreateModalOpen, newNoteKind, activeFolderId, activeScope]);

  // Instant Auto-Save on any change
  const triggerAutoSave = useCallback(
    (
      newTitle: string,
      newContent: string,
      newDrawingData: string,
      newKind: NoteKind,
      newColor: NoteColor,
      newFont: NoteFont,
      newFolderId: string,
      newPinned: boolean,
      newImages: string[],
      newStickers: string[]
    ) => {
      if (isInitialMount.current) return;
      if (!currentId) return;
      if (
        !newTitle.trim() &&
        !newContent.trim() &&
        !newDrawingData &&
        newImages.length === 0 &&
        newStickers.length === 0
      ) {
        return;
      }

      setSaveStatus('saving');
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        const noteToSave: Note = {
          id: currentId,
          title: newTitle.trim() || 'Başlıksız Not',
          content: newContent,
          kind: newKind,
          drawingData: newDrawingData,
          color: newColor,
          font: newFont,
          folderId: newFolderId,
          isPinned: newPinned,
          order: activeNoteForEdit?.order ?? 0,
          images: newImages,
          stickers: newStickers,
          scope: activeNoteForEdit?.scope || activeScope,
          roomId: activeNoteForEdit?.roomId || currentRoomId,
          lastEditedBy: {
            userId: currentUser.id,
            userName: currentUser.name,
            userAvatar: currentUser.avatar,
            userColor: currentUser.color,
            timestamp: Date.now(),
          },
          createdAt: activeNoteForEdit?.createdAt || Date.now(),
          updatedAt: Date.now(),
        };

        if (isEditing) {
          updateNote(noteToSave);
        } else {
          createNote(noteToSave);
        }
        setSaveStatus('saved');
      }, 250);
    },
    [currentId, isEditing, activeNoteForEdit, activeScope, currentRoomId, currentUser, createNote, updateNote]
  );

  // Watch changes and auto-save
  useEffect(() => {
    if (!isInitialMount.current && isOpen) {
      triggerAutoSave(title, content, drawingData, kind, color, font, folderId, isPinned, images, stickers);
    }
  }, [title, content, drawingData, kind, color, font, folderId, isPinned, images, stickers, triggerAutoSave, isOpen]);

  // Esc closes the editor (auto-save already persisted everything)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showStickerPicker) {
        setActiveNoteForEdit(null);
        setIsCreateModalOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, showStickerPicker, setActiveNoteForEdit, setIsCreateModalOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setActiveNoteForEdit(null);
    setIsCreateModalOpen(false);
  };

  const handleCopyNote = () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plain = tempDiv.innerText || tempDiv.textContent || '';
      const textToCopy = `${title}\n\n${plain}`;
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      showToast('Not panoya kopyalandı! 📋', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Kopyalama başarısız oldu.', 'error');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1200;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setImages((prev) => [...prev, compressed]);
        };
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddSticker = (sticker: StickerItem) => {
    setStickers((prev) => [...prev, sticker.content]);
    showToast(`Sticker eklendi: ${sticker.content}`, 'success');
  };

  const handleRemoveSticker = (idx: number) => {
    setStickers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDelete = () => {
    if (isEditing && activeNoteForEdit) {
      if (window.confirm('Bu notu tamamen silmek istediğinizden emin misiniz?')) {
        deleteNote(activeNoteForEdit.id);
        showToast('Not silindi.', 'info');
        handleClose();
      }
    } else {
      handleClose();
    }
  };

  const colorConfig = NOTE_COLORS[color] || NOTE_COLORS.yellow;
  const fontConfig = NOTE_FONTS.find((f) => f.id === font) || NOTE_FONTS[0];
  const currentScopeFolders = folders.filter((f) => f.scope === (activeNoteForEdit?.scope || activeScope));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto animate-fade-in bg-white"
      style={{ borderTop: `6px solid ${colorConfig.borderHex}` }}
    >
      <div className="sticky top-0 z-30 bg-white border-b border-black/8 px-4 sm:px-8 py-3 flex items-center justify-between gap-3 shadow-xs">
        {/* Left: Back & Live Save Status */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white hover:bg-gray-100 border border-black/10 text-xs sm:text-sm font-bold text-gray-800 shadow-2xs hover:scale-102 active:scale-98 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Panoya Dön</span>
          </button>

          {/* Mode Switcher Toggle: Kopyalanabilir vs Detaylı Kapsamlı Not */}
          <div className="hidden md:flex items-center p-1 bg-gray-100/90 rounded-2xl border border-black/5 gap-1">
            <button
              type="button"
              onClick={() => setKind('quick')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                kind === 'quick'
                  ? 'bg-amber-400 text-amber-950 shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Kopyalanabilir Not</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setKind('comprehensive');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                kind === 'comprehensive'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Detaylı Kapsamlı Not</span>
            </button>
          </div>

          {/* Real-time saving status badge */}
          <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-black/5 shadow-2xs">
            {saveStatus === 'saving' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span className="text-amber-800">Kaydediliyor...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Anlık Kaydedildi</span>
              </>
            )}
          </div>
        </div>

        {/* Right Tools: Copy Button (if quick), Folder, Drawing Toggle, Sticker, Photo, Color, Font, Pin, Delete */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* Quick Copy Button */}
          <button
            type="button"
            onClick={handleCopyNote}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              copied
                ? 'bg-emerald-500 text-white'
                : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
            }`}
            title="Tüm Not İçeriğini Panoya Kopyala"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
          </button>

          {/* Folder Selector */}
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-black/10 text-xs font-bold text-gray-700 shadow-2xs">
            <FolderIcon className="w-3.5 h-3.5 text-purple-600" />
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="bg-transparent outline-hidden cursor-pointer max-w-[120px] truncate"
            >
              {currentScopeFolders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.emoji} {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Sticker Button */}
          <button
            type="button"
            onClick={() => setShowStickerPicker(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pink-100 hover:bg-pink-200 text-pink-800 text-xs font-bold transition-all shadow-2xs"
            title="Nota Sticker Yapıştır"
          >
            <Smile className="w-3.5 h-3.5 text-pink-600" />
            <span className="hidden sm:inline">Sticker</span>
          </button>

          {/* Add Photo Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold transition-all shadow-2xs"
            title="Görsel Ekle"
          >
            <ImagePlus className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Fotoğraf</span>
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
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPopover(!showColorPopover)}
              className="p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-700 transition-all shadow-2xs"
              title="Post-it Rengini Değiştir"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showColorPopover && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowColorPopover(false)} />
                <div className="absolute right-0 top-10 z-30 w-72 p-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in">
                  <ColorPicker
                    selectedColor={color}
                    onSelectColor={(c) => {
                      setColor(c);
                      setShowColorPopover(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Font Selector Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFontPopover(!showFontPopover)}
              className="p-1.5 rounded-xl bg-white hover:bg-gray-50 border border-black/10 text-gray-700 transition-all shadow-2xs"
              title="Yazı Tipini Değiştir"
            >
              <Type className="w-4 h-4" />
            </button>
            {showFontPopover && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setShowFontPopover(false)} />
                <div className="absolute right-0 top-10 z-30 w-80 p-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-scale-in">
                  <FontSelector
                    selectedFont={font}
                    onSelectFont={(f) => {
                      setFont(f);
                      setShowFontPopover(false);
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Pin Toggle */}
          <button
            type="button"
            onClick={() => setIsPinned(!isPinned)}
            className={`p-1.5 rounded-xl border transition-all ${
              isPinned
                ? 'bg-amber-400 text-amber-950 border-amber-500 shadow-sm'
                : 'bg-white hover:bg-gray-50 border-black/10 text-gray-700 shadow-2xs'
            }`}
            title={isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
          >
            <Pin className={`w-4 h-4 ${isPinned ? 'fill-current' : ''}`} />
          </button>

          {/* Delete Button */}
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-xl text-red-600 hover:bg-red-100/70 transition-colors"
              title="Notu Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* Done Button */}
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-xl bg-gray-950 hover:bg-black text-white text-xs font-bold shadow-md transition-transform hover:scale-102"
          >
            Bitti
          </button>
        </div>
      </div>

      {/* Main Full-Screen Writing Canvas */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-10 flex flex-col">
        {/* Banner Indicator */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-black/6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-purple-100 text-purple-700">
              {kind === 'comprehensive' ? <PenTool className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </span>
            <span className="text-xs font-bold text-gray-700">
              {kind === 'comprehensive'
                ? '📝 Detaylı Tam Sayfa Not'
                : '📋 Kopyalanabilir Pratik Not'}
            </span>
          </div>

          <div className="text-[11px] font-semibold text-gray-500">
            {formatRelativeDate()}
          </div>
        </div>

        {/* Stickers Banner */}
        {stickers.length > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap p-2.5 rounded-2xl bg-white border border-black/5 shadow-2xs">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <Smile className="w-3.5 h-3.5 text-pink-500" />
              Çıkartmalar:
            </span>
            {stickers.map((stk, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white shadow-xs text-sm font-bold border border-black/5 animate-scale-in"
              >
                <span>{stk}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSticker(i)}
                  className="text-gray-400 hover:text-red-500 p-0.5 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Photos Preview Frame */}
        {images.length > 0 && (
          <div className="mb-6">
            <ImageGallery
              images={images}
              noteTitle={title}
              isEditable={true}
              onRemoveImage={handleRemoveImage}
            />
          </div>
        )}

        {/* Title Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Not Başlığı..."
          className={`w-full bg-transparent text-2xl sm:text-4xl font-extrabold text-gray-900 placeholder-black/30 outline-hidden mb-5 ${fontConfig.cssClass}`}
          autoFocus={!isEditing}
        />

        {/* Full-Screen Rich Text Editor */}
        <div className="flex-1 flex flex-col">
          <RichEditor
            value={content}
            onChange={setContent}
            fontClass={fontConfig.cssClass}
            placeholder={
              kind === 'comprehensive'
                ? 'Sayfanıza notlarınızı, fikirlerinizi veya listelerinizi yazmaya başlayın...'
                : 'Kopyalanabilir notunuzun içeriğini buraya yazın...'
            }
            fullHeight={true}
          />
        </div>

        {/* Live stats */}
        {(() => {
          const plain = content.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
          const words = plain ? plain.split(/\s+/).length : 0;
          return (
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-4 text-[11px] font-semibold text-gray-500">
              <span>{words} kelime</span>
              <span>{plain.replace(/\s/g, '').length} karakter</span>
              <span>~{Math.max(1, Math.ceil(words / 200))} dk okuma</span>
              <span className="ml-auto hidden sm:inline">Esc ile kapat</span>
            </div>
          );
        })()}
      </div>

      {/* Global Sticker Picker Modal */}
      <StickerPicker
        isOpen={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelectSticker={handleAddSticker}
      />
    </div>
  );
};

function formatRelativeDate() {
  const d = new Date();
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}, ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}
