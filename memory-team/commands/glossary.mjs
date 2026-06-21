// glossary (F37) — extract recurring terms from note summaries+titles and list where each
// appears, giving the team a shared vocabulary. Reuses analyze.tokenize (the PT+EN stopword
// list) so the glossary speaks the same dialect as relate/focus. Frequency is counted across
// notes; only terms appearing in >= --min notes survive. Read-only.
import { collectNotes } from '../notes.mjs';
import { tokenize } from '../analyze.mjs';

const DEFAULT_MIN = 2;
const DEFAULT_TOP = 5; // notes-source cap per term

export default {
  name: 'glossary',
  summary: 'Build a term index from note summaries/titles with source notes',
  usage: 'glossary [--min N] [--top N] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const min = Math.max(1, parseInt(opt.min, 10) || DEFAULT_MIN);
    const top = Math.max(1, parseInt(opt.top, 10) || DEFAULT_TOP);

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope);

    // term → ordered set of note names (insertion order = vault order, deterministic).
    const sources = new Map();
    for (const n of notes) {
      // De-dupe per note: a term that appears twice in one summary still counts once.
      const terms = new Set(tokenize(`${n.fm.summary || ''} ${n.name}`));
      for (const t of terms) {
        if (!sources.has(t)) sources.set(t, []);
        sources.get(t).push(n.name);
      }
    }

    const data = [];
    for (const [term, names] of sources) {
      if (names.length < min) continue;
      data.push({ term, count: names.length, notes: names.slice(0, top) });
    }
    // Most frequent first; ties alphabetical for a stable glossary.
    data.sort((a, b) => b.count - a.count || a.term.localeCompare(b.term));

    if (!data.length) return { ok: true, lines: ['(glossário vazio)'], data };

    const lines = [`# glossário (${data.length} termo(s), freq ≥ ${min})`, ''];
    for (const e of data) lines.push(`- **${e.term}** (${e.count}) — ${e.notes.join(', ')}`);
    return { ok: true, lines, data };
  },
};
