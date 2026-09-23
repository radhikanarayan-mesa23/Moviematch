"use client";

const DEVICE_ID_KEY = "tonight_device_id";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

interface SessionIdentity {
  role: "A" | "B";
  participantId: string;
}

function sessionKey(code: string): string {
  return `tonight_session_${code}`;
}

export function getSessionIdentity(code: string): SessionIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(sessionKey(code));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionIdentity;
  } catch {
    return null;
  }
}

export function setSessionIdentity(code: string, identity: SessionIdentity): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(sessionKey(code), JSON.stringify(identity));
}
