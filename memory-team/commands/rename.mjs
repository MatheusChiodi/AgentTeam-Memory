// rename — give a note a new title: rewrite its `# heading`, slug + keep any date prefix.
import { renameSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { resolveNotes, relOf, formatNote } from '../notes.mjs';
import { slug } from '../lib.mjs';
import { fail } from './_ctx.mjs';

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2}-)/;

export default {
  name: 'rename',
  summary: 'Rename a note (new title → new slug, keeping any date prefix) and update its heading',
  usage: 'rename <ref> <new title...>',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const ref = ctx.pos[0];
    const title = ctx.pos.slice(1).join(' ').trim();
    if (!ref || !title) return fail('usage: rename <ref> <new title...>');

    const matches = resolveNotes(ROOT, ref, { project: PROJECT });
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      return fail(`ambiguous "${ref}" — matches: ${matches.map((n) => n.name).join(', ')}`);
    }
    const note = matches[0];

    const prefix = (DATE_PREFIX.exec(note.name) || ['', ''])[1];
    const newName = `${prefix}${slug(title)}`;
    const dest = join(dirname(note.file), `${newName}.md`);

    // Refuse to clobber a different note that already owns the target name —
    // otherwise the rename would silently overwrite (and destroy) it.
    if (dest !== note.file && existsSync(dest)) {
      return fail(`a note named "${newName}" already exists in that folder`);
    }

    // Rewrite (or prepend) the first `# heading` line so it matches the new title.
    let body = note.body;
    if (/^\s*#\s.*$/m.test(body)) body = body.replace(/^\s*#\s.*$/m, `# ${title}`);
    else body = `# ${title}\n${body.replace(/^\n+/, '')}`;
    writeFileSync(note.file, formatNote(note.fm, body), 'utf8');

    if (dest !== note.file) renameSync(note.file, dest);
    return {
      ok: true,
      lines: [`renamed ${note.name} → ${newName}`],
      data: { from: note.rel, to: relOf(ROOT, dest) },
    };
  },
};
