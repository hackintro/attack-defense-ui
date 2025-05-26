import Layout from './components/Layout';
import AttackDefenseCTFGraph from './pages/AttackDefenseCTFGraph';
import Leaderboard from './pages/Leaderboard';
import { getCookie, setCookie } from './utils/cookies';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

export default function App() {
  // Initialize theme from cookie immediately, or default to dark
  const [theme, setTheme] = useState(() => {
    if (typeof document !== 'undefined') {
      const savedTheme = getCookie('attack-defense-theme');
      return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'dark';
    }
    return 'dark';
  });

  // Save theme to cookie when it changes
  useEffect(() => {
    setCookie('attack-defense-theme', theme, 7);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  // Theme configuration
  const themeConfig = {
    dark: {
      background: 'bg-gray-950',
      cardBackground: 'bg-gray-800',
      border: 'border-gray-700',
      svgBackground: 'bg-gray-900',
      textPrimary: 'text-white',
      textSecondary: 'text-gray-400',
      textTertiary: 'text-gray-300',
      teamNameColor: 'white',
    },
    light: {
      background: 'bg-gray-50',
      cardBackground: 'bg-white',
      border: 'border-gray-300',
      svgBackground: 'bg-gray-100',
      textPrimary: 'text-gray-900',
      textSecondary: 'text-gray-600',
      textTertiary: 'text-gray-700',
      teamNameColor: 'black',
    },
  };

  const currentTheme = themeConfig[theme];

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout theme={theme} toggleTheme={toggleTheme} currentTheme={currentTheme}>
              <AttackDefenseCTFGraph theme={theme} currentTheme={currentTheme} />
            </Layout>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <Layout theme={theme} toggleTheme={toggleTheme} currentTheme={currentTheme}>
              <Leaderboard theme={theme} currentTheme={currentTheme} />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
