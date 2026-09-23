// Pure functions only — no DB/network calls, so these are easy to unit test in isolation.

import type { Partner, Title } from "../types";

export interface SwipeRecord {
  partner: Partner;
  tmdbId: number;
  direction: "left" | "right";
  createdAt: string; // ISO timestamp
}

/**
 * Given each partner's swipes for a single round, find the mutual right-swipe
 * that was confirmed earliest (i.e. minimize the time at which BOTH partners
 * had right-swiped that title — the max of the two individual swipe times).
 * Returns the tmdbId of that title, or null if there's no mutual right-swipe.
 */
export function findMutualMatch(swipesA: SwipeRecord[], swipesB: SwipeRecord[]): number | null {
  const rightA = new Map<number, number>();
  for (const s of swipesA) {
    if (s.direction === "right") rightA.set(s.tmdbId, new Date(s.createdAt).getTime());
  }

  let best: { tmdbId: number; confirmedAt: number } | null = null;
  for (const s of swipesB) {
    if (s.direction !== "right") continue;
    const tA = rightA.get(s.tmdbId);
    if (tA === undefined) continue;
    const tB = new Date(s.createdAt).getTime();
    const confirmedAt = Math.max(tA, tB);
    if (best === null || confirmedAt < best.confirmedAt) {
      best = { tmdbId: s.tmdbId, confirmedAt };
    }
  }

  return best ? best.tmdbId : null;
}

/**
 * combinedScore = how many of the two partners (0, 1, or 2) right-swiped a title,
 * counted across every swipe record passed in (typically both rounds' swipes).
 * `titles` should be the deduped set of titles those swipes could reference
 * (e.g. round 1 + round 2 pools combined). Sorted by combinedScore desc, then
 * by rating desc, sliced to the top 5.
 */
export function computeTopFive(
  allSwipesAcrossRounds: SwipeRecord[],
  titles: Title[]
): (Title & { combinedScore: number })[] {
  const partnersByTitle = new Map<number, Set<Partner>>();
  for (const s of allSwipesAcrossRounds) {
    if (s.direction !== "right") continue;
    if (!partnersByTitle.has(s.tmdbId)) partnersByTitle.set(s.tmdbId, new Set());
    partnersByTitle.get(s.tmdbId)!.add(s.partner);
  }

  const scored = titles.map((t) => ({
    ...t,
    combinedScore: partnersByTitle.get(t.tmdbId)?.size ?? 0,
  }));

  scored.sort((a, b) => b.combinedScore - a.combinedScore || b.rating - a.rating);

  return scored.slice(0, 5);
}
