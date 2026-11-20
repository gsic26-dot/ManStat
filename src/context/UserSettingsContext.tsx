'use client';

/**
 * ============================================================================
 * ManStat-Modern: UserSettingsContext & useUserSettings
 * ============================================================================
 * Per-User UI/UX Preferences Persistence (Server DB + Supabase + LocalStorage)
 *
 * Supported Preferences:
 * - theme_mode: 'light' | 'dark' | 'auto'
 * - preferred_view: 'table' | 'grid'
 * - compact_mode: boolean (Tighter table rows padding)
 * - mask_citizen_id: boolean (PDPA Masking default)
 *
 * Synchronization Guarantees:
 * 1. Zero-latency instant hydration from localStorage upon render.
 * 2. Background sync with Server DB (/api/admin/settings) and Supabase Auth.
 * 3. Bidirectional integration with ThemeContext for seamless dark/light toggle.
 * 4. Graceful offline / local fallback when connection is unreachable.
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme } from '@/context/ThemeContext';
import type { UserPreferences } from '@/types/database.types';

export type SyncStatus = 'synced' | 'syncing' | 'local_only';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme_mode: 'auto',
  preferred_view: 'table',
  compact_mode: false,
  mask_citizen_id: true,
};

interface UserSettingsContextType {
  preferences: UserPreferences;
  updatePreferences: (partial: Partial<UserPreferences>) => Promise<void>;
  resetPreferences: () => Promise<void>;
  syncStatus: SyncStatus;
  userId: string | null;
  isLoaded: boolean;
}

const STORAGE_GLOBAL_KEY = 'manstat-user-preferences';

function getStorageKey(userId?: string | null): string {
  return userId ? `manstat-settings-${userId}` : STORAGE_GLOBAL_KEY;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode: themeMode, setMode: setThemeMode } = useTheme();
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Initial sync with themeMode from ThemeContext
    return {
      ...DEFAULT_PREFERENCES,
      theme_mode: themeMode || 'auto',
    };
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // 1. Initial hydration: Read localStorage first for 0ms latency
  useEffect(() => {
    let localPrefs: Partial<UserPreferences> = {};
    try {
      const stored = localStorage.getItem(STORAGE_GLOBAL_KEY);
      if (stored) {
        localPrefs = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('[UserSettings] Could not read localStorage:', e);
    }

    setPreferences((prev) => ({
      ...prev,
      ...localPrefs,
      theme_mode: themeMode || localPrefs.theme_mode || 'auto',
    }));
    setIsLoaded(true);
  }, []);

  // Synchronize preferences.theme_mode when themeMode changes from ThemeContext
  useEffect(() => {
    setPreferences((prev) => {
      if (prev.theme_mode === themeMode) return prev;
      return { ...prev, theme_mode: themeMode };
    });
  }, [themeMode]);

  // 2. Fetch authenticated user from Supabase and synchronize remote preferences from server DB ON MOUNT ONLY
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function loadRemoteSettings() {
      // Check if user already has an explicit preference in localStorage
      let hasExplicitLocalTheme = false;
      try {
        const storedTheme = localStorage.getItem('manstat-theme-mode');
        if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'auto') {
          hasExplicitLocalTheme = true;
        }
      } catch {}

      // Fetch from Server DB API first
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' });
        const json = await res.json();
        if (json.success && json.data && isMounted) {
          const s = json.data;
          setPreferences((prev) => {
            const next: UserPreferences = {
              ...prev,
              preferred_view: s.preferredView || prev.preferred_view,
              compact_mode: s.compactMode !== undefined ? s.compactMode : prev.compact_mode,
              mask_citizen_id: s.maskCitizenId !== undefined ? s.maskCitizenId : prev.mask_citizen_id,
            };
            if (s.themeMode) {
              next.theme_mode = s.themeMode;
              setThemeMode(s.themeMode);
              try {
                localStorage.setItem('manstat-theme-mode', s.themeMode);
              } catch {}
            }
            return next;
          });
          setSyncStatus('synced');
        }
      } catch {
        // continue to Supabase
      }

      // Check Supabase Auth
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          return;
        }

        if (isMounted) {
          setUserId(user.id);
          const userKey = getStorageKey(user.id);
          const metaPrefs = user.user_metadata?.preferences as Partial<UserPreferences> | undefined;

          if (metaPrefs) {
            setPreferences((prev) => {
              const merged: UserPreferences = {
                ...prev,
                ...metaPrefs,
              };
              if (!hasExplicitLocalTheme && metaPrefs.theme_mode) {
                setThemeMode(metaPrefs.theme_mode);
              }
              return merged;
            });
            setSyncStatus('synced');

            try {
              localStorage.setItem(userKey, JSON.stringify(metaPrefs));
              localStorage.setItem(STORAGE_GLOBAL_KEY, JSON.stringify(metaPrefs));
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn('[UserSettings] Supabase sync error, operating in local mode:', err);
      }
    }

    loadRemoteSettings();

    // Listen to Supabase auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadRemoteSettings();
      } else {
        setUserId(null);
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [setThemeMode]);

  // 3. Update preferences handler (Instant UI update + localStorage + server DB sync)
  const updatePreferences = useCallback(
    async (partial: Partial<UserPreferences>) => {
      const updated: UserPreferences = {
        ...preferences,
        ...partial,
      };

      // A. Update local React state immediately
      setPreferences(updated);

      // B. If theme_mode changed, notify ThemeContext
      if (partial.theme_mode && partial.theme_mode !== themeMode) {
        setThemeMode(partial.theme_mode);
      }

      // C. Save to localStorage immediately
      try {
        const userKey = getStorageKey(userId);
        localStorage.setItem(userKey, JSON.stringify(updated));
        localStorage.setItem(STORAGE_GLOBAL_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('[UserSettings] Failed saving to localStorage:', e);
      }

      // D. Persist to Server DB API
      setSyncStatus('syncing');
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            themeMode: updated.theme_mode,
            preferredView: updated.preferred_view,
            compactMode: updated.compact_mode,
            maskCitizenId: updated.mask_citizen_id,
          }),
        });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.success) {
          setSyncStatus('synced');
          if (updated.theme_mode) {
            try {
              localStorage.setItem('manstat-theme-mode', updated.theme_mode);
            } catch {}
          }
        } else {
          setSyncStatus('local_only');
          console.warn('[UserSettings] Server settings rejected or unauthorized:', json?.error);
        }
      } catch (e) {
        setSyncStatus('local_only');
        console.warn('[UserSettings] Failed saving to /api/admin/settings:', e);
      }

      // E. Sync to Supabase if authenticated
      if (userId) {
        try {
          const supabase = createClient();
          await supabase.auth.updateUser({
            data: { preferences: updated },
          });
          await supabase
            .from('staff')
            .update({ preferences: updated as any })
            .eq('id', userId);
        } catch {
          // ignore
        }
      }
    },
    [preferences, themeMode, userId, setThemeMode]
  );

  // 4. Reset preferences to school system defaults
  const resetPreferences = useCallback(async () => {
    await updatePreferences(DEFAULT_PREFERENCES);
  }, [updatePreferences]);

  return (
    <UserSettingsContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        syncStatus,
        userId,
        isLoaded,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export function useUserSettings(): UserSettingsContextType {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}
