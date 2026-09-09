import { useEffect } from 'react';
import { useThemeStore, type ThemeMode } from '@/store/themeStore';

export function useTheme() {
  const mode = useThemeStore((s) => s.mode);
  const resolved = useThemeStore((s) => s.resolved);
  const setMode = useThemeStore((s) => s.setMode);
  const resolve = useThemeStore((s) => s.resolve);

  useEffect(() => {
    resolve();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', resolve);
    return () => mq.removeEventListener('change', resolve);
  }, [resolve]);

  return {
    mode,
    resolved,
    setMode: (next: ThemeMode) => setMode(next),
  };
}