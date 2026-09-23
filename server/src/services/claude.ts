import Anthropic from "@anthropic-ai/sdk";
import type { Brief, ProfileRecord } from "../types";

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";

const client = apiKey ? new Anthropic({ apiKey }) : null;

// Boot-time warning is printed once from src/index.ts. This module stays silent
// on the "no key configured" path so we don't spam the log on every call.

const MOOD_TO_GENRE: Record<string, string[]> = {
  light_fun: ["Comedy", "Family", "Animation"],
  intense_gripping: ["Thriller", "Drama", "Crime"],
  scary: ["Horror", "Mystery"],
  romantic: ["Romance"],
  other: [],
};

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

/** Deterministic brief built directly from structured fields — used whenever
 * ANTHROPIC_API_KEY is unset, or whenever the Claude call/parse fails. */
function deterministicBrief(profileA: ProfileRecord, profileB: ProfileRecord): Brief {
  const genreHints = dedupe([
    ...profileA.moods.flatMap((m) => MOOD_TO_GENRE[m] || []),
    ...profileB.moods.flatMap((m) => MOOD_TO_GENRE[m] || []),
  ]);

  const languagePriority = dedupe([...profileA.languages, ...profileB.languages]);

  const toneNotes = dedupe([profileA.moodText, profileB.moodText])
    .filter((t) => t.trim().length > 0)
    .join(" | ");

  return { genreHints, keywordHints: [], toneNotes, languagePriority };
}

function extractJson(text: string): unknown | null {
  // Strip ```json ... ``` fences if present, then find the first {...} block.
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  const jsonText = braceMatch ? braceMatch[0] : candidate;
  try {
    return JSON.parse(jsonText.trim());
  } catch {
    return null;
  }
}

function isBrief(value: unknown): value is Brief {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    Array.isArray(v.genreHints) &&
    Array.isArray(v.keywordHints) &&
    typeof v.toneNotes === "string" &&
    Array.isArray(v.languagePriority)
  );
}

function normalizeBrief(value: unknown): Brief | null {
  if (!isBrief(value)) return null;
  return {
    genreHints: value.genreHints.filter((x): x is string => typeof x === "string"),
    keywordHints: value.keywordHints.filter((x): x is string => typeof x === "string"),
    toneNotes: value.toneNotes,
    languagePriority: value.languagePriority.filter((x): x is string => typeof x === "string"),
  };
}

async function askClaudeForJson(prompt: string): Promise<unknown | null> {
  if (!client) return null;
  const message = await client.messages.create({
    model,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  return extractJson(text);
}

/**
 * Turns both partners' structured preferences + free-text mood nuance into a
 * small structured brief the TMDB service can consume. Falls back to a
 * deterministic brief (built from structured fields only) if the API key is
 * unset, the call errors, or the response can't be parsed as the expected shape.
 */
export async function generateBrief(profileA: ProfileRecord, profileB: ProfileRecord): Promise<Brief> {
  const fallback = deterministicBrief(profileA, profileB);
  if (!client) return fallback;

  const prompt = `You are helping plan a movie/TV search for two partners who will both swipe on the same shortlist.
Read their structured preferences AND their free-text mood descriptions together, then respond with ONLY a JSON object
(no prose, no markdown fences) of this exact shape:
{
  "genreHints": string[],      // TMDB-style genre names (e.g. "Comedy", "Thriller", "Romance") likely to satisfy both
  "keywordHints": string[],    // short free-text keywords/themes capturing nuance the structured fields miss
  "toneNotes": string,         // 1-2 sentences summarizing the tone/vibe both partners want
  "languagePriority": string[] // ordered list of languages to prefer, from their selections
}

Partner A:
${JSON.stringify(profileA, null, 2)}

Partner B:
${JSON.stringify(profileB, null, 2)}

Respond with ONLY the JSON object.`;

  try {
    const parsed = await askClaudeForJson(prompt);
    return normalizeBrief(parsed) ?? fallback;
  } catch (err) {
    console.error("[claude] generateBrief failed, using deterministic fallback:", err);
    return fallback;
  }
}

/**
 * Refines an existing brief for round 2, leaning into what both partners
 * actually right-swiped in round 1. Falls back to the original brief
 * (lightly augmented with right-swiped title names as keyword hints) if the
 * API key is unset, the call errors, or parsing fails.
 */
export async function refineBrief(
  brief: Brief,
  rightSwipedTitlesA: string[],
  rightSwipedTitlesB: string[]
): Promise<Brief> {
  const fallback: Brief = {
    ...brief,
    keywordHints: dedupe([...brief.keywordHints, ...rightSwipedTitlesA, ...rightSwipedTitlesB]).slice(0, 10),
  };
  if (!client) return fallback;

  const prompt = `Two partners just swiped on a shortlist of movies/TV shows and didn't find a mutual match yet.
Here is the original search brief, and the titles each partner right-swiped (liked). Refine the brief to lean into
what they actually liked, so a second, more targeted round can be generated. Respond with ONLY a JSON object of this
exact shape (no prose, no markdown fences):
{
  "genreHints": string[],
  "keywordHints": string[],
  "toneNotes": string,
  "languagePriority": string[]
}

Original brief:
${JSON.stringify(brief, null, 2)}

Partner A right-swiped:
${JSON.stringify(rightSwipedTitlesA, null, 2)}

Partner B right-swiped:
${JSON.stringify(rightSwipedTitlesB, null, 2)}

Respond with ONLY the JSON object.`;

  try {
    const parsed = await askClaudeForJson(prompt);
    return normalizeBrief(parsed) ?? fallback;
  } catch (err) {
    console.error("[claude] refineBrief failed, using deterministic fallback:", err);
    return fallback;
  }
}

export function isClaudeConfigured(): boolean {
  return client !== null;
}
