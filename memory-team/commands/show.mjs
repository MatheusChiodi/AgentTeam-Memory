// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// show — print one note (frontmatter + body), or list candidates when ambiguous.
import { resolveNotes, formatNote, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';

export default {
  name: 'show',
  summary: 'Print a note resolved by reference (basename / slug / substring)',
  usage: 'show <ref> [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: show <ref> [--json]');

    const matches = resolveNotes(ROOT, ref, ctx.all ? { all: true } : { project: PROJECT });
    if (!matches.length) return fail(`no note matches "${ref}"`);

    if (matches.length > 1) {
      const lines = [`# ${matches.length} notes match "${ref}" — be more specific:`, ''];
      for (const m of matches) lines.push(`- [[${m.name}]]  (${relOf(ROOT, m.file)})`);
      return {
        ok: true,
        lines,
        data: { ambiguous: true, candidates: matches.map((m) => ({ name: m.name, file: relOf(ROOT, m.file) })) },
      };
    }

    const n = matches[0];
    const text = formatNote(n.fm, n.body);
    return {
      ok: true,
      lines: [text],
      data: { file: relOf(ROOT, n.file), fm: n.fm, body: n.body },
    };
  },
};
