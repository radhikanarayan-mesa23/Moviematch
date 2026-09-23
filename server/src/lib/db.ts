// Small shared helpers used across route handlers. Not "pure" (they hit
// Supabase), unlike lib/matching.ts — kept separate for that reason.

import { supabase } from "../services/supabase";
import type { Partner, SessionStatus, Title } from "../types";
import type { SwipeRecord } from "./matching";

export interface SessionRow {
  id: string;
  code: string;
  status: SessionStatus;
  round: number;
  creator_device_id: string;
  joiner_device_id: string | null;
  created_at: string;
}

export async function getSessionByCode(code: string): Promise<SessionRow | null> {
  const { data, error } = await supabase.from("sessions").select("*").eq("code", code).maybeSingle();
  if (error || !data) return null;
  return data as SessionRow;
}

export function resolvePartner(session: SessionRow, deviceId: string): Partner | null {
  if (session.creator_device_id === deviceId) return "A";
  if (session.joiner_device_id === deviceId) return "B";
  return null;
}

export interface ProfileRow {
  session_id: string;
  partner: Partner;
  moods: string[];
  mood_text: string;
  languages: string[];
  content_type: "movies_only" | "include_series";
  min_rating: number;
  eras: string[];
}

export async function getProfiles(sessionId: string): Promise<Partial<Record<Partner, ProfileRow>>> {
  const { data, error } = await supabase.from("profiles").select("*").eq("session_id", sessionId);
  if (error || !data) return {};
  const out: Partial<Record<Partner, ProfileRow>> = {};
  for (const row of data as ProfileRow[]) {
    out[row.partner] = row;
  }
  return out;
}

export interface PoolRow {
  session_id: string;
  round: number;
  titles: Title[];
}

export async function getPool(sessionId: string, round: number): Promise<PoolRow | null> {
  const { data, error } = await supabase
    .from("pools")
    .select("*")
    .eq("session_id", sessionId)
    .eq("round", round)
    .maybeSingle();
  if (error || !data) return null;
  return data as PoolRow;
}

export async function getSwipesForRound(sessionId: string, round: number): Promise<SwipeRecord[]> {
  const { data, error } = await supabase
    .from("swipes")
    .select("partner, tmdb_id, direction, created_at")
    .eq("session_id", sessionId)
    .eq("round", round);
  if (error || !data) return [];
  return data.map((r: any) => ({
    partner: r.partner,
    tmdbId: r.tmdb_id,
    direction: r.direction,
    createdAt: r.created_at,
  }));
}

export async function getAllSwipes(sessionId: string): Promise<SwipeRecord[]> {
  const { data, error } = await supabase
    .from("swipes")
    .select("partner, tmdb_id, direction, created_at")
    .eq("session_id", sessionId);
  if (error || !data) return [];
  return data.map((r: any) => ({
    partner: r.partner,
    tmdbId: r.tmdb_id,
    direction: r.direction,
    createdAt: r.created_at,
  }));
}
