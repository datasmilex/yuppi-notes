'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { NoteColor, NoteFont, NoteKind, ViewMode } from '../types/note';
import { NOTE_COLORS } from '../utils/colors';

export type CardDensity = 'comfortable' | 'compact';

/** Kullanıcının kalıcı uygulama tercihleri (bu cihazda saklanır). */
export interface AppPrefs {
  viewMode: ViewMode;
  density: CardDensity;
  defaultColor: NoteColor;
  defaultFont: NoteFont;
  defaultKind: NoteKind;
  spellcheck: boolean;
  reminderSound: boolean;
}

export type AppModal = 'palette' | 'stats' | 'shortcuts' | 'settings' | null;

const DEFAULT_PREFS: AppPrefs = {
  viewMode: 'grid',
  density: 'comfortable',
  defaultColor: 'yellow',
  defaultFont: 'sans',
  defaultKind: 'comprehensive',
  spellcheck: true,
  reminderSound: true,
};

const PREFS_KEY = 'yuppi_settings';
const FONTS: NoteFont[] = ['sans', 'handwriting', 'mono', 'serif'];

function readPrefs(): AppPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    return {
      viewMode: raw.viewMode === 'list' ? 'list' : 'grid',
      density: raw.density === 'compact' ? 'compact' : 'comfortable',
      defaultColor: raw.defaultColor in NOTE_COLORS ? raw.defaultColor : DEFAULT_PREFS.defaultColor,
      defaultFont: FONTS.includes(raw.defaultFont) ? raw.defaultFont : DEFAULT_PREFS.defaultFont,
      defaultKind: raw.defaultKind === 'quick' ? 'quick' : 'comprehensive',
      spellcheck: raw.spellcheck !== false,
      reminderSound: raw.reminderSound !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

interface UIContextType {
  prefs: AppPrefs;
  setPref: <K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => void;
  selectMode: boolean;
  setSelectMode: (on: boolean) => void;
  selectedIds: Set<string>;
  toggleSelected: (id: string) => void;
  setSelection: (ids: string[]) => void;
  clearSelection: () => void;
  openModal: AppModal;
  setOpenModal: (modal: AppModal) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<AppPrefs>(DEFAULT_PREFS);
  const [selectMode, setSelectModeState] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [openModal, setOpenModal] = useState<AppModal>(null);

  useEffect(() => {
    setPrefs(readPrefs());
  }, []);

  const setPref = useCallback(<K extends keyof AppPrefs>(key: K, value: AppPrefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // yoksay
      }
      return next;
    });
  }, []);

  const setSelectMode = useCallback((on: boolean) => {
    setSelectModeState(on);
    if (!on) setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((id: string) => {
    setSelectModeState(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setSelection = useCallback((ids: string[]) => {
    setSelectModeState(true);
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectModeState(false);
  }, []);

  const value = useMemo<UIContextType>(
    () => ({
      prefs,
      setPref,
      selectMode,
      setSelectMode,
      selectedIds,
      toggleSelected,
      setSelection,
      clearSelection,
      openModal,
      setOpenModal,
    }),
    [prefs, setPref, selectMode, setSelectMode, selectedIds, toggleSelected, setSelection, clearSelection, openModal]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
