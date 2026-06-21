// tokens — estimate the token cost of a note, the whole project, or a raw text
// (F27/US-054). Deterministic heuristic via estimateTokens (≈chars/4 adjusted by word
// count): same input ⇒ same number. A note's cost is title + summary + body summed, so
// it reflects everything the agent would actually load. Three modes:
//   tokens <ref>        → that single note
//   tokens / --all      → aggregate the project (total + average + top-N largest)
//   tokens --text "..." → a one-off string
import { resolveNotes, collectNotes } from '../notes.mjs';
import { estimateTokens } from '../analyze.mjs';
import { fail } from './_ctx.mjs';

const TOP_N = 5;

/** Full token cost of a note: its title, frontmatter summary and body together. */
function noteTokens(note) {
  return estimateTokens(`${note.name}\n${note.fm.summary || ''}\n${note.body || ''}`);
}

export default {
  name: 'tokens',
  summary: 'Estimate token cost of a note, the project, or a raw --text',
  usage: 'tokens [<ref>] [--text "..."] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    const scope = ctx.all ? { all: true } : { project: PROJECT };

    // --text: estimate an arbitrary string. Empty text → 0 tokens, exit 0 (contract).
    if (typeof opt.text === 'string') {
      const tokens = estimateTokens(opt.text);
      return { ok: true, lines: [`${tokens} tok`], data: { text: opt.text, tokens } };
    }

    // tokens <ref>: a single resolved note. Inexistent/ambiguous → fail, exit 1.
    if (ref) {
      const matches = resolveNotes(ROOT, ref, scope);
      if (!matches.length) return fail(`no note matches "${ref}"`);
      if (matches.length > 1) {
        return fail(`ambiguous "${ref}" — matches: ${matches.map((m) => m.name).join(', ')}`);
      }
      const note = matches[0];
      const tokens = noteTokens(note);
      return {
        ok: true,
        lines: [`${note.name} — ${tokens} tok`],
        data: { total: tokens, perNote: [{ name: note.name, tokens }] },
      };
    }

    // Aggregate the project (or all): total + average + top-N largest notes.
    const perNote = collectNotes(ROOT, scope)
      .map((n) => ({ name: n.name, tokens: noteTokens(n) }))
      .sort((a, b) => b.tokens - a.tokens || a.name.localeCompare(b.name));
    const total = perNote.reduce((a, n) => a + n.tokens, 0);
    const avg = perNote.length ? Math.round(total / perNote.length) : 0;

    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const lines = [`# tokens — ${where} — total ${total} · avg ${avg} · ${perNote.length} note(s)`];
    if (perNote.length) {
      lines.push('', `## top ${Math.min(TOP_N, perNote.length)} largest`);
      for (const n of perNote.slice(0, TOP_N)) lines.push(`- ${n.name} — ${n.tokens} tok`);
    }
    return { ok: true, lines, data: { total, perNote } };
  },
};
