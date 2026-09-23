import { GoogleGenAI } from "@google/genai";
import { env, hasGemini, RANK_CANDIDATES } from "@/lib/env";
import { eraToYearRange, moodsToGenres } from "@/lib/genreMap";
import type { CandidateTitle, Preferences, SearchBrief } from "@/lib/types";

const MODEL = "gemini-flash-latest";

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  return client;
}

const SEARCH_BRIEF_TYPE = `
type SearchBrief = {
  summary: string; // one or two sentences describing what to look for tonight
  tmdb_genres: number[]; // TMDB genre ids to include
  exclude_genres: number[]; // TMDB genre ids to avoid
  original_languages: string[]; // ISO 639-1 codes, e.g. ["hi","en"]. Empty = any language.
  min_vote_average: number; // 0-10
  year_gte: number;
  year_lte: number;
  include_series: boolean;
  mood_keywords: string[]; // short free-text mood/tone descriptors
};
`.trim();

async function generateJson<T>(prompt: string): Promise<T | null> {
  try {
    const res = await getClient().models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });
    const text = res.text;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("Gemini call failed, falling back to heuristic:", err);
    return null;
  }
}

function mergeLanguages(a: Preferences, b: Preferences): string[] {
  const aAny = a.languages.includes("any") || a.languages.length === 0;
  const bAny = b.languages.includes("any") || b.languages.length === 0;
  if (aAny || bAny) return [];
  const set = new Set<string>([...a.languages, ...b.languages]);
  return Array.from(set);
}

function heuristicBrief(a: Preferences, b: Preferences): SearchBrief {
  const includeSeries = a.contentType === "series" || b.contentType === "series";
  const genreSet = new Set<number>([
    ...moodsToGenres(a.moods, "movie"),
    ...moodsToGenres(b.moods, "movie"),
  ]);
  const eraA = eraToYearRange(a.eras);
  const eraB = eraToYearRange(b.eras);
  return {
    summary: `A mix of ${[...a.moods, ...b.moods].join(", ") || "well-rated"} titles both partners will enjoy tonight.`,
    tmdb_genres: Array.from(genreSet),
    exclude_genres: [],
    original_languages: mergeLanguages(a, b),
    min_vote_average: Math.max(a.minRating, b.minRating),
    year_gte: Math.min(eraA.gte, eraB.gte),
    year_lte: Math.max(eraA.lte, eraB.lte),
    include_series: includeSeries,
    mood_keywords: [a.moodText, b.moodText].filter(Boolean),
  };
}

export async function generateBrief(a: Preferences, b: Preferences): Promise<SearchBrief> {
  if (!hasGemini) return heuristicBrief(a, b);

  const prompt = `You are helping a couple decide what movie or TV show to watch tonight. Merge both partners' preferences into a single JSON search brief matching this exact TypeScript type:

${SEARCH_BRIEF_TYPE}

Partner A's structured preferences: ${JSON.stringify(a)}
Partner B's structured preferences: ${JSON.stringify(b)}

Use real TMDB genre ids (movie genre id set: Action 28, Adventure 12, Animation 16, Comedy 35, Crime 80, Documentary 99, Drama 18, Family 10751, Fantasy 14, History 36, Horror 27, Music 10402, Mystery 9648, Romance 10749, Science Fiction 878, Thriller 53, War 10752, Western 37).
The brief must satisfy BOTH partners — prefer genres/moods present in both, and take the higher (stricter) of the two minimum ratings. Pay close attention to each partner's free-text mood description for nuance beyond the structured chips. Respond with ONLY the JSON object, no markdown.`;

  const result = await generateJson<SearchBrief>(prompt);
  if (!result) return heuristicBrief(a, b);
  return {
    ...result,
    tmdb_genres: result.tmdb_genres ?? [],
    exclude_genres: result.exclude_genres ?? [],
    original_languages: result.original_languages ?? [],
    mood_keywords: result.mood_keywords ?? [],
  };
}

interface RankedIdsResponse {
  ordered_tmdb_ids: number[];
}

