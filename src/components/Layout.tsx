import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  const { isOsfpEnabled, toggleOSFP } = useTheme();
  const [showGame, setShowGame] = React.useState(false);
  const holdTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = React.useRef(false);
  const active = isOsfpEnabled;

  const handlePointerDown = () => {
    longPressed.current = false;
    holdTimer.current = setTimeout(() => {
      longPressed.current = true;
      setShowGame(true);
    }, 1000);
  };

  const handlePointerUp = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (!longPressed.current) {
      toggleOSFP();
    }
  };

  return (
    <>
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          if (holdTimer.current) {
            clearTimeout(holdTimer.current);
            holdTimer.current = null;
          }
        }}
        aria-pressed={active}
        aria-label={active ? 'Exit OSFP theme' : 'Enable OSFP (Olympiacos) theme'}
        title={active ? 'Πάμε Θρύλε! Hold to hoop.' : 'OSFP — Final Four edition'}
        className={cn(
          'flex cursor-pointer items-center justify-center rounded-lg border p-2 text-sm leading-none transition-opacity hover:opacity-80 select-none',
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
      <Dialog open={showGame} onOpenChange={setShowGame}>
        <DialogContent aria-describedby={undefined} className="max-w-lg sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🏀 Basketball Minigame</DialogTitle>
          </DialogHeader>
          <div className="overflow-hidden rounded-lg">
            <iframe
              src="/basket/index.html"
              className="w-full border-0"
              style={{ aspectRatio: '400 / 625' }}
              title="Basketball Game"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
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
 * Stylized riff on the Olympiacos crest — a young athlete (ephebe) wearing
 * a laurel wreath. Geometric, intentionally non-photo-real so it reads as
 * "vibe", not as the trademarked logo. Renders in whatever `currentColor`
 * is so it can sit on red, white, or anything in between.
 */
const OSFPLaurelHead = ({ size = 24 }: { size?: number }) => (
  <svg
    aria-hidden
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Laurel wreath — two arcs of leaves crowning the head */}
    <g>
      <ellipse cx="18" cy="22" rx="2.6" ry="5.4" transform="rotate(-45 18 22)" />
      <ellipse cx="22" cy="15" rx="2.6" ry="5.4" transform="rotate(-25 22 15)" />
      <ellipse cx="28" cy="11" rx="2.6" ry="5.4" transform="rotate(-10 28 11)" />
      <ellipse cx="36" cy="11" rx="2.6" ry="5.4" transform="rotate(10 36 11)" />
      <ellipse cx="42" cy="15" rx="2.6" ry="5.4" transform="rotate(25 42 15)" />
      <ellipse cx="46" cy="22" rx="2.6" ry="5.4" transform="rotate(45 46 22)" />
    </g>
    {/* Head */}
    <circle cx="32" cy="30" r="9" />
    {/* Shoulders / bust */}
    <path d="M18 58 C18 47 24 42 32 42 C40 42 46 47 46 58 Z" />
  </svg>
);

/**
 * Floating "ΘΡΥΛΟΣ" badge that only mounts in OSFP mode. Bottom-right,
 * doesn't intercept clicks. Carries the stylized ephebe crest, club name,
 * basketball, and trophy — designed so a viewer who's never heard of
 * Olympiacos still knows exactly what theme they're looking at.
 */
const OSFPCelebration = () => {
  const isOSFP = useIsOSFP();
  if (!isOSFP) return null;
  return (
    <div
      aria-hidden
      className="animate-osfp-slide-in pointer-events-none fixed bottom-4 left-1/2 z-50 flex w-max -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/25 py-2 pr-4 pl-2 text-sm font-bold text-white shadow-lg sm:left-auto sm:right-4 sm:translate-x-0"
      style={{
        background: 'linear-gradient(135deg, hsl(353 88% 42%), hsl(353 88% 30%))',
        boxShadow: '0 12px 32px -10px hsl(353 88% 42% / 0.6)',
      }}
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[hsl(353_88%_42%)] shadow-inner">
        <OSFPLaurelHead size={18} />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium tracking-[0.18em] text-white/80 uppercase">
          Ολυμπιακος Β.C.
        </span>
        <span className="text-sm tracking-wide">ΘΡΥΛΟΣ · Final Four</span>
      </span>
      <span className="animate-osfp-bounce inline-block text-base leading-none">🏀</span>
      <span className="text-base leading-none">🏆</span>
    </div>
  );
};

/**
 * Tongue-in-cheek "we're wrapping the CTF before tipoff" PSA. Sits right
 * under the navbar in OSFP mode so the joke lands the moment a viewer
 * switches in. Bold red strip with white text — impossible to miss, but
 * still pointer-event-passive so it never blocks interactions below.
 */
const OSFPTipoffBanner = () => {
  const isOSFP = useIsOSFP();
  if (!isOSFP) return null;
  return (
    <div
      role="note"
      aria-label="Olympiacos Final Four tipoff notice"
      className="w-full px-4 py-2 text-center text-sm font-semibold text-white"
      style={{
        background: 'linear-gradient(90deg, hsl(353 88% 36%), hsl(353 88% 46%), hsl(353 88% 36%))',
        boxShadow: 'inset 0 -1px 0 hsl(353 88% 28%)',
      }}
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
        <span aria-hidden>🏀</span>
        <span>
          Pencils down at <span className="font-bold tracking-wide">20:59</span> —{' '}
          <span className="hidden sm:inline">Final Four </span>tipoff waits for no shell.
        </span>
        <span aria-hidden>🏆</span>
      </span>
    </div>
  );
};

/**
 * Bold red+white vertical-stripe band — the iconic ερυθρόλευκοι kit
 * pattern, but as a slim 8px ribbon across the viewport. Renders only in
 * OSFP mode; used at the top and bottom of the page so every view is
 * unmistakably Olympiacos without compromising readability.
 */
const OSFPStripeBar = () => {
  const isOSFP = useIsOSFP();
  if (!isOSFP) return null;
  return (
    <div
      aria-hidden
      className="h-2 w-full shrink-0"
      style={{
        background:
          'repeating-linear-gradient(90deg, hsl(353 88% 42%) 0 28px, hsl(0 0% 100%) 28px 56px)',
        boxShadow: 'inset 0 -1px 0 hsl(353 35% 80%)',
      }}
    />
  );
};

const Layout = ({ children, lastUpdateTime }: LayoutProps) => (
  <div className="bg-background flex min-h-screen flex-col">
    <OSFPStripeBar />
    <Navbar lastUpdateTime={lastUpdateTime} />
    <OSFPTipoffBanner />
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
    <OSFPStripeBar />
    <Footer />
    <OSFPCelebration />
  </div>
);

export default Layout;
