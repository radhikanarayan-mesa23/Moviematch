import { Router } from "express";
import { supabase } from "../services/supabase";
import { getPool } from "../lib/db";
import type { Title } from "../types";

const router = Router();

// GET /api/history?deviceId=...
router.get("/history", async (req, res) => {
  const deviceId = req.query.deviceId;
  if (typeof deviceId !== "string" || !deviceId) {
    return res.status(400).json({ error: "deviceId query param is required" });
  }

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, code, status, created_at")
    .or(`creator_device_id.eq.${deviceId},joiner_device_id.eq.${deviceId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[history] session lookup failed:", error);
    return res.status(500).json({ error: "Failed to load history" });
  }

  const results = await Promise.all(
    (sessions ?? []).map(async (session) => {
      let matchedTitle: Title | null = null;
      let yourRating: number | null = null;

      if (session.status === "matched") {
        const { data: matchRow } = await supabase
          .from("matches")
          .select("*")
          .eq("session_id", session.id)
          .order("matched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (matchRow) {
          const pool = await getPool(session.id, matchRow.round);
          matchedTitle = pool?.titles.find((t) => t.tmdbId === matchRow.tmdb_id) ?? null;

          if (matchedTitle) {
            const { data: ratingRow } = await supabase
              .from("ratings")
              .select("rating")
              .eq("session_id", session.id)
              .eq("device_id", deviceId)
              .eq("tmdb_id", matchedTitle.tmdbId)
              .maybeSingle();
            yourRating = ratingRow?.rating ?? null;
          }
        }
      }

      return {
        code: session.code,
        status: session.status,
        matchedTitle,
        yourRating,
        createdAt: session.created_at,
      };
    })
  );

  return res.status(200).json({ sessions: results });
});

export default router;
