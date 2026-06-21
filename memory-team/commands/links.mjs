// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// links — outgoing [[wikilinks]] of a note, flagged resolved/dangling.
import { resolveNotes, collectNotes, wikilinksOf, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';

export default {
  name: 'links',
  summary: 'List outgoing wikilinks of a note (resolved vs dangling)',
  usage: 'links <ref> [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: links <ref> [--json]');

    const matches = resolveNotes(ROOT, ref, ctx.all ? { all: true } : { project: PROJECT });
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      const names = matches.map((m) => m.name);
      return fail(`ambiguous "${ref}" — matches: ${names.join(', ')}`);
    }

    const note = matches[0];
    const targets = wikilinksOf(note);
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const names = new Set(notes.map((n) => n.name.toLowerCase()));

    const data = targets.map((t) => ({ target: t, resolved: names.has(t.toLowerCase()) }));
    if (!targets.length) return { ok: true, lines: [`(no outgoing links from "${note.name}")`], data };

    const lines = [`# ${targets.length} link(s) from [[${note.name}]]`, ''];
    for (const d of data) lines.push(`- [[${d.target}]] ${d.resolved ? '✓' : '✗ (dangling)'}`);
    void opt;
    return { ok: true, lines, data };
  },
};
