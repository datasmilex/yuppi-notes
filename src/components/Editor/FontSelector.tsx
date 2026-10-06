'use client';

import React from 'react';
import { NoteFont } from '../../types/note';
import { NOTE_FONTS } from '../../utils/colors';
import { Type } from 'lucide-react';

interface FontSelectorProps {
  selectedFont: NoteFont;
  onSelectFont: (font: NoteFont) => void;
}

export const FontSelector: React.FC<FontSelectorProps> = ({ selectedFont, onSelectFont }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wide">
        <Type className="w-3.5 h-3.5" />
        Yazı Tipi (Tipografi)
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {NOTE_FONTS.map((font) => {
          const isSelected = selectedFont === font.id;
          return (
            <button
              key={font.id}
              type="button"
              onClick={() => onSelectFont(font.id)}
              className={`flex flex-col items-start p-2.5 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-purple-600 bg-purple-50/80 shadow-sm ring-2 ring-purple-400/30'
                  : 'border-black/8 bg-white/70 hover:border-black/20 hover:bg-white'
              }`}
            >
              <span className={`text-sm font-bold text-gray-900 ${font.cssClass}`}>
                {font.name}
              </span>
              <span className={`text-[11px] text-gray-500 mt-0.5 truncate w-full ${font.cssClass}`}>
                {font.sample}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
