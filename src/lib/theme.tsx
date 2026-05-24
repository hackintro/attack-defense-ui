import { getCookie, setCookie } from '@/utils/cookies';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextValue {
  theme: ThemeMode;
  isOsfpEnabled: boolean;
  toggleTheme: () => void;
  toggleOSFP: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const COOKIE_KEY = 'attack-defense-theme';
const OSFP_COOKIE_KEY = 'attack-defense-osfp';

function readInitialTheme(): ThemeMode {
  if (typeof document === 'undefined') return 'dark';
  const saved = getCookie(COOKIE_KEY);
  if (saved === 'light') return 'light';
  return 'dark';
}

function readInitialOsfp(): boolean {
  if (typeof document === 'undefined') return false;
  const themeCookie = getCookie(COOKIE_KEY);
  if (themeCookie === 'osfp') return true;
  return getCookie(OSFP_COOKIE_KEY) === 'true';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme);
  const [osfpEnabled, setOsfpEnabled] = useState(readInitialOsfp);

  useEffect(() => {
    setCookie(COOKIE_KEY, theme, 7);
    setCookie(OSFP_COOKIE_KEY, osfpEnabled ? 'true' : 'false', 7);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.classList.toggle('osfp', false);
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
  }, [theme, osfpEnabled]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme: setThemeState,
      isOsfpEnabled: osfpEnabled,
      toggleTheme: () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark')),
      toggleOSFP: () => setOsfpEnabled((p) => !p),
    }),
    [theme, osfpEnabled]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export const useIsDark = (): boolean => useTheme().theme === 'dark';
export const useIsOSFP = (): boolean => useTheme().isOsfpEnabled;

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
