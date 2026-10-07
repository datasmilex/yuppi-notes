'use client';

import React, { useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { FolderModal } from './FolderModal';
import { SettingsModal } from './SettingsModal';
import {
  FolderPlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Share2,
  Copy,
  Check,
  Home,
  Users,
  Layers,
  X,
  BookmarkCheck,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop: boolean;
  onToggleDesktop: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpenMobile,
  onCloseMobile,
  isCollapsedDesktop,
  onToggleDesktop,
}) => {
  const {
    folders,
    activeFolderId,
    setActiveFolderId,
    notes,
    deleteFolder,
    activeScope,
    setActiveScope,
    currentRoomId,
    setCurrentRoomId,
    copyInviteLink,
  } = useNotes();
  const { showToast } = useToast();

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState(currentRoomId);

  // Filter folders by activeScope (Local vs Shared)
  const currentFolders = folders.filter((f) => f.scope === activeScope);

  const getNoteCount = (folderId: string) => {
    const scopeNotes = notes.filter((n) => n.scope === activeScope);
    if (folderId.startsWith('all_')) return scopeNotes.length;
    return scopeNotes.filter((n) => n.folderId === folderId).length;
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string, folderName: string) => {
    e.stopPropagation();
    if (
      window.confirm(
        `"${folderName}" klasörünü silmek istediğinize emin misiniz? (İçindeki notlar ana listeye taşınacaktır.)`
      )
    ) {
      deleteFolder(folderId);
      showToast(`"${folderName}" klasörü silindi.`, 'info');
    }
  };

  const handleCopyInvite = () => {
    const url = copyInviteLink();
    setCopiedLink(true);
    showToast('Davet bağlantısı kopyalandı! 🔗 Arkadaşlarınla paylaşabilirsin.', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRoomChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomInput.trim()) {
      setCurrentRoomId(roomInput.trim());
      setIsEditingRoom(false);
      showToast(`"${roomInput.trim()}" odasına geçildi.`, 'info');
    }
  };

  const content = (
    <div className="flex flex-col h-full select-none">
      {/* Brand & App Title */}
      <div className="p-4 flex items-center justify-between border-b border-purple-100/60 bg-gradient-to-r from-purple-50/50 via-pink-50/30 to-amber-50/50">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-400 to-purple-500 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/20 flex-shrink-0 animate-pulse">
            📝
          </div>
          {!isCollapsedDesktop && (
            <div className="overflow-hidden">
              <h1 className="font-black text-base bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 bg-clip-text text-transparent truncate tracking-tight">
                YuPPi Notes
              </h1>
              <p className="text-[10px] font-bold text-gray-500 truncate">
                Cıvıl Cıvıl Post-it Pano
              </p>
            </div>
          )}
        </div>

        {/* Mobile close */}
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleDesktop}
          className="hidden md:flex p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-purple-100/50"
          title={isCollapsedDesktop ? 'Genişlet' : 'Daralt'}
        >
          {isCollapsedDesktop ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Scope Switcher: YEREL vs ORTAK */}
      {!isCollapsedDesktop ? (
        <div className="p-3 border-b border-purple-100/50 bg-gray-50/60">
          <div className="grid grid-cols-2 p-1 bg-gray-200/70 rounded-2xl gap-1">
            <button
              onClick={() => setActiveScope('local')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeScope === 'local'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>YEREL</span>
            </button>

            <button
              onClick={() => setActiveScope('shared')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeScope === 'shared'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ORTAK</span>
            </button>
          </div>

          <p className="text-[10px] text-gray-500 text-center mt-1.5 font-medium">
            {activeScope === 'local'
              ? '🔒 Sadece bu cihazda saklanır'
              : '👥 Davet bağlantısıyla ortak çalışma'}
          </p>
        </div>
      ) : (
        <div className="p-2 border-b border-purple-100/50 flex flex-col gap-1 items-center">
          <button
            onClick={() => setActiveScope('local')}
            className={`p-2 rounded-xl text-xs ${
              activeScope === 'local' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-gray-400'
            }`}
            title="Yerel Notlar"
          >
            <Home className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveScope('shared')}
            className={`p-2 rounded-xl text-xs ${
              activeScope === 'shared' ? 'bg-purple-600 text-white font-bold' : 'text-gray-400'
            }`}
            title="Ortak Notlar"
          >
            <Users className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Shared Room Invite Box (Visible in ORTAK tab) */}
      {activeScope === 'shared' && !isCollapsedDesktop && (
        <div className="m-3 p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/70 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1">
              <Share2 className="w-3 h-3 text-purple-600" />
              Ortak Oda: <strong className="text-purple-700">{currentRoomId}</strong>
            </span>
          </div>

          <button
            onClick={handleCopyInvite}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs hover:scale-102 active:scale-98 transition-all"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Kopyalandı!' : 'Davet Linki Kopyala'}</span>
          </button>
        </div>
      )}

      {/* Folders List Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        {!isCollapsedDesktop ? (
          <>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {activeScope === 'local' ? 'Yerel Klasörler' : 'Ortak Klasörler'}
            </span>
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="p-1 rounded-lg text-purple-600 hover:bg-purple-100/70 transition-colors"
              title="Yeni Klasör Ekle"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <button
              onClick={() => setIsFolderModalOpen(true)}
              className="p-1.5 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              title="Yeni Klasör Ekle"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Folder Items */}
      <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
        {currentFolders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          const count = getNoteCount(folder.id);

          return (
            <div
              key={folder.id}
              onClick={() => {
                setActiveFolderId(folder.id);
                onCloseMobile();
              }}
              className={`group flex items-center justify-between p-2.5 rounded-2xl cursor-pointer transition-all duration-200 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
                  : 'text-gray-700 hover:bg-purple-50/70 hover:text-purple-900 font-medium'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base flex-shrink-0">{folder.emoji}</span>
                {!isCollapsedDesktop && <span className="text-xs truncate">{folder.name}</span>}
              </div>

              {!isCollapsedDesktop && (
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>

                  {/* Explicit Folder Delete Button */}
                  {!folder.isSystem && (
                    <button
                      onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                      className={`p-1 rounded-md transition-all hover:scale-110 ${
                        isActive
                          ? 'text-white/80 hover:text-white hover:bg-white/20'
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title="Klasörü Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info & Settings */}
      <div className="p-3 border-t border-gray-200/60 bg-gray-50/40">
        {!isCollapsedDesktop && (
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
            <span className="flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-purple-600" />
              {activeScope === 'local' ? 'Yerel Çalışma Alanı' : 'Ortak Çalışma Alanı'}
            </span>
            <span className="font-bold text-gray-700">{notes.filter((n) => n.scope === activeScope).length} not</span>
          </div>
        )}

        {/* Settings button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-colors ${
            isCollapsedDesktop ? 'justify-center' : 'justify-start'
          }`}
          title="Ayarlar & Tema"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          {!isCollapsedDesktop && <span className="text-xs font-bold">Ayarlar & Tema</span>}
        </button>
      </div>

      {/* New Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );

  return (
    <>
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden animate-fade-in"
        />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 bg-white/95 backdrop-blur-md border-r border-purple-100/70 shadow-xl md:shadow-none transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isCollapsedDesktop ? 'md:w-20' : 'md:w-64'}`}
      >
        {content}
      </aside>
    </>
  );
};
