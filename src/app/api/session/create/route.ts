import { NextResponse } from "next/server";
import { customAlphabet } from "nanoid";
import { store } from "@/lib/store";
import type { Preferences } from "@/lib/types";

// Unambiguous alphabet: no 0/O, 1/I/L confusion.
const genCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 6);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const deviceId = body?.deviceId as string | undefined;
  const preferences = body?.preferences as Preferences | undefined;

  if (!deviceId || !preferences) {
    return NextResponse.json({ error: "deviceId and preferences are required" }, { status: 400 });
  }

  let code = genCode();
  for (let i = 0; i < 5; i++) {
    const existing = await store.getSessionByCode(code);
    if (!existing) break;
    code = genCode();
  }

  const session = await store.createSession(code);
  const participantA = await store.upsertParticipant(session.id, "A", deviceId, preferences);
  await store.updateSession(session.id, { status: "waiting_b" });

  return NextResponse.json({ code: session.code, participantId: participantA.id, role: "A" });
}
