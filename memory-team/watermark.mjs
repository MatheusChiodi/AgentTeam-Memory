// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// watermark.mjs — layered forensic authorship watermark. Zero-dependency (node:crypto only). ESM.
//
// Three layers prove single authorship without ever embedding a secret in the repo:
//   1. CANARY — a public SHA-256 commitment over a SECRET seed only the author holds. The
//      pre-image is NOT in this repo; `verifySeed(seed)` lets the author prove it on demand.
//   2. Zero-width steganography — an invisible "MChiodi" signature woven into always-present
//      terminal output. The invisible characters are GENERATED at runtime from the plain
//      string "MChiodi"; no invisible literals exist in this source (so linters/formatters
//      and diff tools can never silently strip or corrupt the signature).
//   3. Visible attribution — AUTHOR / REPO printed by `whoami`, declared in NOTICE/LICENSE.
//
// HARD RULE: the zero-width signature must NEVER reach a note's summary/tags/title or any
// string that flows through parseFM/slug/save — only terminal/markdown display output.

import { createHash } from 'node:crypto';

export const AUTHOR = 'Matheus Chiodi (MChiodi)';
export const REPO = 'github.com/MatheusChiodi/AgentTeam-Memory';

// Public commitment. sha256(CANARY_DOMAIN + secretSeed) === CANARY. The seed is secret and
// intentionally absent from this repository: knowing the pre-image proves authorship.
export const CANARY = '98acc5a4d39191df1a474e768db004421cc759d7ccabdc24e4b30f1c6f52eaa0';
const CANARY_DOMAIN = 'AgentTeam-Memory::MChiodi::';

/** True iff `seed` is the secret pre-image of the public CANARY. */
export function verifySeed(seed) {
  if (typeof seed !== 'string' || !seed) return false;
  const h = createHash('sha256').update(CANARY_DOMAIN + seed).digest('hex');
  return h === CANARY;
}

// ── Zero-width steganography ───────────────────────────────────────────────────────
// Bit → invisible code point, built from numeric code points so NO invisible character
// is ever written as a literal in this source (linters/diffs stay clean and safe).
const ZW_ZERO = String.fromCodePoint(0x200b); // bit 0          (ZERO WIDTH SPACE)
const ZW_ONE = String.fromCodePoint(0x200c);  // bit 1          (ZERO WIDTH NON-JOINER)
const ZW_MARK = String.fromCodePoint(0x200d); // start sentinel (ZERO WIDTH JOINER)

/** Encode a string's UTF-8 bytes as a zero-width bitstream, prefixed by the start sentinel. */
export function zwEncode(str) {
  const bytes = Buffer.from(String(str), 'utf8');
  let out = ZW_MARK;
  for (const byte of bytes) {
    for (let bit = 7; bit >= 0; bit--) out += ((byte >> bit) & 1) ? ZW_ONE : ZW_ZERO;
  }
  return out;
}

/**
 * Extract the zero-width bitstream of the FIRST sigil and decode it back to a string.
 * Robust by design: the bitstream runs from the start sentinel up to the next sentinel
 * (which delimits it) or the end. A second sentinel — e.g. from a double sign() — never
 * corrupts the first payload, and stray zero-width noise that doesn't form whole bytes
 * is dropped instead of producing a false positive. Never throws; returns "" on no sigil.
 */
export function zwDecode(text) {
  const s = String(text);
  const start = s.indexOf(ZW_MARK);
  if (start < 0) return '';
  // Collect only data bits (ZERO/ONE) after the sentinel, stopping at the next sentinel.
  let stream = '';
  for (let i = start + 1; i < s.length; i++) {
    const ch = s[i];
    if (ch === ZW_MARK) break;          // a following sentinel delimits this payload
    if (ch === ZW_ZERO || ch === ZW_ONE) stream += ch;
  }
  const usable = stream.slice(0, stream.length - (stream.length % 8)); // whole bytes only
  if (!usable) return '';
  const bytes = [];
  for (let i = 0; i < usable.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (usable[i + j] === ZW_ONE ? 1 : 0);
    bytes.push(byte);
  }
  return Buffer.from(bytes).toString('utf8');
}

// Runtime-computed invisible signature for "MChiodi". No invisible literals in source.
export const SIGIL = zwEncode('MChiodi');

/** Append the invisible authorship sigil to `text`. */
export const sign = (text) => `${String(text)}${SIGIL}`;

/** Recover the embedded author name from `text` ("MChiodi" if present, else ""). */
export const extract = (text) => zwDecode(text);
