import { Router } from "express";
import { supabase } from "../services/supabase";
import { getSessionByCode, resolvePartner, getProfiles } from "../lib/db";
import { generateRound1Pool } from "../lib/poolGeneration";

const router = Router();

const VALID_CONTENT_TYPES = new Set(["movies_only", "include_series"]);
const VALID_RATINGS = new Set([6, 7, 8, 9]);

// POST /api/sessions/:code/profile
router.post("/sessions/:code/profile", async (req, res) => {
  const { code } = req.params;
  const body = req.body ?? {};
  const { deviceId, moods, moodText, languages, contentType, minRating, eras } = body;

  if (typeof deviceId !== "string" || !deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }
  if (!Array.isArray(moods) || !Array.isArray(languages) || !Array.isArray(eras)) {
    return res.status(400).json({ error: "moods, languages, and eras must be arrays" });
  }
  if (!VALID_CONTENT_TYPES.has(contentType)) {
    return res.status(400).json({ error: "contentType must be 'movies_only' or 'include_series'" });
  }
  if (!VALID_RATINGS.has(minRating)) {
    return res.status(400).json({ error: "minRating must be one of 6, 7, 8, 9" });
  }

  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const partner = resolvePartner(session, deviceId);
  if (!partner) return res.status(403).json({ error: "This device has not joined this session" });

  const { error: upsertError } = await supabase.from("profiles").upsert(
    {
      session_id: session.id,
      partner,
      moods,
      mood_text: typeof moodText === "string" ? moodText : "",
      languages,
      content_type: contentType,
      min_rating: minRating,
      eras,
    },
    { onConflict: "session_id,partner" }
  );

  if (upsertError) {
    console.error("[profile] upsert failed:", upsertError);
    return res.status(500).json({ error: "Failed to save profile" });
  }

  // Respond immediately — pool generation (if it's now triggered) happens
  // fire-and-forget below so the client isn't left waiting on this request.
  res.status(200).json({ ok: true });

  const profiles = await getProfiles(session.id);
  if (profiles.A && profiles.B) {
    // Compare-and-swap on status so two near-simultaneous submissions can't
    // both trigger round-1 generation (which would double-insert the pool row).
    const { data: casData, error: statusError } = await supabase
      .from("sessions")
      .update({ status: "generating" })
      .eq("id", session.id)
      .eq("status", "collecting")
      .select("id")
      .maybeSingle();
    if (statusError) {
      console.error("[profile] failed to flip status to generating:", statusError);
      return;
    }
    if (!casData) return; // another request already claimed the transition

    void generateRound1Pool(session.id).catch((err) => {
      console.error(`[profile] unhandled error generating round 1 pool for session ${session.id}:`, err);
    });
  }
});

export default router;
