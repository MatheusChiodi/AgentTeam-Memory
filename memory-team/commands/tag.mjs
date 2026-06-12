// tag — add/remove tags on a single resolved note (rewrites it on disk).
import { writeFileSync } from 'node:fs';
import { resolveNotes, formatNote, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';

/** Split a comma-separated `--add`/`--remove` value into trimmed, non-empty tags. */
function parseTagList(value) {
  if (value == null || value === true) return [];
  return String(value).split(',').map((s) => s.trim()).filter(Boolean);
}

export default {
  name: 'tag',
  summary: 'Add/remove tags on one note (--add "a,b" --remove "c,d")',
  usage: 'tag <ref> [--add "a,b"] [--remove "c,d"] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: tag <ref> [--add "a,b"] [--remove "c,d"]');

    const matches = resolveNotes(ROOT, ref, ctx.all ? { all: true } : { project: PROJECT });
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      const names = matches.map((m) => m.name);
      return fail(`ambiguous "${ref}" — matches: ${names.join(', ')}`);
    }

    const add = parseTagList(opt.add);
    const remove = parseTagList(opt.remove).map((t) => t.toLowerCase());
    if (!add.length && !remove.length) return fail('nothing to do: pass --add and/or --remove');

    const n = matches[0];
    const current = [...n.tags];
    const result = current.filter((t) => !remove.includes(t.toLowerCase()));
    for (const t of add) {
      if (!result.some((x) => x.toLowerCase() === t.toLowerCase())) result.push(t);
    }

    const fm = { ...n.fm, tags: result };
    writeFileSync(n.file, formatNote(fm, n.body), 'utf8');

    return {
      ok: true,
      lines: [`${relOf(ROOT, n.file)} → tags: ${result.join(', ') || '(none)'}`],
      data: { file: relOf(ROOT, n.file), tags: result },
    };
  },
};
