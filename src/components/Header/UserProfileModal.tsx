'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useToast } from '../Common/Toast';
import { X, UserCheck, Smile } from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_OPTIONS = [
  '👑', '🌸', '⚡', '🦊', '🥑', '🚀', '🐱', '🐶',
  '🐻', '🍓', '🎮', '🦄', '🦁', '🐼', '🎨', '🍕',
];

const COLOR_OPTIONS = [
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateUser } = useUser();
  const { showToast } = useToast();

  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [color, setColor] = useState(currentUser.color);

  // Modal hep bağlı kalır; her açılışta kayıtlı profille başlasın (ilk render varsayılan kullanıcıyla yapılır)
  useEffect(() => {
    if (isOpen) {
      setName(currentUser.name);
      setAvatar(currentUser.avatar);
      setColor(currentUser.color);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Lütfen bir isim yazın.', 'error');
      return;
    }

    updateUser(name.trim(), avatar, color);
    showToast(`Profilin güncellendi, hoş geldin ${name}! 🎉`, 'success');
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
          <div className="flex items-center gap-2.5">
            <span
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl shadow-md"
              style={{ backgroundColor: color }}
            >
              {avatar}
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Yazar Profili</h3>
              <p className="text-xs text-gray-500">Notların altındaki imzanı özelleştir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Name input */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
              İsmin veya Takma Adın
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Yunus, Ayşe..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-sm font-semibold text-gray-800 outline-hidden transition-all"
              autoFocus
            />
          </div>

          {/* Avatar selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
              Avatar Emojisi
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
              {AVATAR_OPTIONS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setAvatar(em)}
                  className={`p-2 rounded-xl text-lg hover:scale-125 transition-transform flex items-center justify-center ${
                    avatar === em ? 'bg-purple-200 ring-2 ring-purple-600' : 'hover:bg-white'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>

          {/* Color selection */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
              Rozet Rengi
            </label>
            <div className="flex items-center gap-2.5">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    color === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
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
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gray-950 hover:bg-black text-white text-xs font-bold shadow-md transition-transform active:scale-95"
            >
              <UserCheck className="w-4 h-4" />
              Profili Güncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
