import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as d3 from 'd3';
import { useEffect, useState } from 'react';
import { Chart } from 'react-google-charts';

interface Theme {
  cardBackground: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
}

interface LeaderboardProps {
  theme?: string;
  currentTheme: Theme;
  onDataUpdate: (data: Date) => void;
}

interface TeamStatus {
  on: number;
  teams_hit: number[];
}

interface ServiceStatus {
  [service: string]: TeamStatus;
}

interface TimeWindowStatus {
  [window: string]: ServiceStatus;
}

interface TeamData {
  [teamId: string]: string;
}

interface StatusData {
  [teamId: string]: TimeWindowStatus;
}

interface TeamScore {
  rank: number;
  teamId: string;
  teamName: string;
  score: number;
  operational: number;
  attacks: number;
  compromised: number;
}

interface ScoreWindow {
  window: number;
  score: number;
}

interface ScoreHistoryEntry {
  teamId: string;
  teamName: string;
  color: string;
  values: ScoreWindow[];
}

export default function Leaderboard({ currentTheme, onDataUpdate }: LeaderboardProps) {
  const [teams, setTeams] = useState<TeamData | null>(null);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<TeamScore[]>([]);

  const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);

  useEffect(() => {
    fetch('/status')
      .then((response) => response.json())
      .then((data) => {
        setTeams(data.teams);
        setStatus(data.status);
        onDataUpdate(new Date());
      })
      .catch((error) => console.error('Error fetching status:', error));
    onDataUpdate(new Date());
  }, [onDataUpdate]);

  useEffect(() => {
    if (!teams || !status) return;

    const scores: Record<string, number> = {};
    const serviceStats: Record<
      string,
      { operational: number; attacks: number; compromised: number }
    > = {};

    for (const teamId in status) {
      scores[teamId] = 0;
      serviceStats[teamId] = {
        operational: 0,
        attacks: 0,
        compromised: 0,
      };
    }

    for (const teamId in status) {
      const teamStatus = status[teamId];

      for (const timeWindow in teamStatus) {
        const lastStatus = teamStatus[timeWindow];

        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];

          if (serviceStatus.on) {
            scores[teamId] += 42;
            serviceStats[teamId].operational += 1;
          }

          scores[teamId] += serviceStatus.teams_hit.length * 2;
          serviceStats[teamId].attacks += serviceStatus.teams_hit.length;
        }
      }
    }

    for (const attackerTeamId in status) {
      const attackerStatus = status[attackerTeamId];

      for (const timeWindow in attackerStatus) {
        const windowStatus = attackerStatus[timeWindow];

        for (const service in windowStatus) {
          const serviceStatus = windowStatus[service];

          for (const victimTeamId of serviceStatus.teams_hit) {
            scores[victimTeamId] -= 2;
            serviceStats[victimTeamId].compromised += 1;
          }
        }
      }
    }

    const sortedTeams = Object.entries(scores)
      .map(([teamId, score]) => ({
        rank: 0,
        teamId,
        teamName: teams[teamId],
        score,
        operational: serviceStats[teamId].operational,
        attacks: serviceStats[teamId].attacks,
        compromised: serviceStats[teamId].compromised,
      }))
      .sort((a, b) => b.score - a.score)
      .map((team, index) => ({
        ...team,
        rank: index + 1,
      }));

    setLeaderboardData(sortedTeams);
  }, [teams, status]);

  useEffect(() => {
    if (!teams || !status) return;

    const allWindows = new Set<number>();
    for (const teamId in status) {
      for (const windowStr in status[teamId]) {
        allWindows.add(parseInt(windowStr));
      }
    }
    const sortedWindows = Array.from(allWindows).sort((a, b) => a - b);

    const teamScores: Record<string, ScoreWindow[]> = {};

    for (const teamId in status) {
      teamScores[teamId] = [];
    }

    for (const window of sortedWindows) {
      const windowScores: Record<string, number> = {};

      for (const teamId in status) {
        windowScores[teamId] = 0;
      }

      for (const teamId in status) {
        const lastStatus = status[teamId][window];
        if (!lastStatus) continue;

        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];

          if (serviceStatus.on) {
            windowScores[teamId] += 42;
          }

          windowScores[teamId] += serviceStatus.teams_hit.length * 2;
        }
      }

      for (const attackerTeamId in status) {
        const lastStatus = status[attackerTeamId][window];
        if (!lastStatus) continue;

        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];

          for (const victimTeamId of serviceStatus.teams_hit) {
            windowScores[victimTeamId] -= 2;
          }
        }
      }

      for (const teamId in status) {
        const prevScore =
          teamScores[teamId].length > 0
            ? teamScores[teamId][teamScores[teamId].length - 1].score
            : 0;

        teamScores[teamId].push({
          window,
          score: prevScore + (windowScores[teamId] || 0),
        });
      }
    }

    const latestScores = Object.entries(teamScores).map(([teamId, arr]) => ({
      teamId,
      score: arr.length ? arr[arr.length - 1].score : 0,
    }));
    const top10 = latestScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((t) => t.teamId);

    const filtered = top10.map((teamId) => ({
      teamId,
      teamName: teams[teamId],
      color: d3.schemeCategory10[top10.indexOf(teamId) % 10],
      values: teamScores[teamId],
    }));

    setScoreHistory(filtered);
  }, [teams, status]);

  if (!teams || !status) {
    return (
      <main className="container mx-auto flex-1 px-4 py-6">
        <div className={`text-center ${currentTheme.textSecondary}`}>Loading leaderboard...</div>
      </main>
    );
  }

  return (
    <main className="container mx-auto flex-1 px-4 py-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${currentTheme.textPrimary} mb-2`}>Top 10 Teams</h2>
        <p className={currentTheme.textSecondary}>
          Score progression over time for the leading teams
        </p>
      </div>

      <div className="mb-2 w-full overflow-x-auto">
        <LineChart data={scoreHistory} currentTheme={currentTheme} />
      </div>

      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${currentTheme.textPrimary} mb-2`}>Leaderboard</h2>
        <p className={currentTheme.textSecondary}>Current team standings</p>
      </div>

      <div
        className={`${currentTheme.cardBackground} rounded-lg border ${currentTheme.border} overflow-hidden`}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={`${currentTheme.textPrimary}`}>Rank</TableHead>
              <TableHead className={`${currentTheme.textPrimary}`}>Team</TableHead>
              <TableHead className={`text-right ${currentTheme.textPrimary}`}>Score</TableHead>
              <TableHead className={`text-right ${currentTheme.textPrimary}`}>Attacks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboardData.map((team) => (
              <TableRow key={team.teamId}>
                <TableCell>
                  <div className="flex items-center">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        team.rank === 1
                          ? 'bg-yellow-500 text-white'
                          : team.rank === 2
                            ? 'bg-gray-400 text-white'
                            : team.rank === 3
                              ? 'bg-amber-600 text-white'
                              : `${currentTheme.border} border ${currentTheme.textSecondary}`
                      }`}
                    >
                      {team.rank}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={`font-medium ${currentTheme.textPrimary}`}>
                  {team.teamName}
                </TableCell>
                <TableCell className={`text-right font-semibold ${currentTheme.textPrimary}`}>
                  {team.score.toLocaleString()}
                </TableCell>

                <TableCell className="text-right">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    {team.attacks}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div
        className={`mt-6 ${currentTheme.cardBackground} rounded-lg border ${currentTheme.border} p-4`}
      >
        <h3 className={`text-lg font-semibold ${currentTheme.textPrimary} mb-3`}>Scoring System</h3>
        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className={currentTheme.textSecondary}>
              Operational Service: <span className="font-semibold text-green-400">+42 pts</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-blue-500"></div>
            <span className={currentTheme.textSecondary}>
              Successful Attack: <span className="font-semibold text-blue-400">+2 pts</span>
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-red-500"></div>
            <span className={currentTheme.textSecondary}>
              Compromised Service: <span className="font-semibold text-red-400">-2 pts</span>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}

