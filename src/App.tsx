import Layout from './components/Layout';
import AttackDefenseCTFGraph from './pages/AttackDefenseCTFGraph';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import Truth from './pages/Truth';
import { getCookie, setCookie } from './utils/cookies';
import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

interface Theme {
  background: string;
  cardBackground: string;
  border: string;
  svgBackground: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  teamNameColor: string;
}

export default function App() {
  const [theme, setTheme] = useState<string>(() => {
    if (typeof document !== 'undefined') {
      const savedTheme = getCookie('attack-defense-theme');
      return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'dark';
    }
    return 'dark';
  });

  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  useEffect(() => {
    setCookie('attack-defense-theme', theme, 7);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  const themeConfig: Record<string, Theme> = {
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
            <Layout
              theme={theme}
              toggleTheme={toggleTheme}
              currentTheme={currentTheme}
              lastUpdateTime={lastUpdateTime}
            >
              <AttackDefenseCTFGraph currentTheme={currentTheme} onDataUpdate={setLastUpdateTime} />
            </Layout>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <Layout
              theme={theme}
              toggleTheme={toggleTheme}
              currentTheme={currentTheme}
              lastUpdateTime={lastUpdateTime}
            >
              <Leaderboard currentTheme={currentTheme} onDataUpdate={setLastUpdateTime} />
            </Layout>
          }
        />
        <Route
          path="truth"
          element={
            <Layout
              theme={theme}
              toggleTheme={toggleTheme}
              currentTheme={currentTheme}
              lastUpdateTime={lastUpdateTime}
            >
              <Truth currentTheme={currentTheme} onDataUpdate={setLastUpdateTime} />
            </Layout>
          }
        />
        <Route
          path="rules"
          element={
            <Layout
              theme={theme}
              toggleTheme={toggleTheme}
              currentTheme={currentTheme}
              lastUpdateTime={lastUpdateTime}
            >
              <Rules currentTheme={currentTheme} onDataUpdate={setLastUpdateTime} />
            </Layout>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
