'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ResolvedTheme = 'beige' | 'dark' | 'pink' | 'blue';
export type AppTheme = ResolvedTheme | 'system';

const THEMES: AppTheme[] = ['beige', 'dark', 'pink', 'blue', 'system'];

// Mobil tarayıcı çubuğu ve PWA başlığı temanın arka planıyla aynı renkte olsun
const THEME_COLORS: Record<ResolvedTheme, string> = {
  beige: '#F5F0E6',
  dark: '#111114',
  pink: '#FDF2F6',
  blue: '#EFF6FF',
};

interface ThemeContextType {
  theme: AppTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: AppTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const systemPrefersDark = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

function resolve(theme: AppTheme): ResolvedTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'beige';
  return theme;
}

function applyTheme(resolved: ResolvedTheme) {
  document.documentElement.setAttribute('data-theme', resolved);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[resolved]);
}

function readSavedTheme(): AppTheme {
  try {
    const stored = localStorage.getItem('yuppi_theme') as AppTheme;
    if (stored && THEMES.includes(stored)) return stored;
  } catch {
    // ignore
  }
  return 'beige';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // İlk değer doğrudan okunur: açılışta varsayılan tema bir kare bile uygulanıp titreşim yapmasın.
  // (Tema sunucu çıktısında render edilmediği için hidrasyon uyuşmazlığı oluşmaz.)
  const [theme, setThemeState] = useState<AppTheme>(() => (typeof window === 'undefined' ? 'beige' : readSavedTheme()));
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('beige');

  // Seçili temayı uygula; "Sistem" seçiliyse işletim sistemi değiştikçe takip et
  useEffect(() => {
    const update = () => {
      const next = resolve(theme);
      setResolvedTheme(next);
      applyTheme(next);
    };
    update();
    if (theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [theme]);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('yuppi_theme', newTheme);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
