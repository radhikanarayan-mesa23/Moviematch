import { Router } from "express";
import { supabase } from "../services/supabase";

const router = Router();

// POST /api/ratings
router.post("/ratings", async (req, res) => {
  const body = req.body ?? {};
  const { sessionId, deviceId, tmdbId, rating } = body;

  if (typeof sessionId !== "string" || !sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }
  if (typeof deviceId !== "string" || !deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }
  if (typeof tmdbId !== "number") {
    return res.status(400).json({ error: "tmdbId must be a number" });
  }
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "rating must be a number between 1 and 5" });
  }

  const { error } = await supabase.from("ratings").upsert(
    {
      session_id: sessionId,
      device_id: deviceId,
      tmdb_id: tmdbId,
      rating,
    },
    { onConflict: "session_id,device_id,tmdb_id" }
  );

  if (error) {
    console.error("[ratings] upsert failed:", error);
    return res.status(500).json({ error: "Failed to save rating" });
  }

  return res.status(200).json({ ok: true });
});

export default router;
