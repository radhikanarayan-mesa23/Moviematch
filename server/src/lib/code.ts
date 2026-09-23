// Short, human-friendly session join codes.
// Excludes ambiguous characters (0/O, 1/I) so codes are easy to read aloud or type.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSessionCode(length = 6): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}
