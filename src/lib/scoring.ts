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
 * The backend exposes the data through two endpoints:
 *   /status/latest.json          — the most recent window + global stats block
 *   /status/score{N+1:03d}.json  — a specific window (URL counts from 1)
 *
 * Both payloads share the same shape (see `ScorePayload`):
 *   • `status` is keyed by team → window → service, but only contains a
 *     single window's data — enough to drive the live attack ring and the
 *     per-window inspector tooltip.
 *   • `stats.aggregate[teamId][windowKey]` is the team's *per-window score
 *     delta* — the points earned (or lost) in that single window, computed
 *     server-side. Every cumulative display the UI shows (leaderboard,
 *     line chart, graph labels) sums these deltas across windows ≤ N
 *     rather than re-walking the full attack data.
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
  uptime: number;
  patch_q: number;
  attest: number;
}
export type ServiceStatus = Record<string, ServiceTick>;
export type TimeWindowStatus = Record<string, ServiceStatus>;
export type StatusData = Record<string, TimeWindowStatus>;
export type TeamData = Record<string, string>;

/**
 * The `stats` block in every /status/*.json payload. `aggregate` is a
 * sparse-looking map (`window` is stringified) but in practice every team
 * has an entry for every window from 0 up to `stats.window`.
 */
export interface StatsBlock {
  window: number;
  aggregate: Record<string, Record<string, number>>;
  flags_lost: Record<string, number>;
  flags_won: Record<string, number>;
}

export interface ScorePayload {
  teams: TeamData;
  status: StatusData;
  stats: StatsBlock;
}

export interface TeamScoreRow {
  teamId: string;
  teamName: string;
  score: number;
  attacks: number;
  flagsLost: number;
  rank: number;
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
 * Build the URL path for a specific window. The backend names files with a
 * 1-based, 3-digit index, so window 0 → `score001.json`, window 48 →
 * `score049.json`. Caller is expected to prefix `/status/`.
 */
export function scoreFileName(window: number): string {
  return `score${String(window + 1).padStart(3, '0')}.json`;
}

/**
 * Sorted list of every time window present in `stats.aggregate`. Different
 * teams may have started scoring at different windows, so we union the keys
 * across teams rather than trusting any single one.
 */
export function availableWindows(stats: StatsBlock): number[] {
  const all = new Set<number>();
  for (const teamId of Object.keys(stats.aggregate)) {
    for (const w of Object.keys(stats.aggregate[teamId])) {
      all.add(parseInt(w, 10));
    }
  }
  return Array.from(all).sort((a, b) => a - b);
}

/**
 * Cumulative score per team at the end of `window` — i.e. the sum of every
 * `stats.aggregate[teamId][w]` delta for `w <= window`. This is what the
 * graph node labels and the leaderboard rank by.
 */
export function scoresAtWindow(stats: StatsBlock, window: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const teamId of Object.keys(stats.aggregate)) {
    const teamMap = stats.aggregate[teamId];
    let sum = 0;
    for (const wStr of Object.keys(teamMap)) {
      const w = parseInt(wStr, 10);
      if (w <= window) sum += teamMap[wStr];
    }
    out[teamId] = sum;
  }
  return out;
}

/**
 * Leaderboard rows derived from the pre-computed stats block. Score and
 * attack/loss tallies come straight from the server — no scan required.
 */
