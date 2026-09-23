import { discoverCandidates, fetchExternalIds } from "@/lib/tmdb";
import { getTitleDetails, sleep, RAPIDAPI_PACING_MS } from "@/lib/rapidapi";
import { generateBrief, rankCandidates, refineBriefForRound2 } from "@/lib/gemini";
import { POOL_SIZE } from "@/lib/env";
import type { CandidateTitle, PooledTitle, Preferences, SearchBrief } from "@/lib/types";

export interface TitleSummary {
  title: string;
  overview: string;
  genre_ids: number[];
}

export interface PoolResult {
  brief: SearchBrief;
  pool: PooledTitle[];
}

export async function buildPoolRound1(prefsA: Preferences, prefsB: Preferences): Promise<PoolResult> {
  const brief = await generateBrief(prefsA, prefsB);
  const candidates = await discoverCandidates(brief);
  const ranked = await rankCandidates(brief, prefsA.moodText, prefsB.moodText, candidates);
  const pool = await enrichToPool(ranked, brief.min_vote_average);
  return { brief, pool };
}

export async function buildPoolRound2(
  originalBrief: SearchBrief,
  prefsA: Preferences,
  prefsB: Preferences,
  likedA: TitleSummary[],
  likedB: TitleSummary[],
  excludeKeys: Set<string>
): Promise<PoolResult> {
  const brief = await refineBriefForRound2(originalBrief, likedA, likedB, prefsA.moodText, prefsB.moodText);
  const candidates = await discoverCandidates(brief, excludeKeys);
  const ranked = await rankCandidates(brief, prefsA.moodText, prefsB.moodText, candidates);
  const pool = await enrichToPool(ranked, brief.min_vote_average);
  return { brief, pool };
}

/**
 * Resolves imdb_id (parallel, cheap TMDB calls), then enriches with real
 * IMDb rating + India OTT links via RapidAPI — paced sequentially (~1.1s
 * apart) per its rate limit — stopping once POOL_SIZE titles survive the
 * real rating floor, so we don't over-spend RapidAPI budget.
 */
async function enrichToPool(ranked: CandidateTitle[], minVoteAverage: number): Promise<PooledTitle[]> {
  const withExternalIds = await Promise.all(
    ranked.map(async (c) => ({
      candidate: c,
      external: await fetchExternalIds(c.media_type, c.tmdb_id),
    }))
  );

  const survivors: PooledTitle[] = [];
  let calledRapidApiOnce = false;

  for (const { candidate, external } of withExternalIds) {
    if (survivors.length >= POOL_SIZE) break;
    if (!external.imdb_id) continue;

    if (calledRapidApiOnce) await sleep(RAPIDAPI_PACING_MS);
    calledRapidApiOnce = true;

    const details = await getTitleDetails(external.imdb_id);
    if (!details || details.imdbRating === null) continue;
    if (details.imdbRating < minVoteAverage) continue;

    survivors.push({
      tmdb_id: candidate.tmdb_id,
      imdb_id: external.imdb_id,
      media_type: candidate.media_type,
      title: candidate.title,
      year: candidate.year,
      poster_path: candidate.poster_path,
      imdb_rating: details.imdbRating,
      runtime: details.runtime ?? external.runtime,
      overview: candidate.overview,
      genres: candidate.genres,
    });
  }

  return survivors;
}
