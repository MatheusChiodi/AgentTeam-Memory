// backlinks — notes that link TO the target via a [[wikilink]].
import { resolveNotes, collectNotes, wikilinksOf, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';

export default {
  name: 'backlinks',
  summary: 'List notes that link to the target note',
  usage: 'backlinks <ref> [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: backlinks <ref> [--json]');

    const matches = resolveNotes(ROOT, ref, ctx.all ? { all: true } : { project: PROJECT });
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      const names = matches.map((m) => m.name);
      return fail(`ambiguous "${ref}" — matches: ${names.join(', ')}`);
    }

    const target = matches[0].name.toLowerCase();
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const linkers = notes.filter((n) => wikilinksOf(n).some((l) => l.toLowerCase() === target));

    const data = linkers.map((n) => ({
      name: n.name, summary: n.fm.summary || null, file: relOf(ROOT, n.file),
    }));
    if (!linkers.length) return { ok: true, lines: [`(no backlinks to "${matches[0].name}")`], data };

    const lines = [`# ${linkers.length} backlink(s) to [[${matches[0].name}]]`, ''];
    for (const n of linkers) lines.push(`- [[${n.name}]]  (${relOf(ROOT, n.file)})`);
    return { ok: true, lines, data };
  },
};
