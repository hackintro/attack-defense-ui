import { getCookie, setCookie } from '@/utils/cookies';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light' | 'osfp';

interface ThemeContextValue {
  theme: ThemeMode;
  /** Cycle the everyday themes (dark ↔ light). Always exits OSFP first. */
  toggleTheme: () => void;
  /** Switch into OSFP, or back out to dark. Bound to the basketball button. */
  toggleOSFP: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE_KEY = 'attack-defense-theme';

function readInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const saved = getCookie(COOKIE_KEY);
  if (saved === 'light' || saved === 'osfp') return saved;
  return 'dark';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);

  useEffect(() => {
    setCookie(COOKIE_KEY, theme, 7);
    const root = document.documentElement;
    // The .dark and .osfp classes are mutually exclusive — only one of
    // them ever wins. OSFP is a light-based palette so colorScheme stays
    // 'light' for native scrollbars/form controls.
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('osfp', theme === 'osfp');
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      toggleTheme: () =>
        setThemeState((t) => {
          // Sun/Moon button isn't aware of OSFP — if we're in it, bounce
          // back to the user's "normal" default (dark) rather than
          // silently leaving them in red.
          if (t === 'osfp') return 'dark';
          return t === 'dark' ? 'light' : 'dark';
        }),
      toggleOSFP: () => setThemeState((t) => (t === 'osfp' ? 'dark' : 'osfp')),
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
export const useIsOSFP = (): boolean => useTheme().theme === 'osfp';

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
