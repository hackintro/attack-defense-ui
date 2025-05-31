import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, Moon, Sun } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = ({ theme, toggleTheme, currentTheme, lastUpdateTime }) => {
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const NavLinks = ({ mobile = false, onLinkClick = () => {} }) => (
    <div className={`flex ${mobile ? 'flex-col space-y-4' : 'items-center space-x-6'}`}>
      <Link
        to="/"
        onClick={() => {
          onLinkClick();
          if (mobile) setSheetOpen(false);
        }}
        className={`text-sm font-medium transition-colors hover:opacity-80 ${
          location.pathname === '/' ? currentTheme.textPrimary : currentTheme.textSecondary
        }`}
      >
        Live Graph
      </Link>
      <Link
        to="/leaderboard"
        onClick={() => {
          onLinkClick();
          if (mobile) setSheetOpen(false);
        }}
        className={`text-sm font-medium transition-colors hover:opacity-80 ${
          location.pathname === '/leaderboard'
            ? currentTheme.textPrimary
            : currentTheme.textSecondary
        }`}
      >
        Leaderboard
      </Link>
      <Link
        to="/rules"
        onClick={() => {
          onLinkClick();
          if (mobile) setSheetOpen(false);
        }}
        className={`text-sm font-medium transition-colors hover:opacity-80 ${
          location.pathname === '/rules' ? currentTheme.textPrimary : currentTheme.textSecondary
        }`}
      >
        Rules
      </Link>
    </div>
  );

  return (
    <nav className={`${currentTheme.cardBackground} border-b ${currentTheme.border} px-4 py-3`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className={`text-xl font-bold ${currentTheme.textPrimary}`}>
            <a href="/">🛡️ Attack-Defense CTF</a>
          </h1>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:space-x-6">
          <NavLinks />
          <div className={`${currentTheme.textSecondary} hidden text-sm xl:block`}>
            Last Update: {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'Never'}
          </div>
          <button
            onClick={toggleTheme}
            className={`rounded-lg px-3 py-1 ${currentTheme.cardBackground} ${currentTheme.border} border ${currentTheme.textPrimary} text-sm transition-opacity hover:opacity-80`}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div className="flex items-center space-x-4 lg:hidden">
          <button
            onClick={toggleTheme}
            className={`rounded-lg p-2 ${currentTheme.cardBackground} ${currentTheme.border} border ${currentTheme.textPrimary} text-sm transition-opacity hover:opacity-80`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={`rounded-lg p-2 ${currentTheme.cardBackground} ${currentTheme.border} border ${currentTheme.textPrimary} text-sm transition-opacity hover:opacity-80`}
                aria-label="Open navigation menu"
              >
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className={`${currentTheme.cardBackground} border-l ${currentTheme.border} [&>button]:${theme === 'dark' ? 'text-white' : 'text-black'}`}
            >
              <div className="mt-6">
                <NavLinks mobile onLinkClick={() => {}} />
                <div
                  className={`mt-6 border-t pt-6 ${currentTheme.border} ${currentTheme.textSecondary} text-sm`}
                >
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

const Footer = ({ currentTheme }) => (
  <footer className={`${currentTheme.cardBackground} border-t ${currentTheme.border} px-4 py-4`}>
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between space-y-2 text-sm sm:flex-row sm:space-y-0">
      <div className={currentTheme.textSecondary}>
        <span>
          <a
            href="https://github.com/hackintro/attack-defense-ui"
            className="underline transition-opacity hover:opacity-80"
            target="_blank"
            rel="noopener noreferrer"
          >
            © 2025 CTF Visualization{' '}
          </a>
        </span>
      </div>
      <div className={`flex items-center space-x-4 ${currentTheme.textSecondary}`}>
        <span>Made by ethan42 & deathwish24</span>
      </div>
    </div>
  </footer>
);

const Layout = ({ children, theme, toggleTheme, currentTheme, lastUpdateTime }) => {
  return (
    <div className={`flex min-h-screen flex-col ${currentTheme.background}`}>
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        currentTheme={currentTheme}
        lastUpdateTime={lastUpdateTime}
      />
      <div
        className={`top-16 z-50 mx-auto w-full px-4 py-2 text-right text-sm ${currentTheme.textPrimary} transition-all duration-300`}
      >
        Stuck?{' '}
        <a
          href="https://discord.gg/C9NpWw4wqE "
          className="underline transition-opacity hover:opacity-80"
          target="_blank"
          rel="noopener noreferrer"
        >
          Join our Discord
        </a>
      </div>
      <main className="flex-grow overflow-hidden">{children}</main>
      <Footer currentTheme={currentTheme} />
    </div>
  );
};

export default Layout;
