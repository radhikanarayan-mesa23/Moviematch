import { Router } from "express";
import { supabase } from "../services/supabase";
import { getSessionByCode, resolvePartner, getPool } from "../lib/db";
import { checkRoundCompletionAndAdvance } from "../lib/roundCompletion";

const router = Router();

// POST /api/sessions/:code/swipe
router.post("/sessions/:code/swipe", async (req, res) => {
  const { code } = req.params;
  const body = req.body ?? {};
  const { deviceId, round, tmdbId, direction } = body;

  if (typeof deviceId !== "string" || !deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }
  if (round !== 1 && round !== 2) {
    return res.status(400).json({ error: "round must be 1 or 2" });
  }
  if (typeof tmdbId !== "number") {
    return res.status(400).json({ error: "tmdbId must be a number" });
  }
  if (direction !== "left" && direction !== "right") {
    return res.status(400).json({ error: "direction must be 'left' or 'right'" });
  }

  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const partner = resolvePartner(session, deviceId);
  if (!partner) return res.status(403).json({ error: "This device has not joined this session" });

  const pool = await getPool(session.id, round);
  if (!pool) return res.status(404).json({ error: "Pool not ready for this round" });

  const { error: swipeError } = await supabase.from("swipes").upsert(
    {
      session_id: session.id,
      round,
      partner,
      tmdb_id: tmdbId,
      direction,
    },
    { onConflict: "session_id,round,partner,tmdb_id" }
  );

  if (swipeError) {
    console.error("[swipe] upsert failed:", swipeError);
    return res.status(500).json({ error: "Failed to record swipe" });
  }

  // Respond immediately — round-completion side effects (matching, OTT
  // lookup, round-2 generation) run fire-and-forget, same pattern as round-1
  // pool generation. The client polls GET /sessions/:code for the outcome.
  res.status(200).json({ ok: true });

  void checkRoundCompletionAndAdvance(session.id, round).catch((err) => {
    console.error(`[swipe] unhandled error advancing session ${session.id} round ${round}:`, err);
  });
});

export default router;