export async function rankCandidates(
  brief: SearchBrief,
  moodTextA: string,
  moodTextB: string,
  candidates: CandidateTitle[]
): Promise<CandidateTitle[]> {
  if (candidates.length <= RANK_CANDIDATES) return candidates;
  if (!hasGemini) return candidates.slice(0, RANK_CANDIDATES);

  const slim = candidates.map((c) => ({
    tmdb_id: c.tmdb_id,
    title: c.title,
    overview: (c.overview || "").slice(0, 200),
    genre_ids: c.genres,
  }));

  const prompt = `Pick and order the best ${RANK_CANDIDATES} titles from this candidate list for a couple's movie night, based on mood fit.

Search brief summary: ${brief.summary}
Mood keywords: ${brief.mood_keywords.join(", ")}
Partner A's own words about tonight's mood: "${moodTextA || "(none given)"}"
Partner B's own words about tonight's mood: "${moodTextB || "(none given)"}"

Candidates (JSON array of {tmdb_id, title, overview, genre_ids}):
${JSON.stringify(slim)}

Respond with ONLY JSON matching: { "ordered_tmdb_ids": number[] } — the best ${RANK_CANDIDATES} tmdb_id values from the candidates above, best mood fit first. Do not invent ids not in the list.`;

  const result = await generateJson<RankedIdsResponse>(prompt);
  if (!result?.ordered_tmdb_ids?.length) return candidates.slice(0, RANK_CANDIDATES);

  const byId = new Map(candidates.map((c) => [c.tmdb_id, c]));
  const ranked: CandidateTitle[] = [];
  for (const id of result.ordered_tmdb_ids) {
    const c = byId.get(id);
    if (c) ranked.push(c);
  }
  for (const c of candidates) {
    if (ranked.length >= RANK_CANDIDATES) break;
    if (!ranked.includes(c)) ranked.push(c);
  }
  return ranked.slice(0, RANK_CANDIDATES);
}

interface LikedSummary {
  title: string;
  overview: string;
  genre_ids: number[];
}

function heuristicRefine(original: SearchBrief, liked: LikedSummary[]): SearchBrief {
  if (liked.length === 0) return original;
  const freq = new Map<number, number>();
  for (const t of liked) {
    for (const g of t.genre_ids) freq.set(g, (freq.get(g) ?? 0) + 1);
  }
  const topGenres = Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => g);
  return {
    ...original,
    tmdb_genres: topGenres.length ? topGenres : original.tmdb_genres,
    summary: `Round 2: leaning into what you both liked (${liked.map((t) => t.title).slice(0, 5).join(", ")}).`,
  };
}

export async function refineBriefForRound2(
  original: SearchBrief,
  likedA: LikedSummary[],
  likedB: LikedSummary[],
  moodTextA: string,
  moodTextB: string
): Promise<SearchBrief> {
  const liked = [...likedA, ...likedB];
  if (!hasGemini) return heuristicRefine(original, liked);

  const prompt = `A couple swiped through a first round of movie/TV suggestions and didn't match. Refine the search brief for round 2 based on what each partner actually swiped right on, so round 2 leans into overlap while staying broad enough to surface new titles.

Original brief: ${JSON.stringify(original)}
Partner A's mood notes: "${moodTextA || "(none)"}"
Partner B's mood notes: "${moodTextB || "(none)"}"
Titles Partner A liked (right-swiped): ${JSON.stringify(likedA)}
Titles Partner B liked (right-swiped): ${JSON.stringify(likedB)}

Respond with ONLY a JSON object matching this exact TypeScript type:
${SEARCH_BRIEF_TYPE}`;

  const result = await generateJson<SearchBrief>(prompt);
  if (!result) return heuristicRefine(original, liked);
  return {
    ...original,
    ...result,
    tmdb_genres: result.tmdb_genres ?? original.tmdb_genres,
    exclude_genres: result.exclude_genres ?? original.exclude_genres,
    original_languages: result.original_languages ?? original.original_languages,
    mood_keywords: result.mood_keywords ?? original.mood_keywords,
  };
}
