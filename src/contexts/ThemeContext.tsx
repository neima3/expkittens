'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { THEMES, DEFAULT_THEME_ID, getTheme, type Theme, type ThemeId } from '@/lib/themes';

interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  customCardBack: string | null; // base64 data URL
  setCustomCardBack: (dataUrl: string | null) => void;
  roomThemeId: ThemeId | null;
  setRoomThemeId: (id: ThemeId | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(theme.variables)) {
    root.style.setProperty(key, value);
  }
  document.body.style.background = theme.bodyBackground;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [customCardBack, setCustomCardBackState] = useState<string | null>(null);
  const [roomThemeId, setRoomThemeIdState] = useState<ThemeId | null>(null);

  // Hydrate from localStorage once mounted
  useEffect(() => {
    const saved = localStorage.getItem('ek_theme') as ThemeId | null;
    const savedBack = localStorage.getItem('ek_custom_card_back');
    if (saved && THEMES.find(t => t.id === saved)) {
      setThemeIdState(saved);
    }
    if (savedBack) {
      setCustomCardBackState(savedBack);
    }
  }, []);

  // Apply CSS variables whenever active theme changes
  const activeThemeId = roomThemeId ?? themeId;
  const theme = getTheme(activeThemeId);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setThemeId = useCallback(
    (id: ThemeId) => {
      setThemeIdState(id);
      localStorage.setItem('ek_theme', id);
      if (!roomThemeId) {
        applyTheme(getTheme(id));
      }
    },
    [roomThemeId]
  );

  const setCustomCardBack = useCallback((dataUrl: string | null) => {
    setCustomCardBackState(dataUrl);
    if (dataUrl) {
      localStorage.setItem('ek_custom_card_back', dataUrl);
    } else {
      localStorage.removeItem('ek_custom_card_back');
    }
  }, []);

  const setRoomThemeId = useCallback(
    (id: ThemeId | null) => {
      setRoomThemeIdState(id);
      applyTheme(getTheme(id ?? themeId));
    },
    [themeId]
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        setThemeId,
        customCardBack,
        setCustomCardBack,
        roomThemeId,
        setRoomThemeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
