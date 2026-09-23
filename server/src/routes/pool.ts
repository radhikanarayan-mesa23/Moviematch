import { Router } from "express";
import { supabase } from "../services/supabase";
import { getSessionByCode, getPool, getAllSwipes } from "../lib/db";
import { computeTopFive } from "../lib/matching";
import type { Title } from "../types";

const router = Router();

// GET /api/sessions/:code/pool?round=1|2
router.get("/sessions/:code/pool", async (req, res) => {
  const { code } = req.params;
  const roundParam = req.query.round;
  const round = Number(Array.isArray(roundParam) ? roundParam[0] : roundParam);

  if (!Number.isFinite(round) || (round !== 1 && round !== 2)) {
    return res.status(400).json({ error: "round query param must be 1 or 2" });
  }

  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const pool = await getPool(session.id, round);
  if (!pool) return res.status(404).json({ error: "Pool not ready yet" });

  return res.status(200).json({ round: pool.round, titles: pool.titles });
});

// GET /api/sessions/:code/match
router.get("/sessions/:code/match", async (req, res) => {
  const { code } = req.params;
  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  if (session.status !== "matched") {
    return res.status(404).json({ error: "No match yet for this session" });
  }

  const { data: matchRow, error } = await supabase
    .from("matches")
    .select("*")
    .eq("session_id", session.id)
    .order("matched_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !matchRow) {
    console.error("[match] lookup failed:", error);
    return res.status(404).json({ error: "No match yet for this session" });
  }

  const pool = await getPool(session.id, matchRow.round);
  const title = pool?.titles.find((t: Title) => t.tmdbId === matchRow.tmdb_id);
  if (!title) {
    return res.status(500).json({ error: "Matched title could not be resolved" });
  }

  return res.status(200).json({ title, ottPlatforms: matchRow.ott_platforms ?? [] });
});

// GET /api/sessions/:code/final-pick
router.get("/sessions/:code/final-pick", async (req, res) => {
  const { code } = req.params;
  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  if (session.status !== "final_pick") {
    return res.status(404).json({ error: "Final pick not ready yet" });
  }

  const [round1Pool, round2Pool, allSwipes] = await Promise.all([
    getPool(session.id, 1),
    getPool(session.id, 2),
    getAllSwipes(session.id),
  ]);

  const byId = new Map<number, Title>();
  for (const t of [...(round1Pool?.titles ?? []), ...(round2Pool?.titles ?? [])]) {
    byId.set(t.tmdbId, t);
  }

  const titles = computeTopFive(allSwipes, Array.from(byId.values()));
  return res.status(200).json({ titles });
});

export default router;
