/**
 * Scoring rules (from src/content/rules.md):
 *   +round(42 * patch_score) per service that's operational in a time window
 *    +6 per flag captured (per `teams_hit` entry by this team in a window)
 *    -6 per flag lost  (per appearance of this team's id in another team's `teams_hit`)
 *
 * `patch_score` is a per-service, per-window multiplier in [0, 1] that scales
 * the operational reward — a fully unpatched service still earns the full 42,
 * a fully replaced service earns 0. The product is rounded to an integer so
 * cumulative totals stay integral.
 *
 * The scoring math used to be duplicated in AttackDefenseCTFGraph and
 * Leaderboard with subtly different shapes. This module is the single source
 * of truth — both pages call into it.
 */

export const POINTS = {
  operational: 42,
  attack: 6,
  compromised: -6,
} as const;

export interface ServiceTick {
  on: number;
  teams_hit: number[];
  patch_score: number;
}
export type ServiceStatus = Record<string, ServiceTick>;
export type TimeWindowStatus = Record<string, ServiceStatus>;
export type StatusData = Record<string, TimeWindowStatus>;
export type TeamData = Record<string, string>;

export interface TeamCounters {
  operational: number;
  attacks: number;
  compromised: number;
}

export interface TeamScoreRow extends TeamCounters {
  teamId: string;
  teamName: string;
  score: number;
}

export interface ScorePoint {
  window: number;
  score: number;
}

export interface TeamSeries {
  teamId: string;
  teamName: string;
  values: ScorePoint[];
}

/**
 * Cumulative score per team across every time window in `status`, optionally
 * truncated to windows `<= upToWindow`. Also returns per-team operational /
 * attack / compromised counters in one pass — both pages need them.
 */
export function computeCumulativeScores(
  status: StatusData,
  upToWindow?: number | null
): { scores: Record<string, number>; counters: Record<string, TeamCounters> } {
  const scores: Record<string, number> = {};
  const counters: Record<string, TeamCounters> = {};

  for (const teamId of Object.keys(status)) {
    scores[teamId] = 0;
    counters[teamId] = { operational: 0, attacks: 0, compromised: 0 };
  }

  for (const teamId of Object.keys(status)) {
    const teamWindows = status[teamId];
    for (const windowStr of Object.keys(teamWindows)) {
      const w = parseInt(windowStr, 10);
      if (upToWindow != null && w > upToWindow) continue;

      const tick = teamWindows[windowStr];
      for (const service of Object.keys(tick)) {
        const s = tick[service];
        if (s.on) {
          scores[teamId] += Math.round(POINTS.operational * s.patch_score);
          counters[teamId].operational += 1;
        }
        const hits = s.teams_hit.length;
        scores[teamId] += hits * POINTS.attack;
        counters[teamId].attacks += hits;

        for (const victimId of s.teams_hit) {
          const victimKey = victimId.toString();
          if (scores[victimKey] === undefined) continue;
          scores[victimKey] += POINTS.compromised;
          counters[victimKey].compromised += 1;
        }
      }
    }
  }

  return { scores, counters };
}

/**
 * Sort teams by cumulative score (desc) and tag each with a 1-based rank.
 */
export function rankTeams(status: StatusData, teams: TeamData): TeamScoreRow[] {
  const { scores, counters } = computeCumulativeScores(status);
  return Object.entries(scores)
    .map(([teamId, score]) => ({
      teamId,
      teamName: teams[teamId] ?? teamId,
      score,
      ...counters[teamId],
    }))
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }) as TeamScoreRow & { rank: number });
}

/**
 * Per-team cumulative-score series, one point per time window present in
 * `status`. Windows are returned in ascending order.
 */
export function computeScoreSeries(status: StatusData, teams: TeamData): TeamSeries[] {
  const allWindows = new Set<number>();
  for (const teamId of Object.keys(status)) {
    for (const w of Object.keys(status[teamId])) allWindows.add(parseInt(w, 10));
  }
  const sortedWindows = Array.from(allWindows).sort((a, b) => a - b);

  const teamIds = Object.keys(status);
  const series: Record<string, ScorePoint[]> = {};
  for (const teamId of teamIds) series[teamId] = [];

  for (const w of sortedWindows) {
    // Delta for window w only.
    const delta: Record<string, number> = {};
    for (const teamId of teamIds) delta[teamId] = 0;

    for (const teamId of teamIds) {
      const tick = status[teamId][w];
      if (!tick) continue;
      for (const service of Object.keys(tick)) {
        const s = tick[service];
        if (s.on) delta[teamId] += Math.round(POINTS.operational * s.patch_score);
        delta[teamId] += s.teams_hit.length * POINTS.attack;
        for (const victimId of s.teams_hit) {
          const victimKey = victimId.toString();
          if (delta[victimKey] !== undefined) delta[victimKey] += POINTS.compromised;
        }
      }
    }

    for (const teamId of teamIds) {
      const prev = series[teamId].length ? series[teamId][series[teamId].length - 1].score : 0;
      series[teamId].push({ window: w, score: prev + delta[teamId] });
    }
  }

  return teamIds.map((teamId) => ({
    teamId,
    teamName: teams[teamId] ?? teamId,
    values: series[teamId],
  }));
}

/**
 * Top-N teams by their final cumulative score, derived from a precomputed
 * series. Avoids re-running the full scan.
 */
export function topNSeries(series: TeamSeries[], n: number): TeamSeries[] {
  return [...series]
    .sort((a, b) => {
      const av = a.values.length ? a.values[a.values.length - 1].score : 0;
      const bv = b.values.length ? b.values[b.values.length - 1].score : 0;
      return bv - av;
    })
    .slice(0, n);
}
