import { getCookie, setCookie } from '@/utils/cookies';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE_KEY = 'attack-defense-theme';

function readInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const saved = getCookie(COOKIE_KEY);
  return saved === 'light' ? 'light' : 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    setCookie(COOKIE_KEY, theme, 7);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    // Hint native UI (scrollbars, form controls) to follow the theme.
    root.style.colorScheme = theme;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export const useIsDark = (): boolean => useTheme().theme === 'dark';

/**
 * Read a CSS HSL token (e.g. "--foreground") from the live document.
 * Returns a `hsl(...)` string usable in inline styles, SVG fills, or
 * third-party chart libs that don't speak CSS variables (e.g. Plotly).
 */
export function readHslToken(token: string): string {
  if (typeof document === 'undefined') return '';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return raw ? `hsl(${raw})` : '';
}
