'use client';

/**
 * ============================================================================
 * ManStat: ThemeContext & ThemeProvider
 * ============================================================================
 * 3-Mode Theme System:
 * - 'light': Forces Light Mode (Clean Civil-Service Paper)
 * - 'dark': Forces Dark Mode (Minimalist Obsidian Slate)
 * - 'auto': Automatically switches based on local clock:
 *    - 06:00 to 17:59 -> 'light'
 *    - 18:00 to 05:59 -> 'dark'
 * Real-time auto-transition every 60s and persistence via localStorage ('manstat-theme-mode').
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  isAuto: boolean;
}

const STORAGE_KEY = 'manstat-theme-mode';

export function resolveTimeBasedTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  const hour = new Date().getHours();
  // 06:00 (6) to 17:59 (17) -> light
  // 18:00 (18) to 05:59 (5) -> dark
  return hour >= 6 && hour < 18 ? 'light' : 'dark';
}

function applyThemeToDocument(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');
  const [mounted, setMounted] = useState(false);

  // Synchronize state from localStorage and resolve initial theme
  useEffect(() => {
    setMounted(true);
    let savedMode: ThemeMode = 'auto';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'auto') {
        savedMode = stored;
      }
    } catch {
      // Fallback if localStorage is inaccessible
      savedMode = 'auto';
    }

    setModeState(savedMode);
    const resolved = savedMode === 'auto' ? resolveTimeBasedTheme() : savedMode;
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);
  }, []);

  // Update mode handler
  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem(STORAGE_KEY, newMode);
      // Synchronize with user preferences localStorage key
      const rawPrefs = localStorage.getItem('manstat-user-preferences');
      const prefs = rawPrefs ? JSON.parse(rawPrefs) : {};
      localStorage.setItem(
        'manstat-user-preferences',
        JSON.stringify({ ...prefs, theme_mode: newMode })
      );
    } catch {
      // Ignore localStorage errors
    }

    const resolved = newMode === 'auto' ? resolveTimeBasedTheme() : newMode;
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);

    // Asynchronous background sync to server API (only when not on public /login or /verify page)
    try {
      if (
        typeof window !== 'undefined' &&
        window.location.pathname !== '/login' &&
        !window.location.pathname.startsWith('/verify')
      ) {
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ themeMode: newMode }),
        }).catch(() => {});
      }
    } catch {
      // ignore network errors
    }
  }, []);

  // Timer interval for 'auto' mode: checks clock every 60 seconds
  useEffect(() => {
    if (!mounted || mode !== 'auto') return;

    const checkInterval = setInterval(() => {
      const currentResolved = resolveTimeBasedTheme();
      setResolvedTheme((prev) => {
        if (prev !== currentResolved) {
          applyThemeToDocument(currentResolved);
          return currentResolved;
        }
        return prev;
      });
    }, 60000);

    return () => clearInterval(checkInterval);
  }, [mounted, mode]);

  const value = {
    mode,
    resolvedTheme,
    setMode,
    isAuto: mode === 'auto',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
