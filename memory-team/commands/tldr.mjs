// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// tldr — extractive summary of a note (or the whole set) so the agent skips re-reading
// bodies (F29/US-056). Heuristic, no LLM: extractiveSummary picks the top-N weighted
// sentences (term frequency + lead-sentence bonus + title-term bonus), deterministic.
// A note with no body falls back to its frontmatter summary.
//   tldr <ref>      → { name, summary, sentences[] } for one note
//   tldr / --all    → one line per note: `name — first extracted sentence`
import { resolveNotes, collectNotes, byPinned } from '../notes.mjs';
import { extractiveSummary, splitSentences } from '../analyze.mjs';
import { fail } from './_ctx.mjs';

const DEFAULT_SENTENCES = 3;

/** The extractive summary text for a note; falls back to fm.summary when there's no body. */
function summarize(note, n) {
  const body = String(note.body || '').replace(/^\s*#\s+.*$/m, '').trim();
  const extracted = extractiveSummary(body, n, note.name);
  return extracted || note.fm.summary || '';
}

export default {
  name: 'tldr',
  summary: 'Extractive TL;DR of a note (or one line per note for the set)',
  usage: 'tldr [<ref>] [--sentences N] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    const nRaw = parseInt(opt.sentences, 10);
    const n = Number.isFinite(nRaw) && nRaw > 0 ? nRaw : DEFAULT_SENTENCES;
    const scope = ctx.all ? { all: true } : { project: PROJECT };

    // tldr <ref>: a single note. Inexistent/ambiguous → fail, exit 1.
    if (ref) {
      const matches = resolveNotes(ROOT, ref, scope);
      if (!matches.length) return fail(`no note matches "${ref}"`);
      if (matches.length > 1) {
        return fail(`ambiguous "${ref}" — matches: ${matches.map((m) => m.name).join(', ')}`);
      }
      const note = matches[0];
      const summary = summarize(note, n);
      const data = { name: note.name, summary, sentences: splitSentences(summary) };
      const lines = [`# ${note.name}`, '', summary || '(no content)'];
      return { ok: true, lines, data };
    }

    // Set mode: one line per note (`name — first extracted sentence`). Pins float up.
    const notes = collectNotes(ROOT, scope).slice().sort((a, b) => byPinned(a, b)
      || (b.created || '').localeCompare(a.created || '') || a.name.localeCompare(b.name));
    const data = notes.map((note) => {
      const summary = summarize(note, 1);
      const first = splitSentences(summary)[0] || '';
      return { name: note.name, summary: first };
    });

    if (!data.length) return { ok: true, lines: [''], data };
    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const lines = [`# tldr — ${where} — ${data.length} note(s)`, ''];
    for (const d of data) lines.push(`- ${d.name}${d.summary ? ` — ${d.summary}` : ''}`);
    return { ok: true, lines, data };
  },
};
