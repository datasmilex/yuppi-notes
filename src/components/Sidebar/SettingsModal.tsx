'use client';

import React, { useRef } from 'react';
import { useTheme, AppTheme } from '../../context/ThemeContext';
import { useNotes } from '../../context/NotesContext';
import { useToast } from '../Common/Toast';
import { usePwaInstall } from '../../utils/pwa';
import { downloadFile } from '../../utils/text';
import { X, Moon, Sun, Heart, Cloud, Check, Download, Upload, Smartphone, Keyboard } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: {
  id: AppTheme;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorBadge: string;
  borderColor: string;
}[] = [
  {
    id: 'beige',
    title: 'Açık Bej (Varsayılan)',
    description: 'Sıcak, göz yormayan doğal kağıt ve bej tonları',
    icon: Sun,
    colorBadge: 'bg-[#FBF9F5] border-[#E8E4DA] text-stone-800',
    borderColor: 'border-amber-400',
  },
  {
    id: 'dark',
    title: 'Koyu Gece',
    description: 'Düşük ışıkta rahat yazım için modern koyu tema',
    icon: Moon,
    colorBadge: 'bg-[#18181B] border-[#3F3F46] text-zinc-100',
    borderColor: 'border-zinc-400',
  },
  {
    id: 'pink',
    title: 'Pudra Pembe',
    description: 'Yumuşak pastel pudra pembesi ve lavanta esintisi',
    icon: Heart,
    colorBadge: 'bg-[#FFF5F7] border-[#FBCFE8] text-pink-900',
    borderColor: 'border-pink-400',
  },
  {
    id: 'blue',
    title: 'Bebek Mavisi',
    description: 'Huzur veren ferah açık mavi ve gökyüzü tonları',
    icon: Cloud,
    colorBadge: 'bg-[#F0F7FF] border-[#BAE6FD] text-sky-900',
    borderColor: 'border-sky-400',
  },
];

const SHORTCUTS: [string, string][] = [
  ['Ctrl + K', 'Aramaya odaklan'],
  ['Alt + N', 'Yeni not'],
  ['Esc', 'Editörü kaydedip kapat / aramayı temizle'],
  ['Ctrl + B / I / U', 'Kalın / İtalik / Altı çizili'],
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();
  const { exportBackup, importBackup } = useNotes();
  const { showToast } = useToast();
  const { canInstall, install } = usePwaInstall();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`yuppi-notes-yedek-${stamp}.json`, exportBackup(), 'application/json;charset=utf-8');
    showToast('Yedek dosyası indirildi. 💾', 'success');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      const result = importBackup(await file.text());
      showToast(`${result.notes} not, ${result.folders} klasör geri yüklendi. ✅`, 'success');
    } catch {
      showToast('Geçersiz veya bozuk yedek dosyası.', 'error');
    }
  };

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) showToast('Uygulama yüklendi! 🎉', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-10 animate-scale-in">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Uygulama Ayarları</h3>
            <p className="text-xs text-gray-500">Görünüm, yedekleme ve kısayollar</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Renk Teması</div>
          {THEME_OPTIONS.map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all text-left ${
                  isSelected
                    ? `${item.borderColor} bg-gray-50/80 shadow-xs ring-2 ring-purple-100`
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${item.colorBadge}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{item.title}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Backup */}
        <div className="mt-6 space-y-2.5">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">Yedekleme (Yerel Notlar)</div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-gray-700 transition-all"
            >
              <Download className="w-4 h-4 text-purple-600" />
              Yedek İndir
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs font-bold text-gray-700 transition-all"
            >
              <Upload className="w-4 h-4 text-purple-600" />
              Yedekten Yükle
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} className="hidden" />
          </div>
          <p className="text-[11px] text-gray-500 px-1 leading-relaxed">
            Yerel notlar yalnızca bu tarayıcıda saklanır. Cihaz değiştirirken veya tarayıcı verilerini temizlemeden önce yedek alın.
          </p>
        </div>

        {/* Install */}
        {canInstall && (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-6 w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-bold shadow-md hover:opacity-95 transition-opacity"
          >
            <Smartphone className="w-4 h-4" />
            Uygulamayı Cihaza Yükle
          </button>
        )}

        {/* Shortcuts */}
        <div className="mt-6">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1 mb-2 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            Klavye Kısayolları
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs px-1">
            {SHORTCUTS.map(([keys, label]) => (
              <React.Fragment key={keys}>
                <dt>
                  <kbd className="px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 font-bold text-gray-700 text-[11px]">{keys}</kbd>
                </dt>
                <dd className="text-gray-600">{label}</dd>
              </React.Fragment>
            ))}
          </dl>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs shadow-md transition-colors"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
