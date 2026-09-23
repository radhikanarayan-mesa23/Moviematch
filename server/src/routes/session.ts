import { Router } from "express";
import { supabase } from "../services/supabase";
import { generateSessionCode } from "../lib/code";
import { getSessionByCode, getProfiles } from "../lib/db";

const router = Router();

// POST /api/sessions
router.post("/sessions", async (req, res) => {
  const { deviceId } = req.body ?? {};
  if (typeof deviceId !== "string" || !deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateSessionCode();
    const { data, error } = await supabase
      .from("sessions")
      .insert({ code, creator_device_id: deviceId })
      .select("id, code, status, round")
      .single();

    if (!error && data) {
      return res.status(201).json({ code: data.code, id: data.id, status: data.status, round: data.round });
    }

    // Unique violation on `code` — retry with a fresh code. Any other error, bail out.
    if (error && error.code !== "23505") {
      console.error("[sessions] create failed:", error);
      return res.status(500).json({ error: "Failed to create session" });
    }
  }

  return res.status(500).json({ error: "Failed to create session" });
});

// POST /api/sessions/:code/join
router.post("/sessions/:code/join", async (req, res) => {
  const { code } = req.params;
  const { deviceId } = req.body ?? {};
  if (typeof deviceId !== "string" || !deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // Idempotent for a device that's already part of this session.
  if (session.creator_device_id === deviceId || session.joiner_device_id === deviceId) {
    return res.status(200).json({ id: session.id, status: session.status, round: session.round });
  }

  if (session.joiner_device_id) {
    return res.status(409).json({ error: "Session already has two partners" });
  }

  const { data, error } = await supabase
    .from("sessions")
    .update({ joiner_device_id: deviceId, status: "collecting" })
    .eq("id", session.id)
    .select("id, status, round")
    .single();

  if (error || !data) {
    console.error("[sessions] join failed:", error);
    return res.status(500).json({ error: "Failed to join session" });
  }

  return res.status(200).json({ id: data.id, status: data.status, round: data.round });
});

// GET /api/sessions/:code
router.get("/sessions/:code", async (req, res) => {
  const { code } = req.params;
  const session = await getSessionByCode(code);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const profiles = await getProfiles(session.id);

  return res.status(200).json({
    id: session.id,
    code: session.code,
    status: session.status,
    round: session.round,
    partnerASubmitted: Boolean(profiles.A),
    partnerBSubmitted: Boolean(profiles.B),
  });
});

export default router;
