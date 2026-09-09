import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  resolve: () => void;
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveTo(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return mode;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: 'light',
      setMode: (mode) => {
        const resolved = resolveTo(mode);
        set({ mode, resolved });
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      },
      resolve: () => {
        const { mode } = get();
        const resolved = resolveTo(mode);
        set({ resolved });
        document.documentElement.classList.toggle('dark', resolved === 'dark');
      },
    }),
    { name: 'wablast:theme' },
  ),
);