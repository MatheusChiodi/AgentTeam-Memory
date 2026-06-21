// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// relate — suggest [[wikilinks]] for a note by similarity, optionally apply them.
// Ranking: shared tags (heavy) > shared summary terms > same type. Excludes the
// source itself and notes it already links to. Dry-run by default; --apply writes
// the top suggestions into the source's `related` (non-destructive round-trip).
import { writeFileSync } from 'node:fs';
import {
  resolveNotes, collectNotes, wikilinksOf, formatNote, relOf,
} from '../notes.mjs';
import { fail } from './_ctx.mjs';

const DEFAULT_TOP = 5;
const STOPWORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'with', 'que', 'de', 'da', 'do', 'em', 'um',
  'uma', 'os', 'no', 'na', 'e', 'o', 'para', 'com', 'por', 'não', 'mais',
]);

/** Lowercased, de-stopworded, length>=3 word set from a summary string. */
function summaryTerms(summary) {
  const set = new Set();
  for (const w of String(summary || '').toLowerCase().split(/[^a-z0-9áàâãéêíóôõúüç]+/i)) {
    if (w.length >= 3 && !STOPWORDS.has(w)) set.add(w);
  }
  return set;
}

/** Score a candidate note against the source, returning { score, reason } or null. */
function similarity(source, srcTerms, cand) {
  const srcTags = new Set(source.tags.map((t) => t.toLowerCase()));
  const reasons = [];
  let score = 0;

  const sharedTags = cand.tags.filter((t) => srcTags.has(t.toLowerCase()));
  if (sharedTags.length) {
    score += sharedTags.length * 3;
    reasons.push(`tags: ${sharedTags.join(', ')}`);
  }

  const candTerms = summaryTerms(cand.fm.summary);
  const sharedTerms = [...srcTerms].filter((w) => candTerms.has(w));
  if (sharedTerms.length) {
    score += sharedTerms.length * 2;
    reasons.push(`summary: ${sharedTerms.join(', ')}`);
  }

  if (source.fm.type && cand.fm.type && source.fm.type === cand.fm.type) {
    score += 1;
    reasons.push(`type: ${cand.fm.type}`);
  }

  if (score <= 0) return null;
  return { score, reason: reasons.join(' · ') };
}

export default {
  name: 'relate',
  summary: 'Suggest (or --apply) [[wikilinks]] for a note by similarity',
  usage: 'relate <ref> [--top N] [--apply] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: relate <ref> [--top N] [--apply] [--json]');

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const matches = resolveNotes(ROOT, ref, scope);
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      const names = matches.map((m) => m.name);
      return fail(`ambiguous "${ref}" — matches: ${names.join(', ')}`);
    }

    const source = matches[0];
    const top = Math.max(1, parseInt(opt.top, 10) || DEFAULT_TOP);
    const already = new Set(wikilinksOf(source).map((l) => l.toLowerCase()));
    already.add(source.name.toLowerCase());

    const srcTerms = summaryTerms(source.fm.summary);
    const candidates = [];
    for (const cand of collectNotes(ROOT, scope)) {
      if (already.has(cand.name.toLowerCase())) continue;
      const sim = similarity(source, srcTerms, cand);
      if (sim) candidates.push({ name: cand.name, score: sim.score, reason: sim.reason });
    }
    candidates.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    const picked = candidates.slice(0, top);
    const data = picked.map((c) => ({ name: c.name, score: c.score, reason: c.reason }));

    if (!picked.length) {
      return { ok: true, lines: [`(no related candidates for "${source.name}")`], data };
    }

    if (opt.apply === true) {
      const existing = Array.isArray(source.fm.related) ? [...source.fm.related] : [];
      const have = new Set(wikilinksOf(source).map((l) => l.toLowerCase()));
      for (const c of picked) {
        if (have.has(c.name.toLowerCase())) continue;
        existing.push(`[[${c.name}]]`);
        have.add(c.name.toLowerCase());
      }
      const fm = { ...source.fm, related: existing };
      writeFileSync(source.file, formatNote(fm, source.body), 'utf8');
      const lines = [
        `linked ${picked.length} suggestion(s) into [[${source.name}]] (${relOf(ROOT, source.file)}):`,
        ...picked.map((c) => `- [[${c.name}]]  (${c.score}) ${c.reason}`),
      ];
      return { ok: true, lines, data };
    }

    const lines = [`# ${picked.length} suggestion(s) for [[${source.name}]] (dry-run, --apply to link)`, ''];
    for (const c of picked) lines.push(`- [[${c.name}]]  (${c.score}) ${c.reason}`);
    return { ok: true, lines, data };
  },
};
