'use client';

import React, { useMemo, useState } from 'react';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { FolderModal } from './FolderModal';
import { SettingsModal } from './SettingsModal';
import { InviteModal } from './InviteModal';
import { Folder } from '../../types/note';
import {
  FolderPlus,
  Trash2,
  Pencil,
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
  Hash,
  QrCode,
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
    scopeFolders,
    activeFolderId,
    setActiveFolderId,
    notes,
    deleteFolder,
    activeScope,
    setActiveScope,
    currentRoomId,
    setCurrentRoomId,
    copyInviteLink,
    allTags,
    activeTag,
    setActiveTag,
  } = useNotes();
  const { showToast } = useToast();

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isEditingRoom, setIsEditingRoom] = useState(false);
  const [roomInput, setRoomInput] = useState('');

  const scopeNotes = useMemo(
    () =>
      notes.filter(
        (n) => n.scope === activeScope && (activeScope === 'local' || !n.roomId || n.roomId === currentRoomId)
      ),
    [notes, activeScope, currentRoomId]
  );

  const getNoteCount = (folderId: string) =>
    folderId.startsWith('all_') ? scopeNotes.length : scopeNotes.filter((n) => n.folderId === folderId).length;

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

  const handleCopyInvite = async () => {
    const { ok } = await copyInviteLink();
    if (ok) {
      setCopiedLink(true);
      showToast('Davet bağlantısı kopyalandı! 🔗 Arkadaşlarınla paylaşabilirsin.', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      showToast('Kopyalanamadı. QR / Davet penceresinden bağlantıyı alabilirsin.', 'error');
    }
  };

  const handleRoomChange = (e: React.FormEvent) => {
    e.preventDefault();
    const next = roomInput.trim();
    if (!next) return;
    setCurrentRoomId(next);
    setIsEditingRoom(false);
    showToast(`"${next}" odasına geçildi.`, 'info');
  };

  const openNewFolder = () => {
    setEditingFolder(null);
    setIsFolderModalOpen(true);
  };

  const content = (
    <div className="flex flex-col h-full select-none">
      {/* Brand & App Title */}
      <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top))] flex items-center justify-between border-b border-purple-100/60 bg-gradient-to-r from-purple-50/50 via-pink-50/30 to-amber-50/50">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-400 via-pink-400 to-purple-500 flex items-center justify-center text-white text-lg shadow-md shadow-pink-500/20 flex-shrink-0">
            📝
          </div>
          {!isCollapsedDesktop && (
            <div className="overflow-hidden">
              <h1 className="font-black text-base bg-gradient-to-r from-purple-700 via-pink-600 to-amber-600 bg-clip-text text-transparent truncate tracking-tight">
                YuPPi Notes
              </h1>
              <p className="text-[10px] font-bold text-gray-500 truncate">Cıvıl Cıvıl Post-it Pano</p>
            </div>
          )}
        </div>

        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded-xl text-gray-500 hover:bg-gray-100"
          aria-label="Menüyü kapat"
        >
          <X className="w-5 h-5" />
        </button>

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
                activeScope === 'local' ? 'bg-white text-purple-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>YEREL</span>
            </button>

            <button
              onClick={() => setActiveScope('shared')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                activeScope === 'shared' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>ORTAK</span>
            </button>
          </div>

          <p className="text-[10px] text-gray-500 text-center mt-1.5 font-medium">
            {activeScope === 'local' ? '🔒 Sadece bu cihazda saklanır' : '👥 Davet bağlantısıyla ortak çalışma'}
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

      {/* Shared Room Box (ORTAK sekmesinde) */}
      {activeScope === 'shared' && !isCollapsedDesktop && (
        <div className="m-3 p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200/70 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            {isEditingRoom ? (
              <form onSubmit={handleRoomChange} className="flex items-center gap-1.5 w-full">
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder="Oda adı"
                  maxLength={40}
                  autoFocus
                  className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-purple-200 bg-white text-base sm:text-xs font-semibold text-gray-800 outline-hidden focus:border-purple-400"
                />
                <button
                  type="submit"
                  className="p-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
                  title="Odaya geç"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRoom(false)}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-white"
                  title="Vazgeç"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <>
                <span className="text-[11px] font-bold text-purple-900 flex items-center gap-1 min-w-0">
                  <Share2 className="w-3 h-3 text-purple-600 flex-shrink-0" />
                  <span className="flex-shrink-0">Oda:</span>
                  <strong className="text-purple-700 truncate">{currentRoomId}</strong>
                </span>
                <button
                  onClick={() => {
                    setRoomInput(currentRoomId);
                    setIsEditingRoom(true);
                  }}
                  className="p-1 rounded-lg text-purple-600 hover:bg-white/80 flex-shrink-0"
                  title="Odayı değiştir / başka odaya katıl"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyInvite}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs hover:scale-102 active:scale-98 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Kopyalandı!' : 'Davet Linki'}</span>
            </button>
            <button
              onClick={() => setIsInviteOpen(true)}
              className="p-2 rounded-xl bg-white text-purple-700 border border-purple-200 hover:bg-purple-50 transition-colors"
              title="QR kod ile telefonda aç"
              aria-label="QR kod ile telefonda aç"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
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
              onClick={openNewFolder}
              className="p-1 rounded-lg text-purple-600 hover:bg-purple-100/70 transition-colors"
              title="Yeni Klasör Ekle"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="w-full flex justify-center">
            <button
              onClick={openNewFolder}
              className="p-1.5 rounded-xl bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
              title="Yeni Klasör Ekle"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Folder Items + Tags */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        <div className="space-y-1">
          {scopeFolders.map((folder) => {
            const isActive = activeFolderId === folder.id;
            const count = getNoteCount(folder.id);
            const select = () => {
              setActiveFolderId(folder.id);
              onCloseMobile();
            };

            return (
              <div
                key={folder.id}
                role="button"
                tabIndex={0}
                onClick={select}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    select();
                  }
                }}
                title={isCollapsedDesktop ? folder.name : undefined}
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
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {count}
                    </span>

                    {!folder.isSystem && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingFolder(folder);
                            setIsFolderModalOpen(true);
                          }}
                          className={`p-1 rounded-md transition-all hover:scale-110 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 ${
                            isActive
                              ? 'text-white/80 hover:text-white hover:bg-white/20'
                              : 'text-gray-400 hover:text-purple-700 hover:bg-purple-50'
                          }`}
                          title="Klasörü Düzenle"
                          aria-label={`${folder.name} klasörünü düzenle`}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                          className={`p-1 rounded-md transition-all hover:scale-110 ${
                            isActive
                              ? 'text-white/80 hover:text-white hover:bg-white/20'
                              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                          }`}
                          title="Klasörü Sil"
                          aria-label={`${folder.name} klasörünü sil`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!isCollapsedDesktop && allTags.length > 0 && (
          <div className="mt-5 mb-3">
            <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              Etiketler
            </div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {allTags.slice(0, 20).map(({ tag, count }) => (
                <button
                  key={tag}
                  onClick={() => {
                    setActiveTag(activeTag === tag ? null : tag);
                    onCloseMobile();
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                    activeTag === tag
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-800'
                  }`}
                >
                  #{tag} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info & Settings */}
      <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-gray-200/60 bg-gray-50/40">
        {!isCollapsedDesktop && (
          <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
            <span className="flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-purple-600" />
              {activeScope === 'local' ? 'Yerel Çalışma Alanı' : 'Ortak Çalışma Alanı'}
            </span>
            <span className="font-bold text-gray-700">{scopeNotes.length} not</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className={`w-full flex items-center gap-2.5 p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-colors ${
            isCollapsedDesktop ? 'justify-center' : 'justify-start'
          }`}
          title="Ayarlar, Tema & Yedekleme"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          {!isCollapsedDesktop && <span className="text-xs font-bold">Ayarlar, Tema & Yedek</span>}
        </button>
      </div>
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
        className={`fixed md:static inset-y-0 left-0 z-40 bg-white border-r border-gray-200 shadow-xl md:shadow-none transition-all duration-300 ${
          isOpenMobile ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isCollapsedDesktop ? 'md:w-20' : 'md:w-64'}`}
      >
        {content}
      </aside>

      {/* Modallar aside'ın dışında: dönüştürülmüş (transform) üst öğe fixed konumlandırmayı bozar */}
      <FolderModal
        isOpen={isFolderModalOpen}
        folder={editingFolder}
        onClose={() => {
          setIsFolderModalOpen(false);
          setEditingFolder(null);
        }}
      />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </>
  );
};
