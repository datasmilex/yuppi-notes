'use client';

import React, { useState, useEffect } from 'react';
import { Folder } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { ModalShell } from '../Common/ModalShell';
import { FolderPlus } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder?: Folder | null;
}

const EMOJI_PRESETS = [
  '🏖️', '🛒', '🍰', '🎬', '💡', '✈️', '📚', '🎵',
  '💻', '🎯', '🍕', '🌿', '🌸', '⚡', '🐾', '💎',
  '🏋️', '🎨', '💼', '☕', '🚀', '🔑', '❤️', '🍀',
  '🏠', '🎓', '💰', '🩺', '🧘', '🎮', '📷', '🗂️',
];

const COLOR_PRESETS = [
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose, folder = null }) => {
  const { saveFolder, activeScope } = useNotes();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');

  // Her açılışta (yeni ya da düzenleme) alanları sıfırla / doldur
  useEffect(() => {
    if (!isOpen) return;
    setName(folder?.name ?? '');
    setSelectedEmoji(folder?.emoji ?? '📁');
    setSelectedColor(folder?.color ?? '#8B5CF6');
  }, [isOpen, folder]);

  const isEditing = Boolean(folder);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Lütfen klasör adı girin.', 'error');
      return;
    }

    const saved: Folder = {
      id: folder?.id ?? 'folder-' + Date.now(),
      name: trimmed,
      emoji: selectedEmoji,
      color: selectedColor,
      isSystem: false,
      scope: folder?.scope ?? activeScope,
    };

    saveFolder(saved);
    showToast(isEditing ? `"${trimmed}" klasörü güncellendi.` : `"${trimmed}" klasörü oluşturuldu! 📁`, 'success');
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Klasörü Düzenle' : 'Yeni Klasör Oluştur'}
      subtitle={activeScope === 'shared' ? 'Ortak odadaki herkes görür' : 'Yalnızca bu cihazda'}
      icon={<span className="text-lg leading-none">{selectedEmoji}</span>}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            form="folder-form"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-transform active:scale-95"
          >
            <FolderPlus className="w-4 h-4" />
            {isEditing ? 'Değişiklikleri Kaydet' : 'Klasörü Kaydet'}
          </button>
        </>
      }
    >
      <form id="folder-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Önizleme */}
        <div
          className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-gray-100"
          style={{ backgroundColor: `${selectedColor}14` }}
        >
          <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: selectedColor }} />
          <span className="text-lg">{selectedEmoji}</span>
          <span className="text-sm font-bold text-gray-800 truncate">{name.trim() || 'Klasör adı'}</span>
        </div>

        {/* Folder Name */}
        <div>
          <label htmlFor="folder-name" className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
            Klasör Adı
          </label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Gezilecek Yerler, Müzik Listeleri..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base sm:text-sm font-semibold text-gray-800 outline-hidden transition-all"
            maxLength={40}
            autoFocus
          />
        </div>

        {/* Emoji Picker */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Klasör Emojisi</div>
          <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-gray-50 border border-gray-100 max-h-36 overflow-y-auto">
            {EMOJI_PRESETS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setSelectedEmoji(emoji)}
                aria-pressed={selectedEmoji === emoji}
                className={`p-2 rounded-lg text-lg hover:scale-125 transition-transform flex items-center justify-center ${
                  selectedEmoji === emoji ? 'bg-purple-200 ring-2 ring-purple-500' : 'hover:bg-white'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color Picker */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Tema Rengi</div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-label={`Renk ${color}`}
                aria-pressed={selectedColor === color}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                  selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </form>
    </ModalShell>
  );
};
