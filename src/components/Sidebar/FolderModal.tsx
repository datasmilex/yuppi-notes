'use client';

import React, { useState } from 'react';
import { Folder } from '../../types/note';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { X, FolderPlus } from 'lucide-react';

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_PRESETS = [
  '🏖️', '🛒', '🍰', '🎬', '💡', '✈️', '📚', '🎵',
  '💻', '🎯', '🍕', '🌿', '🌸', '⚡', '🐾', '💎',
  '🏋️', '🎨', '💼', '☕', '🚀', '🔑', '❤️', '🌟',
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

export const FolderModal: React.FC<FolderModalProps> = ({ isOpen, onClose }) => {
  const { saveFolder, activeScope } = useNotes();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('📁');
  const [selectedColor, setSelectedColor] = useState('#8B5CF6');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Lütfen klasör adı girin.', 'error');
      return;
    }

    const newFolder: Folder = {
      id: 'folder-' + Date.now(),
      name: name.trim(),
      emoji: selectedEmoji,
      color: selectedColor,
      isSystem: false,
      scope: activeScope,
    };

    saveFolder(newFolder);
    showToast(`"${name}" klasörü oluşturuldu! 📁`, 'success');
    setName('');
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 animate-scale-in"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div className="flex items-center gap-2">
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shadow-sm"
              style={{ backgroundColor: `${selectedColor}25`, color: selectedColor }}
            >
              {selectedEmoji}
            </span>
            <h3 className="text-lg font-bold text-gray-900">Yeni Klasör Oluştur</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Folder Name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
              Klasör Adı
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Gezilecek Yerler, Müzik Listeleri..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm font-semibold text-gray-800 outline-hidden transition-all"
              autoFocus
            />
          </div>

          {/* Emoji Picker */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
              Klasör Emojisi
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-gray-50 border border-gray-100 max-h-36 overflow-y-auto">
              {EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setSelectedEmoji(emoji)}
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
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
              Tema Rengi
            </label>
            <div className="flex items-center gap-2.5">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-transform active:scale-95"
            >
              <FolderPlus className="w-4 h-4" />
              Klasörü Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
