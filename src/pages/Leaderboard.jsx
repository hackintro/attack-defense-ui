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

export default function Leaderboard({ theme, currentTheme, onDataUpdate }) {
  const [teams, setTeams] = useState(null);
  const [status, setStatus] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);

  // Compute scores per window for each team
  const [scoreHistory, setScoreHistory] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API call
    fetch('/status')
      .then((response) => response.json())
      .then((data) => {
        setTeams(data.teams);
        setStatus(data.status);
        onDataUpdate(new Date());
      })
      .catch((error) => console.error('Error fetching status:', error));
    /*
    // Mock data for testing (same as AttackDefenseCTFGraph)
    const mockData = {
      teams: {
        1: 'Team Alpha',
        2: 'Team Beta',
        3: 'Team Gamma',
        4: 'Team Delta',
      },
      status: {
        1: {
          0: {
            mapflix: { on: 1, teams_hit: [2, 3, 4] },
            powerball: { on: 1, teams_hit: [2, 3, 4] },
            bananananana: { on: 1, teams_hit: [2, 3, 4] },
            auth: { on: 1, teams_hit: [2, 3, 4] },
            muzac: { on: 1, teams_hit: [2, 3, 4] },
            pwnazon: { on: 1, teams_hit: [2, 3, 4] },
          },
        },
        2: {
          0: {
            mapflix: { on: 1, teams_hit: [1, 3, 4] },
            powerball: { on: 1, teams_hit: [1, 3, 4] },
            bananananana: { on: 1, teams_hit: [1, 3, 4] },
            auth: { on: 1, teams_hit: [1, 3, 4] },
            muzac: { on: 1, teams_hit: [1, 3, 4] },
            pwnazon: { on: 1, teams_hit: [1, 3, 4] },
          },
        },
        3: {
          0: {
            mapflix: { on: 1, teams_hit: [1, 2, 4] },
            powerball: { on: 1, teams_hit: [1, 2, 4] },
            bananananana: { on: 1, teams_hit: [1, 2, 4] },
            auth: { on: 1, teams_hit: [1, 2, 4] },
            muzac: { on: 1, teams_hit: [1, 2, 4] },
            pwnazon: { on: 1, teams_hit: [1, 2, 4] },
          },
        },
        4: {
          0: {
            mapflix: { on: 1, teams_hit: [1, 2, 3] },
            powerball: { on: 1, teams_hit: [1, 2, 3] },
            bananananana: { on: 1, teams_hit: [1, 2, 3] },
            auth: { on: 1, teams_hit: [1, 2, 3] },
            muzac: { on: 1, teams_hit: [1, 2, 3] },
            pwnazon: { on: 1, teams_hit: [1, 2, 3] },
          },
        },
      },
    };

    setTeams(mockData.teams);
    setStatus(mockData.status);

*/
    onDataUpdate(new Date());
  }, [onDataUpdate]);

  useEffect(() => {
    if (!teams || !status) return;

    // Compute score per team (same logic as AttackDefenseCTFGraph)
    // Every window, each team gathers 42 points for each operational service.
    // They lose 2 points for each team that hits them
    // They gain 2 points for each team they hit
    const scores = {};
    const serviceStats = {};

    for (const teamId in status) {
      const teamStatus = status[teamId];
      scores[teamId] = 0;
      serviceStats[teamId] = {
        operational: 0,
        attacks: 0,
        compromised: 0,
      };

      for (const timeWindow in teamStatus) {
        const lastStatus = teamStatus[timeWindow];

        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          if (serviceStatus.on) {
            scores[teamId] += 42;
            scores[teamId] += serviceStatus.teams_hit.length * 2;
            serviceStats[teamId].operational += 1;
            serviceStats[teamId].attacks += serviceStatus.teams_hit.length;
          } else {
            scores[teamId] -= serviceStatus.teams_hit.length * 2;
            serviceStats[teamId].compromised += serviceStatus.teams_hit.length;
          }
        }
      }
    }

    // Convert to array and sort by score
    const sortedTeams = Object.entries(scores)
      .map(([teamId, score]) => ({
        rank: 0, // Will be set after sorting
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

    // Gather all windows
    const allWindows = new Set();
    for (const teamId in status) {
      for (const window in status[teamId]) {
        allWindows.add(parseInt(window));
      }
    }
    const sortedWindows = Array.from(allWindows).sort((a, b) => a - b);

    // Compute scores for each team at each window
    const teamScores = {};
    for (const teamId in status) {
      teamScores[teamId] = [];
      let cumulativeScore = 0;
      for (const window of sortedWindows) {
        const lastStatus = status[teamId][window];
        if (!lastStatus) {
          teamScores[teamId].push({ window, score: cumulativeScore });
          continue;
        }
        let windowScore = 0;
        for (const service in lastStatus) {
          const serviceStatus = lastStatus[service];
          if (serviceStatus.on) {
            windowScore += 42;
            windowScore += serviceStatus.teams_hit.length * 2;
          } else {
            windowScore -= serviceStatus.teams_hit.length * 2;
          }
        }
        cumulativeScore += windowScore;
        teamScores[teamId].push({ window, score: cumulativeScore });
      }
    }

    // Find top 10 teams by latest score
    const latestScores = Object.entries(teamScores).map(([teamId, arr]) => ({
      teamId,
      score: arr.length ? arr[arr.length - 1].score : 0,
    }));
    const top10 = latestScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((t) => t.teamId);

    // Only keep top 10 teams' score history
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

      {/* Line Chart for Top 10 Teams */}
      <div className="mb-2 w-full overflow-x-auto">
        <LineChart data={scoreHistory} currentTheme={currentTheme} />
      </div>

      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${currentTheme.textPrimary} mb-2`}>Leaderboard</h2>
        <p className={currentTheme.textSecondary}>Current team standings</p>
      </div>

      {/* Leaderboard Table */}
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

      {/* Scoring Legend */}
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

function LineChart({ data, currentTheme }) {
  // Prepare columns: ['Window', 'Team 1', 'Team 2', ...]
  const teamNames = data.map((team) => team.teamName);
  const columns = ['Window', ...teamNames];

  // Gather all windows
  const allWindows = Array.from(new Set(data.flatMap((d) => d.values.map((v) => v.window)))).sort(
    (a, b) => a - b
  );

  // Prepare rows: [window, team1score, team2score, ...]
  const rows = allWindows.map((window) => {
    const row = [window];
    data.forEach((team) => {
      const found = team.values.find((v) => v.window === window);
      row.push(found ? found.score : null);
    });
    return row;
  });

  // Chart data
  const chartData = [columns, ...rows];

  // Chart options with proper theming
  const options = {
    curveType: 'function',
    legend: {
      position: 'top',
      alignment: 'center',
      textStyle: {
        color: currentTheme.textPrimary === 'text-white' ? '#ffffff' : '#111827',
        fontSize: 15,
      },
    },
    chartArea: { left: 60, top: 60, width: '100%', height: '70%' },
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
        const arr = [];
        for (let i = 0; i <= maxScore + 1; i += 5000) arr.push(i);
        return arr;
      })(),
      titleTextStyle: {
        color: currentTheme.textSecondary === 'text-gray-400' ? '#9ca3af' : '#6b7280',
      },
      textStyle: { color: currentTheme.textSecondary === 'text-gray-400' ? '#9ca3af' : '#6b7280' },
      baselineColor: currentTheme.textSecondary === 'text-gray-400' ? '#4b5563' : '#9ca3af',
    },
    series: data.reduce((acc, team, idx) => {
      acc[idx] = { color: team.color };
      return acc;
    }, {}),
    backgroundColor: 'transparent',
    fontName: 'inherit',
    titleTextStyle: {
      color: currentTheme.textPrimary === 'text-white' ? '#ffffff' : '#111827',
      fontSize: 20,
    },
  };

  return (
    <div className="min-w-screen h-[520px] w-full">
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
