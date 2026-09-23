// Runs after every swipe is recorded (fire-and-forget from routes/swipe.ts,
// same "don't make the client wait" pattern as round-1 pool generation) to
// check whether both partners have finished the round and, if so, advance
// the session: reveal a match, kick off round 2, or fall back to a top-5.

import { supabase } from "../services/supabase";
import { getIndianOttPlatforms } from "../services/rapidapi";
import { findMutualMatch } from "./matching";
import { getPool, getSwipesForRound } from "./db";
import { generateRound2Pool } from "./poolGeneration";

export async function checkRoundCompletionAndAdvance(sessionId: string, round: number): Promise<void> {
  const pool = await getPool(sessionId, round);
  if (!pool) return; // shouldn't happen — a swipe implies the pool existed

  const poolLength = pool.titles.length;
  const swipes = await getSwipesForRound(sessionId, round);
  const swipesA = swipes.filter((s) => s.partner === "A");
  const swipesB = swipes.filter((s) => s.partner === "B");

  const doneA = swipesA.length >= poolLength;
  const doneB = swipesB.length >= poolLength;
  if (!doneA || !doneB) return;

  // Compare-and-swap the session out of 'swiping' so that if both partners'
  // final swipes land at nearly the same moment, only one of these calls
  // proceeds past this point (the loser sees no row returned and bails).
  const { data: claimed, error: casError } = await supabase
    .from("sessions")
    .update({ status: "generating" })
    .eq("id", sessionId)
    .eq("status", "swiping")
    .eq("round", round)
    .select("id")
    .maybeSingle();
  if (casError) {
    console.error(`[roundCompletion] CAS failed for session ${sessionId}:`, casError);
    return;
  }
  if (!claimed) return; // another request already claimed this round's completion

  try {
    const mutualTmdbId = findMutualMatch(swipesA, swipesB);

    if (mutualTmdbId !== null) {
      const title = pool.titles.find((t) => t.tmdbId === mutualTmdbId);
      if (!title) throw new Error(`Matched tmdbId ${mutualTmdbId} not found in round ${round} pool`);

      const ottPlatforms = await getIndianOttPlatforms(title.tmdbId, title.mediaType);

      const { error: matchError } = await supabase
        .from("matches")
        .insert({ session_id: sessionId, round, tmdb_id: title.tmdbId, ott_platforms: ottPlatforms });
      if (matchError) throw matchError;

      const { error: statusError } = await supabase
        .from("sessions")
        .update({ status: "matched" })
        .eq("id", sessionId);
      if (statusError) throw statusError;
      return;
    }

    if (round === 1) {
      // generateRound2Pool sets status to 'swiping' (round 2) on success, or
      // back to 'collecting' on failure — session is left at 'generating' in
      // between, matching the contract's documented transition.
      await generateRound2Pool(sessionId);
      return;
    }

    // Round 2 exhausted with no match — fall back to a top-5 shortlist.
    // (No dedicated table for this: GET /final-pick recomputes it on demand
    // from the pools + swipes tables via the same lib/matching.computeTopFive,
    // so there's nothing else to persist here — just flip the status.)
    const { error: statusError } = await supabase.from("sessions").update({ status: "final_pick" }).eq("id", sessionId);
    if (statusError) throw statusError;
  } catch (err) {
    console.error(`[roundCompletion] failed to advance session ${sessionId} past round ${round}:`, err);
    await supabase.from("sessions").update({ status: "collecting" }).eq("id", sessionId);
  }
}
