// Round pool generation — shared by routes/profile.ts (round 1, fire-and-forget
// after both profiles are in) and routes/swipe.ts (round 2, once round 1 ends
// with no mutual match).

import { supabase } from "../services/supabase";
import * as claude from "../services/claude";
import * as tmdb from "../services/tmdb";
import { getProfiles, getPool, getSwipesForRound, type ProfileRow } from "./db";
import type { ProfileRecord } from "../types";

function toProfileRecord(row: ProfileRow): ProfileRecord {
  return {
    moods: row.moods,
    moodText: row.mood_text,
    languages: row.languages,
    contentType: row.content_type,
    minRating: row.min_rating,
    eras: row.eras,
  };
}

/**
 * Round 1: called (fire-and-forget) once both partners' profiles exist.
 * Session status is already 'generating' by the time this runs (set
 * synchronously in routes/profile.ts before responding to the client).
 */
export async function generateRound1Pool(sessionId: string): Promise<void> {
  try {
    const profiles = await getProfiles(sessionId);
    if (!profiles.A || !profiles.B) {
      throw new Error("generateRound1Pool called before both profiles exist");
    }
    const profileA = toProfileRecord(profiles.A);
    const profileB = toProfileRecord(profiles.B);

    const brief = await claude.generateBrief(profileA, profileB);
    const titles = await tmdb.discoverTitles(profileA, profileB, brief, { targetCount: 30 });

    const { error: poolError } = await supabase
      .from("pools")
      .insert({ session_id: sessionId, round: 1, titles });
    if (poolError) throw poolError;

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ status: "swiping", round: 1 })
      .eq("id", sessionId);
    if (sessionError) throw sessionError;
  } catch (err) {
    console.error(`[poolGeneration] round 1 failed for session ${sessionId}:`, err);
    // The 'generating' status has no dead-end recovery of its own in the fixed
    // status enum, so we revert to 'collecting' — a state the client already
    // knows how to handle (and resubmitting a profile via POST /profile will
    // retry generation once both are in again).
    await supabase.from("sessions").update({ status: "collecting" }).eq("id", sessionId);
  }
}

/**
 * Round 2: called synchronously from routes/swipe.ts once round 1 completes
 * for both partners with no mutual match. Recomputes the brief from scratch
 * (the schema has no column to persist it) then refines it with what each
 * partner actually right-swiped in round 1.
 */
export async function generateRound2Pool(sessionId: string): Promise<void> {
  try {
    const profiles = await getProfiles(sessionId);
    if (!profiles.A || !profiles.B) {
      throw new Error("generateRound2Pool called without both profiles");
    }
    const profileA = toProfileRecord(profiles.A);
    const profileB = toProfileRecord(profiles.B);

    const round1Pool = await getPool(sessionId, 1);
    const round1Titles = round1Pool?.titles ?? [];
    const round1Swipes = await getSwipesForRound(sessionId, 1);

    const titleNameById = new Map(round1Titles.map((t) => [t.tmdbId, t.title]));
    const rightSwipedTitlesA = round1Swipes
      .filter((s) => s.partner === "A" && s.direction === "right")
      .map((s) => titleNameById.get(s.tmdbId))
      .filter((t): t is string => Boolean(t));
    const rightSwipedTitlesB = round1Swipes
      .filter((s) => s.partner === "B" && s.direction === "right")
      .map((s) => titleNameById.get(s.tmdbId))
      .filter((t): t is string => Boolean(t));

    const baseBrief = await claude.generateBrief(profileA, profileB);
    const refined = await claude.refineBrief(baseBrief, rightSwipedTitlesA, rightSwipedTitlesB);

    const excludeTmdbIds = round1Titles.map((t) => t.tmdbId);
    const titles = await tmdb.discoverTitles(profileA, profileB, refined, { targetCount: 30, excludeTmdbIds });

    const { error: poolError } = await supabase
      .from("pools")
      .insert({ session_id: sessionId, round: 2, titles });
    if (poolError) throw poolError;

    const { error: sessionError } = await supabase
      .from("sessions")
      .update({ status: "swiping", round: 2 })
      .eq("id", sessionId);
    if (sessionError) throw sessionError;
  } catch (err) {
    console.error(`[poolGeneration] round 2 failed for session ${sessionId}:`, err);
    await supabase.from("sessions").update({ status: "collecting" }).eq("id", sessionId);
  }
}
