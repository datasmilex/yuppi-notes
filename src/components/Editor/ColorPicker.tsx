'use client';

import React from 'react';
import { NoteColor } from '../../types/note';
import { NOTE_COLORS } from '../../utils/colors';
import { Palette, Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: NoteColor;
  onSelectColor: (color: NoteColor) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onSelectColor }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wide">
        <Palette className="w-3.5 h-3.5" />
        Post-it Rengi (Pastel Palet)
      </label>
      <div className="flex items-center gap-2 flex-wrap">
        {(Object.keys(NOTE_COLORS) as NoteColor[]).map((colorKey) => {
          const conf = NOTE_COLORS[colorKey];
          const isSelected = selectedColor === colorKey;

          return (
            <button
              key={colorKey}
              type="button"
              onClick={() => onSelectColor(colorKey)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-gray-800 shadow-sm scale-105 ring-2 ring-black/10'
                  : 'border-transparent hover:border-black/20 hover:scale-102'
              }`}
              style={{ backgroundColor: conf.badgeHex }}
            >
              <span
                className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-2xs"
                style={{ backgroundColor: conf.accent }}
              />
              <span className="text-xs font-bold text-gray-800">{conf.name}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-gray-900 ml-0.5" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