interface LineChartProps {
  data: ScoreHistoryEntry[];
  currentTheme: Theme;
}

function LineChart({ data, currentTheme }: LineChartProps) {
  const teamNames = data.map((team) => team.teamName);
  const columns = ['Window', ...teamNames];

  const allWindows = Array.from(new Set(data.flatMap((d) => d.values.map((v) => v.window)))).sort(
    (a, b) => a - b
  );

  const rows = allWindows.map((window) => {
    const row: (number | null)[] = [window];
    data.forEach((team) => {
      const found = team.values.find((v) => v.window === window);
      row.push(found ? found.score : null);
    });
    return row;
  });

  const chartData = [columns, ...rows];

  const options = {
    curveType: 'function' as const,
    legend: {
      position: 'top' as const,
      alignment: 'center' as const,
      textStyle: {
        color: currentTheme.textPrimary === 'text-white' ? '#ffffff' : '#111827',
        fontSize: 15,
      },
    },
    chartArea: { left: 60, top: 60, width: '100%' as const, height: '70%' as const },
    hAxis: {
      title: 'Window',
      gridlines: {
        count: 20,
        color: currentTheme.textSecondary === 'text-gray-400' ? '#374151' : '#d1d5db',
      },
      viewWindow: { min: 0, max: 192 },
      ticks: Array.from({ length: 20 }, (_, i) => i * 10),
      titleTextStyle: {
        color: currentTheme.textSecondary === 'text-gray-400' ? '#9ca3af' : '#6b7280',
      },
      textStyle: { color: currentTheme.textSecondary === 'text-gray-400' ? '#9ca3af' : '#6b7280' },
      baselineColor: currentTheme.textSecondary === 'text-gray-400' ? '#4b5563' : '#9ca3af',
    },
    vAxis: {
      title: 'Points',
      gridlines: {
        count: 8,
        color: currentTheme.textSecondary === 'text-gray-400' ? '#374151' : '#d1d5db',
      },
      minValue: 0,
      ticks: (() => {
        const maxScore = Math.max(5000, ...data.flatMap((d) => d.values.map((v) => v.score)));
        const arr: number[] = [];
        for (let i = 0; i <= maxScore + 1; i += 5000) arr.push(i);
        return arr;
      })(),
      titleTextStyle: {
        color: currentTheme.textSecondary === 'text-gray-400' ? '#9ca3af' : '#6b7280',
      },
      textStyle: { color: currentTheme.textSecondary === 'text-gray-400' ? '#9ca3af' : '#6b7280' },
      baselineColor: currentTheme.textSecondary === 'text-gray-400' ? '#4b5563' : '#9ca3af',
    },
    series: data.reduce((acc: Record<number, { color: string }>, team, idx) => {
      acc[idx] = { color: team.color };
      return acc;
    }, {}),
    backgroundColor: 'transparent' as const,
    fontName: 'inherit' as const,
    titleTextStyle: {
      color: currentTheme.textPrimary === 'text-white' ? '#ffffff' : '#111827',
      fontSize: 20,
    },
  };

  return (
    <div className="h-[520px] w-full min-w-screen">
      <Chart
        chartType="LineChart"
        width="100%"
        height="95%"
        data={chartData}
        options={options}
        loader={<div>Loading Chart...</div>}
      />
    </div>
  );
}
