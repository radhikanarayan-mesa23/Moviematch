import { createHash } from "node:crypto";

// Order-independent, device-pair-based identity with no login system: the
// same two people always resolve to the same couple_id, as long as they
// keep using the same two devices/browsers.
export function computeCoupleId(deviceA: string, deviceB: string): string {
  const sorted = [deviceA, deviceB].sort();
  return createHash("sha256").update(sorted.join(":")).digest("hex");
}
