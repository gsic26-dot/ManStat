'use client';

/**
 * ============================================================================
 * ManStat-Modern: UserSettingsContext & useUserSettings
 * ============================================================================
 * Per-User UI/UX Preferences Persistence (Supabase + LocalStorage)
 *
 * Supported Preferences:
 * - theme_mode: 'light' | 'dark' | 'auto'
 * - preferred_view: 'table' | 'grid'
 * - compact_mode: boolean (Tighter table rows padding)
 * - mask_citizen_id: boolean (PDPA Masking default)
 *
 * Synchronization Guarantees:
 * 1. Zero-latency instant hydration from localStorage upon render.
 * 2. Background sync with Supabase Auth (user_metadata) and public.staff.
 * 3. Bidirectional integration with ThemeContext for seamless dark/light toggle.
 * 4. Graceful offline / demo fallback when Supabase connection is unreachable.
 * ============================================================================
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
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
  }, [themeMode]);

  // 2. Fetch authenticated user from Supabase and synchronize remote preferences
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    async function loadRemoteSettings() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          if (isMounted) setSyncStatus('local_only');
          return;
        }

        if (!isMounted) return;
        setUserId(user.id);

        const userKey = getStorageKey(user.id);
        let currentPrefs = { ...DEFAULT_PREFERENCES };

        // Check user-specific localStorage first
        try {
          const userStored = localStorage.getItem(userKey);
          if (userStored) {
            currentPrefs = { ...currentPrefs, ...JSON.parse(userStored) };
          }
        } catch {
          // ignore error
        }

        // Check user metadata from Supabase Auth
        const metaPrefs = user.user_metadata?.preferences as Partial<UserPreferences> | undefined;
        if (metaPrefs && typeof metaPrefs === 'object') {
          currentPrefs = { ...currentPrefs, ...metaPrefs };
        }

        // Optionally query public.staff table preferences column
        try {
          const { data: staffData } = await supabase
            .from('staff')
            .select('preferences')
            .eq('id', user.id)
            .maybeSingle();

          if (staffData?.preferences && typeof staffData.preferences === 'object') {
            currentPrefs = { ...currentPrefs, ...(staffData.preferences as Partial<UserPreferences>) };
          }
        } catch {
          // Column might not exist yet, safe fallback
        }

        if (isMounted) {
          setPreferences(currentPrefs);
          setSyncStatus('synced');

          // Keep ThemeContext aligned if remote preferences have theme_mode
          if (currentPrefs.theme_mode && currentPrefs.theme_mode !== themeMode) {
            setThemeMode(currentPrefs.theme_mode);
          }

          // Mirror to both storage keys for fast access
          try {
            localStorage.setItem(userKey, JSON.stringify(currentPrefs));
            localStorage.setItem(STORAGE_GLOBAL_KEY, JSON.stringify(currentPrefs));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        console.warn('[UserSettings] Supabase sync error, operating in local mode:', err);
        if (isMounted) setSyncStatus('local_only');
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
        setSyncStatus('local_only');
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [setThemeMode, themeMode]);

  // 3. Update preferences handler (Instant UI update + localStorage + async Supabase sync)
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

      // D. Asynchronously sync to Supabase if authenticated
      if (userId) {
        setSyncStatus('syncing');
        try {
          const supabase = createClient();

          // Update Supabase Auth user_metadata
          const { error: updateAuthErr } = await supabase.auth.updateUser({
            data: { preferences: updated },
          });

          // Attempt updating public.staff table column as well
          await supabase
            .from('staff')
            .update({ preferences: updated as any })
            .eq('id', userId);

          if (!updateAuthErr) {
            setSyncStatus('synced');
          } else {
            setSyncStatus('local_only');
          }
        } catch (e) {
          console.warn('[UserSettings] Background Supabase update failed:', e);
          setSyncStatus('local_only');
        }
      } else {
        setSyncStatus('local_only');
      }
    },
    [preferences, themeMode, userId, setThemeMode]
  );

  // 4. Reset preferences to defaults
  const resetPreferences = useCallback(async () => {
    await updatePreferences(DEFAULT_PREFERENCES);
  }, [updatePreferences]);

  const value = {
    preferences,
    updatePreferences,
    resetPreferences,
    syncStatus,
    userId,
    isLoaded,
  };

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
};

export function useUserSettings(): UserSettingsContextType {
  const context = useContext(UserSettingsContext);
  if (!context) {
    throw new Error('useUserSettings must be used within a UserSettingsProvider');
  }
  return context;
}
