// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// blockers (F36) — surface notes flagged as a risk/blocker so the lead can attack what
// stalls the team. A note qualifies two ways: by a risk *tag* (blocker/risk/blocked,
// case-insensitive) or by a risk *marker* in the body (blocked/blocker/risco/⚠). The tag
// path wins (cheaper, intentional); the body path is the fallback. Read-only.
import { collectNotes } from '../notes.mjs';
import { dim } from '../render.mjs';

// Risk tags and body markers, lowercased once. The ⚠ marker has no case, so it lives here too.
const RISK_TAGS = new Set(['blocker', 'risk', 'blocked']);
const BODY_MARKERS = ['blocked', 'blocker', 'risco', '⚠'];

/** First matching risk tag (original casing), or null. */
function riskTag(note) {
  for (const t of note.tags) if (RISK_TAGS.has(String(t).toLowerCase())) return t;
  return null;
}

/** First body line carrying a risk marker → { marker, line(1-based) }, or null. */
function bodyMarker(note) {
  const lines = String(note.body || '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase();
    for (const m of BODY_MARKERS) {
      // ⚠ is not lowercased by toLowerCase, but matches as-is either way.
      if (low.includes(m)) return { marker: m, line: i + 1 };
    }
  }
  return null;
}

export default {
  name: 'blockers',
  summary: 'Surface notes flagged as risk/blocker (by tag or body marker)',
  usage: 'blockers [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope);

    const data = [];
    for (const n of notes) {
      const tag = riskTag(n);
      if (tag) {
        data.push({ name: n.name, reason: `tag: ${tag}`, source: 'tag' });
        continue; // tag wins — don't double-report the same note from its body
      }
      const bm = bodyMarker(n);
      if (bm) data.push({ name: n.name, reason: `"${bm.marker}" @ line ${bm.line}`, source: 'body' });
    }
    data.sort((a, b) => a.name.localeCompare(b.name));

    if (!data.length) return { ok: true, lines: ['no blockers'], data };

    const lines = [`# ${data.length} blocker(s)`, ''];
    for (const b of data) lines.push(`- ${b.name} — ${dim(b.reason)}`);
    return { ok: true, lines, data };
  },
};
