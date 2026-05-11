import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useTheme } from '@/lib/theme';
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
          <button
            onClick={toggleTheme}
            aria-label={themeLabel}
            aria-pressed={isDark}
            className="bg-card border-border text-foreground cursor-pointer rounded-lg border px-3 py-1 text-sm transition-opacity hover:opacity-80"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Mobile */}
        <div className="flex items-center space-x-4 lg:hidden">
          <button
            onClick={toggleTheme}
            aria-label={themeLabel}
            aria-pressed={isDark}
            className="bg-card border-border text-foreground rounded-lg border p-2 text-sm transition-opacity hover:opacity-80"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className="bg-card border-border text-foreground rounded-lg border p-2 text-sm transition-opacity hover:opacity-80"
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
  </div>
);

export default Layout;
