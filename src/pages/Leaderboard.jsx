import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEffect, useState } from 'react';

export default function Leaderboard({ theme, currentTheme }) {
  const [teams, setTeams] = useState(null);
  const [status, setStatus] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API call
    // fetch('/status')
    //   .then(response => response.json())
    //   .then(data => {
    //     setTeams(data.teams);
    //     setStatus(data.status);
    //   })
    //   .catch(error => console.error('Error fetching status:', error));

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
  }, []);

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
        <h2 className={`text-2xl font-bold ${currentTheme.textPrimary} mb-2`}>Leaderboard</h2>
        <p className={currentTheme.textSecondary}>Current team standings and performance metrics</p>
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
