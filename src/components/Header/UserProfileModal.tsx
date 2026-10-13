'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import { useToast } from '../Common/Toast';
import { ModalShell } from '../Common/ModalShell';
import { UserCheck } from 'lucide-react';

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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Lütfen bir isim yazın.', 'error');
      return;
    }

    updateUser(name.trim(), avatar, color);
    showToast(`Profilin güncellendi, hoş geldin ${name.trim()}! 🎉`, 'success');
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Yazar Profili"
      subtitle="Notların altındaki imzanı özelleştir"
      icon={
        <span className="w-6 h-6 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: color }}>
          {avatar}
        </span>
      }
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
            form="profile-form"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-ink hover:bg-ink/85 text-on-ink text-xs font-bold shadow-md transition-transform active:scale-95"
          >
            <UserCheck className="w-4 h-4" />
            Profili Güncelle
          </button>
        </>
      }
    >
      <form id="profile-form" onSubmit={handleSave} className="flex flex-col gap-5">
        {/* İmza önizlemesi */}
        <div className="paper-scope flex items-center gap-2 p-3 rounded-2xl bg-[#FEF9C3] border-2 border-[#FDE047] text-xs text-amber-950">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-2xs" style={{ backgroundColor: color }}>
            {avatar}
          </span>
          <span className="font-bold">{name.trim() || 'İsmin'}</span>
          <span className="ml-auto opacity-70">Az önce</span>
        </div>

        {/* Name input */}
        <div>
          <label htmlFor="profile-name" className="text-xs font-bold uppercase tracking-wider text-gray-600 block mb-1.5">
            İsmin veya Takma Adın
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Örn: Yunus, Ayşe..."
            maxLength={30}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-base sm:text-sm font-semibold text-gray-800 outline-hidden transition-all"
            autoFocus
          />
        </div>

        {/* Avatar selection */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Avatar Emojisi</div>
          <div className="grid grid-cols-8 gap-1.5 p-2 rounded-xl bg-gray-50 border border-gray-100">
            {AVATAR_OPTIONS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setAvatar(em)}
                aria-pressed={avatar === em}
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
          <div className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Rozet Rengi</div>
          <div className="flex items-center gap-2.5 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Renk ${c}`}
                aria-pressed={color === c}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                  color === c ? 'ring-2 ring-offset-2 ring-gray-900 scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </form>
    </ModalShell>
  );
};
