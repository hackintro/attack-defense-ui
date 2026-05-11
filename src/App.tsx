import Layout from './components/Layout';
import { ThemeProvider } from './lib/theme';
import AttackDefenseCTFGraph from './pages/AttackDefenseCTFGraph';
import Leaderboard from './pages/Leaderboard';
import Rules from './pages/Rules';
import Truth from './pages/Truth';
import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

export default function App() {
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout lastUpdateTime={lastUpdateTime}>
                <AttackDefenseCTFGraph onDataUpdate={setLastUpdateTime} />
              </Layout>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <Layout lastUpdateTime={lastUpdateTime}>
                <Leaderboard onDataUpdate={setLastUpdateTime} />
              </Layout>
            }
          />
          <Route
            path="/truth"
            element={
              <Layout lastUpdateTime={lastUpdateTime}>
                <Truth onDataUpdate={setLastUpdateTime} />
              </Layout>
            }
          />
          <Route
            path="/rules"
            element={
              <Layout lastUpdateTime={lastUpdateTime}>
                <Rules onDataUpdate={setLastUpdateTime} />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