export function rankFromStats(teams: TeamData, stats: StatsBlock): TeamScoreRow[] {
  const scores = scoresAtWindow(stats, stats.window);
  return Object.keys(scores)
    .map((teamId) => ({
      teamId,
      teamName: teams[teamId] ?? teamId,
      score: scores[teamId],
      attacks: stats.flags_won[teamId] ?? 0,
      flagsLost: stats.flags_lost[teamId] ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .map((row, i) => ({ ...row, rank: i + 1 }));
}

export type SeriesMode = 'cumulative' | 'perWindow';

/**
 * Per-team score series, one point per window in `stats.aggregate`.
 *   • `cumulative` — running sum of per-window deltas through that window
 *     (what the leaderboard ranks by).
 *   • `perWindow`  — the raw delta for that window alone (positive when a
 *     team had a good window, negative when defense broke down).
 * Windows are returned in ascending order.
 */
export function seriesFromAggregate(
  teams: TeamData,
  stats: StatsBlock,
  mode: SeriesMode = 'cumulative'
): TeamSeries[] {
  const windows = availableWindows(stats);
  return Object.keys(stats.aggregate).map((teamId) => {
    const teamMap = stats.aggregate[teamId];
    let cum = 0;
    const values: ScorePoint[] = windows.map((w) => {
      const delta = teamMap[w.toString()] ?? 0;
      cum += delta;
      return { window: w, score: mode === 'cumulative' ? cum : delta };
    });
    return {
      teamId,
      teamName: teams[teamId] ?? teamId,
      values,
    };
  });
}

export interface ServiceWindowStats {
  uptime: number;
  patchScore: number;
  attacksLaunched: number;
  timesCompromised: number;
  attackers: string[];
  victims: string[];
  operationalPoints: number;
  attackPoints: number;
  compromisedPoints: number;
  subtotal: number;
}

export interface TeamWindowStats {
  services: Record<string, ServiceWindowStats>;
  totals: {
    operationalPoints: number;
    attackPoints: number;
    compromisedPoints: number;
    windowDelta: number;
    attacksLaunched: number;
    timesCompromised: number;
    servicesUp: number;
    servicesFullyPatched: number;
    totalServices: number;
  };
}

/**
 * Per-team breakdown of what happened in a single time window: health of
 * each service (uptime, patch_score), how many flags it captured, how many
 * times it was hit, and how all of that decomposes into points. Powers the
 * outer service-status ring + hover tooltip in the live graph.
 *
 * Works on a single-window `StatusData` slice (as returned by both
 * /status/latest.json and /status/score{XYZ}.json).
 */
export function computeWindowStats(
  status: StatusData,
  window: number
): Record<string, TeamWindowStats> {
  const stats: Record<string, TeamWindowStats> = {};

  for (const teamId of Object.keys(status)) {
    const tick = status[teamId][window] || {};
    const services: Record<string, ServiceWindowStats> = {};
    for (const svc of Object.keys(tick)) {
      const s = tick[svc];
      const uptime = typeof s.on === 'number' ? s.on : s.on ? 1 : 0;
      const attacksLaunched = s.teams_hit.length;
      const operationalPoints = s.on ? Math.round(POINTS.operational * s.patch_score) : 0;
      services[svc] = {
        uptime,
        patchScore: s.patch_score,
        attacksLaunched,
        timesCompromised: 0,
        attackers: [],
        victims: s.teams_hit.map(String),
        operationalPoints,
        attackPoints: attacksLaunched * POINTS.attack,
        compromisedPoints: 0,
        subtotal: 0,
      };
    }
    stats[teamId] = {
      services,
      totals: {
        operationalPoints: 0,
        attackPoints: 0,
        compromisedPoints: 0,
        windowDelta: 0,
        attacksLaunched: 0,
        timesCompromised: 0,
        servicesUp: 0,
        servicesFullyPatched: 0,
        totalServices: 0,
      },
    };
  }

  // Second pass: attribute compromises to victims.
  for (const teamId of Object.keys(status)) {
    const tick = status[teamId][window] || {};
    for (const svc of Object.keys(tick)) {
      for (const victimId of tick[svc].teams_hit) {
        const v = victimId.toString();
        const victim = stats[v]?.services[svc];
        if (!victim) continue;
        victim.timesCompromised += 1;
        victim.attackers.push(teamId);
      }
    }
  }

  // Third pass: subtotals + team totals.
  for (const teamId of Object.keys(stats)) {
    const t = stats[teamId];
    for (const svc of Object.keys(t.services)) {
      const sv = t.services[svc];
      sv.compromisedPoints = sv.timesCompromised * POINTS.compromised;
      sv.subtotal = sv.operationalPoints + sv.attackPoints + sv.compromisedPoints;
      t.totals.operationalPoints += sv.operationalPoints;
      t.totals.attackPoints += sv.attackPoints;
      t.totals.compromisedPoints += sv.compromisedPoints;
      t.totals.attacksLaunched += sv.attacksLaunched;
      t.totals.timesCompromised += sv.timesCompromised;
      if (sv.uptime >= 0.5) t.totals.servicesUp += 1;
      if (sv.patchScore >= 0.99) t.totals.servicesFullyPatched += 1;
      t.totals.totalServices += 1;
    }
    t.totals.windowDelta =
      t.totals.operationalPoints + t.totals.attackPoints + t.totals.compromisedPoints;
  }

  return stats;
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
