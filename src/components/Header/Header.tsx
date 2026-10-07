'use client';

import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useUser } from '../../context/UserContext';
import { UserProfileModal } from './UserProfileModal';
import { InviteModal } from '../Sidebar/InviteModal';
import { Menu, Search, Plus, X, Share2 } from 'lucide-react';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    searchQuery,
    setSearchQuery,
    setIsCreateModalOpen,
    setIsTypeSelectorOpen,
    isConnected,
    activeScope,
  } = useNotes();
  const { currentUser, onlineCount } = useUser();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  return (
    <>
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 md:px-8 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        {/* Mobile hamburger + Logo for mobile */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-gray-700 hover:bg-purple-100/60 transition-colors"
            title="Menüyü Aç"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="md:hidden flex items-center gap-2">
            <span className="text-xl">📝</span>
            <span className="font-extrabold text-base bg-gradient-to-r from-purple-700 to-pink-600 bg-clip-text text-transparent">
              YuPPi
            </span>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 max-w-xl relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ara... (Ctrl+K)"
              aria-label="Notlarda ara"
              className="w-full pl-10 pr-9 py-2 rounded-2xl bg-gray-100/80 hover:bg-gray-100 focus:bg-white border border-transparent focus:border-purple-300 focus:ring-2 focus:ring-purple-100 text-base sm:text-sm font-medium text-gray-800 placeholder-gray-400 outline-hidden transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Aramayı temizle"
                className="absolute right-3 p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right items */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {/* If shared scope, quick invite button */}
          {activeScope === 'shared' && (
            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors"
              title="Davet Linki ve QR Kod"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Davet / QR</span>
            </button>
          )}

          {/* Real-time sync status badge */}
          {activeScope === 'shared' ? (
            <div
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                }`}
              />
              <span className="truncate">
                {isConnected ? `Canlı (${onlineCount})` : 'Bağlanıyor...'}
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              <span>Yerel Mod</span>
            </div>
          )}

          {/* Profile Avatar Button */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl hover:bg-purple-100/50 border border-black/5 transition-all text-xs font-bold text-gray-800 shadow-2xs"
            title="Yazar Profilini Düzenle"
          >
            <span
              className="w-7 h-7 rounded-xl flex items-center justify-center text-sm shadow-xs flex-shrink-0"
              style={{ backgroundColor: currentUser.color }}
            >
              {currentUser.avatar}
            </span>
            <span className="hidden xl:inline truncate max-w-[90px]">
              {currentUser.name}
            </span>
          </button>

          {/* New Note Button -> Opens Type Selector Modal (Kopyalanabilir vs Kapsamlı) */}
          <button
            onClick={() => setIsTypeSelectorOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white text-xs sm:text-sm font-black shadow-md shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-102 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Yeni Not</span>
          </button>
        </div>
      </div>

    </header>

      {/* Modallar header'ın dışında: header'ın yığın bağlamı (z-30) modalı kenar çubuğunun altında bırakmasın */}
      <UserProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </>
  );
};
