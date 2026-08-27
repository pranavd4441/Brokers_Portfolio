'use client';

import React from 'react';
import { Toaster } from 'sonner';
import { AppPreferencesProvider, useAppPreferences } from './AppPreferencesProvider';
import QueryProvider from './QueryProvider';

function ThemeAwareToaster() {
  const { themeMode } = useAppPreferences();

  return (
    <Toaster
      position="top-right"
      theme={themeMode === 'DARK' ? 'dark' : 'light'}
      richColors
      toastOptions={{ className: 'os-toast' }}
    />
  );
}

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AppPreferencesProvider>
        {children}
        <ThemeAwareToaster />
      </AppPreferencesProvider>
    </QueryProvider>
  );
}
