'use client';

import React from 'react';
import { useTheme, AppTheme } from '../../context/ThemeContext';
import { X, Moon, Sun, Heart, Cloud, Check } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_OPTIONS: {
  id: AppTheme;
  title: string;
  description: string;
  icon: any;
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

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-6 z-10 animate-scale-in">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-gray-900">Uygulama Ayarları</h3>
            <p className="text-xs text-gray-500">Görünüm ve renk temasını kişiselleştirin</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Theme List */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-gray-400 px-1">
            Renk Teması
          </div>
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
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shadow-2xs ${item.colorBadge}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      {item.title}
                    </div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </div>

                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
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
