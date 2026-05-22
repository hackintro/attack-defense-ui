import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type StatusData,
  type TeamData,
  type TeamScoreRow,
  type TeamSeries,
  computeScoreSeries,
  rankTeams,
  topNSeries,
} from '@/lib/scoring';
import { readHslToken, useIsDark } from '@/lib/theme';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';

interface LeaderboardProps {
  onDataUpdate: (data: Date) => void;
}

interface RankedTeam extends TeamScoreRow {
  rank: number;
}

/**
 * Medal styling for ranks 1-3. Gold / silver / bronze with a soft outer
 * glow so they pop on the dark Cyber Noir surface (and still read on light).
 * Ranks 4+ get a neutral outlined badge.
 */
function rankMedalClasses(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-yellow-400 text-yellow-950 ring-2 ring-yellow-300 shadow-md shadow-yellow-500/40';
    case 2:
      return 'bg-slate-300 text-slate-900 ring-2 ring-slate-200 shadow-md shadow-slate-400/40';
    case 3:
      return 'bg-amber-700 text-amber-50 ring-2 ring-amber-600 shadow-md shadow-amber-800/40';
    default:
      return 'border-border text-muted-foreground border';
  }
}

export default function Leaderboard({ onDataUpdate }: LeaderboardProps) {
  const [teams, setTeams] = useState<TeamData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    fetch('/status')
      .then((response) => response.json())
      .then((data) => {
        setTeams(data.teams);
        setStatus(data.status);
        onDataUpdate(new Date());
      })
      .catch((error) => console.error('Error fetching status:', error));
  }, [onDataUpdate]);

  const leaderboardData = useMemo<RankedTeam[]>(
    () => (teams && status ? (rankTeams(status, teams) as RankedTeam[]) : []),
    [teams, status]
  );

  const scoreHistory = useMemo<TeamSeries[]>(() => {
    if (!teams || !status) return [];
    const series = computeScoreSeries(status, teams);
    const top = topNSeries(series, 10);
    return top.map((s, i) => ({
      ...s,
      // attach a stable D3 categorical color for the chart legend
      color: d3.schemeCategory10[i % 10],
    })) as TeamSeries[];
  }, [teams, status]);

  if (!teams || !status) {
    return (
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="text-muted-foreground text-center">Loading leaderboard...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className="mb-6">
        <h2 className="text-foreground mb-2 text-2xl font-bold">Top 10 Teams</h2>
        <p className="text-muted-foreground">Score progression over time for the leading teams</p>
      </div>

      <div className="mb-2 w-full overflow-x-auto">
        <LineChart data={scoreHistory} />
      </div>

      <div className="mb-6">
        <h2 className="text-foreground mb-2 text-2xl font-bold">Leaderboard</h2>
        <p className="text-muted-foreground">Current team standings</p>
      </div>

      <div className="bg-card border-border overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground font-bold">Rank</TableHead>
              <TableHead className="text-foreground font-bold">Team</TableHead>
              <TableHead className="text-foreground text-right font-bold">Score</TableHead>
              <TableHead className="text-foreground text-right font-bold">Attacks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboardData.map((team) => (
              <TableRow key={team.teamId}>
                <TableCell>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${rankMedalClasses(
                        team.rank
                      )}`}
                    >
                      {team.rank}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-foreground font-medium">{team.teamName}</TableCell>
                <TableCell className="text-foreground text-right font-semibold">
                  {team.score.toLocaleString()}
                </TableCell>

                <TableCell className="text-right">
                  <Badge variant="secondary" className="bg-info/15 text-info border-info/30 border">
                    {team.attacks}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-card border-border mt-6 rounded-lg border p-4">
        <h3 className="text-foreground mb-3 text-lg font-semibold">Scoring System</h3>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="text-muted-foreground flex items-center space-x-2">
            <div className="bg-success h-3 w-3 rounded-full" />
            <span>
              Operational Service: <span className="text-success font-semibold">+42 pts (scaled by patch diff)</span>
            </span>
          </div>
          <div className="text-muted-foreground flex items-center space-x-2">
            <div className="bg-info h-3 w-3 rounded-full" />
            <span>
              Successful Attack: <span className="text-info font-semibold">+6 pts</span>
            </span>
          </div>
          <div className="text-muted-foreground flex items-center space-x-2">
            <div className="bg-destructive h-3 w-3 rounded-full" />
            <span>
              Compromised Service: <span className="text-destructive font-semibold">-6 pts</span>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

interface LineChartProps {
  data: (TeamSeries & { color?: string })[];
}

/**
 * Lazy-loads plotly.js-dist-min so the live-graph route doesn't pay the
 * chart bundle cost. We use the pre-bundled browser build (`-dist-min`)
 * instead of the source `plotly.js` package because Vite 8 doesn't polyfill
 * Node built-ins like `stream`, which the source build expects.
 */
function LineChart({ data }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = useIsDark();

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;
    let cancelled = false;
    let plotlyRef: typeof import('plotly.js-dist-min') | null = null;
    const node = chartRef.current;

    (async () => {
      const mod = await import('plotly.js-dist-min');
      if (cancelled || !node) return;
      plotlyRef = mod;
      const Plotly = mod.default;

      const traces = data.map((team) => ({
        x: team.values.map((v) => v.window),
        y: team.values.map((v) => v.score),
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: team.teamName,
        line: { color: team.color },
      }));

      const isSmallScreen = window.innerWidth < 640;

      // Resolve theme tokens at chart-time so light/dark match the design system.
      const fg = readHslToken('--foreground') || (isDark ? '#e6edf3' : '#0b1320');
      const grid = readHslToken('--border') || (isDark ? '#1f2a36' : '#d5dde5');
      const zero = readHslToken('--muted-foreground') || (isDark ? '#8b96a4' : '#5a6677');

      const layout: Partial<import('plotly.js-dist-min').Layout> = {
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { color: fg, size: 14 },
        title: { text: '', font: { size: 20 } },
        xaxis: {
          gridcolor: grid,
          zerolinecolor: zero,
          range: [0, 192],
          dtick: 10,
        },
        yaxis: {
          gridcolor: grid,
          zerolinecolor: zero,
          rangemode: 'tozero',
          dtick: 5000,
        },
        legend: {
          orientation: isSmallScreen ? 'v' : 'h',
          x: isSmallScreen ? 1 : 0.5,
          xanchor: 'center',
          y: isSmallScreen ? 0.5 : 1.1,
        },
        margin: { t: 20, b: 50, l: 60, r: isSmallScreen ? 100 : 20 },
        autosize: true,
        hovermode: isSmallScreen ? 'x unified' : 'closest',
      };

      Plotly.newPlot(node, traces, layout, {
        responsive: true,
        displayModeBar: false,
      });
    })();

    return () => {
      cancelled = true;
      if (plotlyRef && node) plotlyRef.default.purge(node);
    };
  }, [data, isDark]);

  return <div ref={chartRef} className="h-[520px] w-full" />;
}
