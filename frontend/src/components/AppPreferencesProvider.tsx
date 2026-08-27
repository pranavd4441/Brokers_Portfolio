'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { isLocale, translate, type Locale, type MessageKey } from '@/i18n';
import { resolveBrandPalette, type ThemeMode } from '@/lib/theme';
import { useAuthStore } from '@/store/useAuthStore';

const LOCALE_STORAGE_KEY = 'propertyos_locale';
const THEME_STORAGE_KEY = 'propertyos_theme_preview';
const PREFERENCE_EVENT = 'propertyos-preference-change';

interface AppPreferencesValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  themeMode: ThemeMode;
  setThemeMode: (theme: ThemeMode) => void;
  t: (key: MessageKey) => string;
}

const AppPreferencesContext = createContext<AppPreferencesValue | null>(null);

function subscribeToPreferences(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(PREFERENCE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(PREFERENCE_EVENT, callback);
  };
}

function getStoredLocale(): Locale | null {
  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return isLocale(value) ? value : null;
}

function getBrowserLocale(): Locale {
  const value = window.navigator.language.split('-')[0];
  return isLocale(value) ? value : 'en';
}

function getStoredTheme(): ThemeMode | null {
  const value = window.localStorage.getItem(THEME_STORAGE_KEY);
  return value === 'LIGHT' || value === 'DARK' ? value : null;
}

function subscribeToBrowserLocale() {
  return () => undefined;
}

export function AppPreferencesProvider({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const storedLocale = useSyncExternalStore(subscribeToPreferences, getStoredLocale, () => null);
  const browserLocale = useSyncExternalStore(subscribeToBrowserLocale, getBrowserLocale, () => 'en' as Locale);
  const storedTheme = useSyncExternalStore(subscribeToPreferences, getStoredTheme, () => null);
  const tenantLocale = isLocale(user?.tenant?.preferred_locale) ? user.tenant.preferred_locale : null;
  const tenantTheme = user?.tenant?.theme_mode === 'DARK' ? 'DARK' : 'LIGHT';
  const locale = storedLocale ?? tenantLocale ?? browserLocale;
  const themeMode = storedTheme ?? tenantTheme;

  useEffect(() => {
    const root = document.documentElement;
    const palette = resolveBrandPalette(user?.tenant?.brand_color, themeMode);
    root.dataset.theme = themeMode.toLowerCase();
    root.lang = locale;
    root.style.setProperty('--ui-brand', palette.brand);
    root.style.setProperty('--ui-brand-strong', palette.strong);
    root.style.setProperty('--ui-brand-ink', palette.ink);
  }, [locale, themeMode, user?.tenant?.brand_color]);

  const setLocale = useCallback((nextLocale: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }, []);

  const setThemeMode = useCallback((nextTheme: ThemeMode) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(PREFERENCE_EVENT));
  }, []);

  const value = useMemo<AppPreferencesValue>(() => ({
    locale,
    setLocale,
    themeMode,
    setThemeMode,
    t: (key) => translate(locale, key),
  }), [locale, setLocale, setThemeMode, themeMode]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function useAppPreferences(): AppPreferencesValue {
  const value = useContext(AppPreferencesContext);
  if (!value) throw new Error('useAppPreferences must be used inside AppPreferencesProvider');
  return value;
}
