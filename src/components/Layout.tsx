import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsOSFP, useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Menu, Moon, Sun } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  lastUpdateTime: Date | null;
}

interface NavLinksProps {
  mobile?: boolean;
  onLinkClick?: () => void;
}

const NAV_ITEMS: { to: string; label: string }[] = [
  { to: '/', label: 'Live Graph' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/rules', label: 'Rules' },
];

const NavLinks = ({ mobile = false, onLinkClick }: NavLinksProps) => {
  const location = useLocation();
  return (
    <div className={mobile ? 'flex flex-col space-y-4' : 'flex items-center space-x-6'}>
      {NAV_ITEMS.map(({ to, label }) => {
        const active = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onLinkClick}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'text-sm font-medium transition-colors hover:opacity-80',
              active ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
};

interface NavbarProps {
  lastUpdateTime: Date | null;
}

/**
 * Basketball "OSFP mode" button. Lives next to the dark/light toggle and
 * lights up red when the theme is active — a small joke for the Olympiacos
 * Final Four day, intentionally opt-in so the everyday dark/light flow is
 * untouched.
 */
const OSFPToggle = ({ size = 16 }: { size?: number }) => {
  const { theme, toggleOSFP } = useTheme();
  const active = theme === 'osfp';
  return (
    <button
      onClick={toggleOSFP}
      aria-pressed={active}
      aria-label={active ? 'Exit OSFP theme' : 'Enable OSFP (Olympiacos) theme'}
      title={active ? 'Πάμε Θρύλε! Click to exit.' : 'OSFP — Final Four edition'}
      className={cn(
        'flex cursor-pointer items-center justify-center rounded-lg border p-2 text-sm leading-none transition-opacity hover:opacity-80',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-primary/40 shadow-md'
          : 'bg-card text-foreground border-border'
      )}
      style={{ width: size + 16, height: size + 16 }}
    >
      <span aria-hidden className="text-base leading-none">
        🏀
      </span>
    </button>
  );
};

const Navbar = ({ lastUpdateTime }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const isDark = theme === 'dark';
  const themeLabel = isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <nav className="bg-card border-border border-b px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-foreground text-xl font-bold">
            <a href="/">Attack-Defense CTF</a>
          </h1>
        </div>

        {/* Desktop */}
        <div className="hidden lg:flex lg:items-center lg:space-x-6">
          <NavLinks />
          <div className="text-muted-foreground hidden text-sm xl:block">
            Last Update: {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}
          </div>
          <div className="flex items-center space-x-2">
            <OSFPToggle size={16} />
            <button
              onClick={toggleTheme}
              aria-label={themeLabel}
              aria-pressed={isDark}
              className="bg-card border-border text-foreground cursor-pointer rounded-lg border p-2 text-sm transition-opacity hover:opacity-80"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex items-center space-x-2 lg:hidden">
          <OSFPToggle size={18} />
          <button
            onClick={toggleTheme}
            aria-label={themeLabel}
            aria-pressed={isDark}
            className="bg-card border-border text-foreground cursor-pointer rounded-lg border p-2 text-sm transition-opacity hover:opacity-80"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="bg-card border-border text-foreground cursor-pointer rounded-lg border p-2 text-sm transition-opacity hover:opacity-80"
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-card border-border border-l">
              <div className="mt-6">
                <NavLinks mobile onLinkClick={() => setSheetOpen(false)} />
                <div className="border-border text-muted-foreground mt-6 border-t pt-6 text-sm">
                  Last Update: {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

const Footer = () => (
  <footer className="bg-card border-border border-t px-4 py-4">
    <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between space-y-2 text-sm sm:flex-row sm:space-y-0">
      <span>
        <a
          href="https://github.com/hackintro/attack-defense-ui"
          className="text-primary transition-opacity hover:opacity-80"
          target="_blank"
          rel="noreferrer"
        >
          © 2026 CTF Visualization
        </a>
      </span>
      <span>
        Made by{' '}
        <a
          href="https://github.com/ethan42"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          ethan42
        </a>
        ,{' '}
        <a
          href="https://github.com/mgiannopoulos24"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          deathwish24
        </a>{' '}
        &{' '}
        <a
          href="https://github.com/TR1LON"
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          TRiLON
        </a>
      </span>
    </div>
  </footer>
);

/**
 * Floating "ΘΡΥΛΟΣ" badge that only mounts in OSFP mode. Sits in the
 * bottom-right corner, doesn't intercept clicks, and bounces a basketball
 * next to a Final Four call-out. Pure chrome — every other view stays
 * exactly as it was.
 */
const OSFPCelebration = () => {
  const isOSFP = useIsOSFP();
  if (!isOSFP) return null;
  return (
    <div
      aria-hidden
      className="animate-osfp-slide-in pointer-events-none fixed right-4 bottom-4 z-50 flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-sm font-bold text-white shadow-lg"
      style={{
        background: 'linear-gradient(135deg, hsl(353 88% 42%), hsl(353 88% 32%))',
        boxShadow: '0 10px 30px -10px hsl(353 88% 42% / 0.55)',
      }}
    >
      <span className="animate-osfp-bounce inline-block text-base leading-none">🏀</span>
      <span className="tracking-wide">ΘΡΥΛΟΣ · Final Four</span>
      <span className="text-base leading-none">🏆</span>
    </div>
  );
};

const Layout = ({ children, lastUpdateTime }: LayoutProps) => (
  <div className="bg-background flex min-h-screen flex-col">
    <Navbar lastUpdateTime={lastUpdateTime} />
    <div className="text-foreground top-16 z-50 mx-auto w-full px-4 py-2 text-right text-sm">
      Stuck?{' '}
      <a
        href="https://discord.gg/C9NpWw4wqE"
        className="underline transition-opacity hover:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        Join our Discord
      </a>
    </div>
    <main className="grow overflow-hidden">{children}</main>
    <Footer />
    <OSFPCelebration />
  </div>
);

export default Layout;
