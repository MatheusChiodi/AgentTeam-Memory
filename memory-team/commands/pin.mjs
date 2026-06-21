// pin — flag/unflag a single note as `pinned` (rewrites it on disk), or list pinned.
// Marking only: the ordering that floats pinned notes to the top of list/search/recent
// is wired by those commands, not here.
import { writeFileSync } from 'node:fs';
import { resolveNotes, collectNotes, formatNote, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';

/** True when a note carries a truthy `pinned` frontmatter flag. */
function isPinned(n) {
  return n.fm.pinned === true || n.fm.pinned === 'true';
}

/** `pin --list`: collect every pinned note in scope and render it. */
function listPinned(ctx) {
  const { ROOT, PROJECT } = ctx;
  const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT })
    .filter(isPinned)
    .sort((a, b) => (b.created || '').localeCompare(a.created || '') || b.mtime - a.mtime);

  const data = notes.map((n) => ({
    name: n.name,
    type: n.fm.type || null,
    summary: n.fm.summary || null,
    file: relOf(ROOT, n.file),
  }));

  if (!notes.length) return { ok: true, lines: ['(no pinned notes)'], data };
  const lines = [`# ${notes.length} pinned note(s)`, ''];
  for (const n of notes) {
    lines.push(`- [[${n.name}]]  (${n.fm.type || '?'})`);
    if (n.fm.summary) lines.push(`    summary: ${n.fm.summary}`);
  }
  return { ok: true, lines, data };
}

export default {
  name: 'pin',
  summary: 'Pin/unpin a note so it floats to the top (--off to unpin, --list to list)',
  usage: 'pin <ref> [--off] | pin --list [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    if (opt.list === true) return listPinned(ctx);

    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: pin <ref> [--off] | pin --list');

    const matches = resolveNotes(ROOT, ref, ctx.all ? { all: true } : { project: PROJECT });
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      const names = matches.map((m) => m.name);
      return fail(`ambiguous "${ref}" — matches: ${names.join(', ')}`);
    }

    const n = matches[0];
    const off = opt.off === true;
    const fm = { ...n.fm };
    if (off) delete fm.pinned;
    else fm.pinned = true;

    writeFileSync(n.file, formatNote(fm, n.body), 'utf8');

    const pinned = !off;
    return {
      ok: true,
      lines: [`${relOf(ROOT, n.file)} → ${pinned ? 'pinned' : 'unpinned'}`],
      data: { name: n.name, pinned },
    };
  },
};
