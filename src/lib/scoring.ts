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
  /** Fraction of probes during the window where the service was responsive (0..1). */
  uptime: number;
  /** Patch quality flag from the checker (0..1). */
  patch_q: number;
  /** Whether the binary still attests as the original service (0/1). */
  attest: number;
  /**
   * Fraction of real users still served after the patch (0..1). Lower means
   * the patch is breaking legitimate functionality — players use this to
   * tell whether their patch is actually working.
   */
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

/* ──────────────────────────────────────────────────────────────────────────
 * Service health — exposes `uptime` and `patch_score` so players can see
 * whether their patch is actually working. Per jarjarbinks: lower
 * `patch_score` = more real users not being served by the patched binary.
 * ──────────────────────────────────────────────────────────────────────── */

export interface ServiceHealthBreakdown {
  service: string;
  /** 1 if the checker marked the service operational this window. */
  on: number;
  /** Fraction of probes that succeeded (0..1). */
  uptime: number;
  /** Raw `patch_score` from the API (0..1). */
  patchScore: number;
  /** 1 if a patch attempt was detected for this service this window. */
  patched: 0 | 1;
  /** Composite `uptime * effectivePatchScore` (0..1). */
  health: number;
}

export interface TeamHealthSnapshot {
  /** Aggregate "HP" — average of per-service health (0..1). */
  health: number;
  services: ServiceHealthBreakdown[];
}

const EMPTY_SNAPSHOT: TeamHealthSnapshot = { health: 0, services: [] };

/**
 * "HP" for a single team in a single window. Per service:
 *
 *   health = uptime * (patch_q ? patch_score : 1)
 *
 * The `patch_q` gate matters: the API reports `patch_score = 0` both for
 * "I broke my patch" *and* "I haven't patched yet" — those are very
 * different situations from a user's point of view. An unpatched (vanilla)
 * service is still serving real users perfectly fine; it's only a *broken
 * patch* that locks users out. The HP bar is a compass for "is my patch
 * breaking my service" — the gameplay penalty for not patching at all is
 * already paid in stolen flags elsewhere.
 *
 * Team HP is the mean of per-service health across services in the window.
 */
export function computeTeamHealth(
  status: StatusData,
  teamId: string,
  window: number | null
): TeamHealthSnapshot {
  if (window === null) return EMPTY_SNAPSHOT;
  const tick = status[teamId]?.[window];
  if (!tick) return EMPTY_SNAPSHOT;

  const services: ServiceHealthBreakdown[] = Object.keys(tick).map((name) => {
    const s = tick[name];
    const patched: 0 | 1 = s.patch_q > 0 ? 1 : 0;
    const effectivePatchScore = patched ? s.patch_score : 1;
    return {
      service: name,
      on: s.on,
      uptime: s.uptime,
      patchScore: s.patch_score,
      patched,
      health: s.uptime * effectivePatchScore,
    };
  });

  const health = services.length
    ? services.reduce((acc, s) => acc + s.health, 0) / services.length
    : 0;

  return { health, services };
}

/**
 * Convenience: snapshot every team's health for one window. Returned as a
 * flat record keyed by teamId so the graph effect can look up by node id
 * without re-scanning.
 */
export function computeAllTeamsHealth(
  status: StatusData,
  window: number | null
): Record<string, TeamHealthSnapshot> {
  const out: Record<string, TeamHealthSnapshot> = {};
  if (window === null) return out;
  for (const teamId of Object.keys(status)) {
    out[teamId] = computeTeamHealth(status, teamId, window);
  }
  return out;
}
