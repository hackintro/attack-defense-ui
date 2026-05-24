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
  type ScorePayload,
  type SeriesMode,
  type StatsBlock,
  type TeamData,
  type TeamScoreRow,
  type TeamSeries,
  rankFromStats,
  seriesFromAggregate,
  topNSeries,
} from '@/lib/scoring';
import { readHslToken, useIsDark } from '@/lib/theme';
import confetti from 'canvas-confetti';
import * as d3 from 'd3';
import { useEffect, useMemo, useRef, useState } from 'react';

interface LeaderboardProps {
  onDataUpdate: (data: Date) => void;
}

type RankedTeam = TeamScoreRow;

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
  const [stats, setStats] = useState<StatsBlock | null>(null);
  const [chartView, setChartView] = useState<SeriesMode>('cumulative');

  useEffect(() => {
    fetch('/status/latest.json')
      .then((response) => response.json())
      .then((data: ScorePayload) => {
        setTeams(data.teams);
        setStats(data.stats);
        onDataUpdate(new Date());
      })
      .catch((error) => console.error('Error fetching status:', error));
  }, [onDataUpdate]);

  useEffect(() => {
    if (!teams) return;

    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const interval = setInterval(() => {
      confetti({ ...defaults, particleCount: 50, origin: { x: Math.random() * 0.3, y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount: 50, origin: { x: 0.7 + Math.random() * 0.3, y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, [teams]);

  const leaderboardData = useMemo<RankedTeam[]>(
    () => (teams && stats ? rankFromStats(teams, stats) : []),
    [teams, stats]
  );

  const scoreHistory = useMemo<TeamSeries[]>(() => {
    if (!teams || !stats) return [];
    // Rank top 10 by cumulative score so the same teams (in the same
    // legend order/colors) show up regardless of which view is active —
    // toggling shouldn't reshuffle the chart.
    const cumulative = seriesFromAggregate(teams, stats, 'cumulative');
    const topCumulative = topNSeries(cumulative, 10);
    const orderedIds = topCumulative.map((s) => s.teamId);

    const source =
      chartView === 'cumulative'
        ? topCumulative
        : (() => {
            const perWindow = seriesFromAggregate(teams, stats, 'perWindow');
            const byId = new Map(perWindow.map((s) => [s.teamId, s]));
            return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
          })();

    return source.map((s, i) => ({
      ...s,
      // attach a stable D3 categorical color for the chart legend
      color: d3.schemeCategory10[i % 10],
    })) as TeamSeries[];
  }, [teams, stats, chartView]);

  if (!teams || !stats) {
    return (
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className="text-muted-foreground text-center">Loading leaderboard...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 max-sm:flex-col max-sm:items-center">
        <div>
          <h2 className="text-foreground mb-2 text-2xl font-bold">Top 10 Teams</h2>
          <p className="text-muted-foreground">
            {chartView === 'cumulative'
              ? 'Cumulative score progression for the leading teams'
              : 'Per-window score deltas for the leading teams'}
          </p>
        </div>
        <ChartViewToggle value={chartView} onChange={setChartView} />
      </div>

      <div className="bg-card border-border mb-2 w-full rounded-lg border p-2 sm:p-4">
        <LineChart data={scoreHistory} mode={chartView} />
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
              Operational Service: <span className="text-success font-semibold">Up to +42 pts</span>
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

/**
 * Segmented "Cumulative / Per window" switch above the chart. Matches the
 * pill-style buttons used elsewhere in the app so the chrome stays cohesive.
 */
function ChartViewToggle({
  value,
  onChange,
}: {
  value: SeriesMode;
  onChange: (mode: SeriesMode) => void;
}) {
  const options: { value: SeriesMode; label: string }[] = [
    { value: 'cumulative', label: 'Cumulative' },
    { value: 'perWindow', label: 'Per window' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Chart view"
      className="border-border bg-card relative inline-flex rounded-lg border p-0.5"
    >
      <div
        className="bg-primary absolute top-0.5 left-0.5 h-[calc(100%-4px)] w-1/2 rounded-md transition-all duration-300 ease-in-out"
        style={{
          transform: `translateX(${value === 'perWindow' ? '100%' : '0%'})`,
        }}
      />
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 cursor-pointer rounded-md px-3 py-1.5 text-sm transition-colors ${
              active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

interface LineChartProps {
  data: (TeamSeries & { color?: string })[];
  mode: SeriesMode;
}

/**
 * Pick an x-axis tick interval that yields roughly 6–12 labels regardless
 * of how far the competition has progressed (9 windows in early game,
 * 192 by the end).
 */
function pickXDtick(maxWindow: number): number {
  if (maxWindow <= 12) return 1;
  if (maxWindow <= 30) return 2;
  if (maxWindow <= 60) return 5;
  if (maxWindow <= 120) return 10;
  return 20;
}

/**
 * Lazy-loads plotly.js-dist-min so the live-graph route doesn't pay the
 * chart bundle cost. We use the pre-bundled browser build (`-dist-min`)
 * instead of the source `plotly.js` package because Vite 8 doesn't polyfill
 * Node built-ins like `stream`, which the source build expects.
 */
function LineChart({ data, mode }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = useIsDark();
  const yAxisTitle = mode === 'cumulative' ? 'Total score' : 'Score this window';
  const hoverLabel = mode === 'cumulative' ? 'Total' : 'Window Δ';
  // Cumulative scores are always ≥ 0 by construction, so anchoring the
  // axis at zero gives a clean baseline. Per-window deltas dip negative
  // when defenses break — let Plotly autoscale naturally there.
  const yRangeMode: 'tozero' | 'normal' = mode === 'cumulative' ? 'tozero' : 'normal';

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;
    let cancelled = false;
    let plotlyRef: typeof import('plotly.js-dist-min') | null = null;
    const node = chartRef.current;

    const isSmallScreen = () => window.innerWidth < 640;

    // Bound the x-axis to the data, not a fixed 0..192 range — otherwise
    // early-game data is crushed into the left ~5% of the chart. The y-axis
    // is left to Plotly's autoscaler (with rangemode: tozero) so the old
    // dtick=5000 stops hiding all tick labels when scores are still in the
    // low thousands.
    let maxWindow = 0;
    for (const t of data) {
      for (const v of t.values) {
        if (v.window > maxWindow) maxWindow = v.window;
      }
    }
    // Pad the right edge a bit so the latest point isn't pinned to the axis,
    // and clamp to a minimum so a single-point chart still looks reasonable.
    const xMax = Math.max(maxWindow + Math.max(1, Math.ceil(maxWindow * 0.05)), 8);
    const xDtick = pickXDtick(xMax);

    (async () => {
      const mod = await import('plotly.js-dist-min');
      if (cancelled || !node) return;
      plotlyRef = mod;
      const Plotly = mod.default;

      const traces = data.map((team) => ({
        x: team.values.map((v) => v.window),
        y: team.values.map((v) => v.score),
        type: 'scatter' as const,
        mode: team.values.length <= 20 ? ('lines+markers' as const) : ('lines' as const),
        name: team.teamName,
        line: { color: team.color, width: 2.5, shape: 'spline' as const },
        marker: { size: 6, color: team.color },
        hovertemplate: `<b>%{fullData.name}</b><br>Window %{x}<br>${hoverLabel} %{y:,}<extra></extra>`,
      }));

      // Resolve theme tokens at chart-time so light/dark match the design system.
      const fg = readHslToken('--foreground') || (isDark ? '#e6edf3' : '#0b1320');
      const muted = readHslToken('--muted-foreground') || (isDark ? '#8b96a4' : '#5a6677');
      const grid = readHslToken('--border') || (isDark ? '#1f2a36' : '#d5dde5');

      const buildLayout = (): Partial<import('plotly.js-dist-min').Layout> => {
        const small = isSmallScreen();
        return {
          paper_bgcolor: 'transparent',
          plot_bgcolor: 'transparent',
          font: { color: fg, size: small ? 11 : 13 },
          xaxis: {
            title: { text: 'Time Window', font: { color: muted, size: small ? 11 : 13 } },
            gridcolor: grid,
            zerolinecolor: grid,
            tickcolor: grid,
            range: [0, xMax],
            dtick: xDtick,
            tickfont: { color: muted },
          },
          yaxis: {
            title: { text: yAxisTitle, font: { color: muted, size: small ? 11 : 13 } },
            gridcolor: grid,
            zerolinecolor: grid,
            tickcolor: grid,
            rangemode: yRangeMode,
            nticks: small ? 5 : 8,
            tickformat: ',d',
            tickfont: { color: muted },
            automargin: true,
          },
          showlegend: false,
          margin: { t: 16, b: small ? 16 : 20, l: small ? 56 : 64, r: 16 },
          autosize: true,
          hovermode: small ? 'x unified' : 'closest',
          hoverlabel: { bgcolor: isDark ? '#0f1620' : '#ffffff', font: { color: fg } },
        };
      };

      Plotly.newPlot(node, traces, buildLayout(), {
        responsive: true,
        displayModeBar: false,
      });

      // Re-apply layout on resize so the small-screen vs. large-screen
      // tweaks (font sizes, hovermode, margins) follow the viewport.
      const onResize = () => {
        if (!node) return;
        Plotly.relayout(node, buildLayout());
      };
      window.addEventListener('resize', onResize);

      // Stash for cleanup.
      (node as unknown as { __onResize?: () => void }).__onResize = onResize;
    })();

    return () => {
      cancelled = true;
      const handler = (node as unknown as { __onResize?: () => void }).__onResize;
      if (handler) window.removeEventListener('resize', handler);
      if (plotlyRef && node) plotlyRef.default.purge(node);
    };
  }, [data, isDark, yAxisTitle, hoverLabel, yRangeMode]);

  return (
    <>
      <div ref={chartRef} className="h-[360px] w-full sm:h-[480px] lg:h-[560px]" />
      {data.length > 0 && (
        <div className="mt-2 flex justify-center">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {data.map((team) => (
              <div key={team.teamId} className="flex items-center gap-2 truncate pl-2 sm:pl-0">
                <span
                  className="inline-block h-0.5 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: team.color }}
                />
                <span className="text-muted-foreground truncate text-xs">{team.teamName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
