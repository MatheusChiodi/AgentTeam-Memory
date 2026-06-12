// archive — move a single resolved note into the project _archive (or --restore it back).
import { renameSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { resolveNotes, relOf, ARCHIVE_DIR } from '../notes.mjs';
import { partition, ensure } from '../lib.mjs';
import { fail } from './_ctx.mjs';

export default {
  name: 'archive',
  summary: 'Archive a note (move to _archive); --restore moves it back to memory/',
  usage: 'archive <ref> [--restore]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const ref = ctx.pos.join(' ').trim();
    if (!ref) return fail('usage: archive <ref> [--restore]');

    const restore = opt.restore === true;
    const matches = resolveNotes(ROOT, ref, { project: PROJECT })
      .filter((n) => (restore ? n.archived : !n.archived));
    if (!matches.length) return fail(`no ${restore ? 'archived ' : ''}note matches "${ref}"`);
    if (matches.length > 1) {
      return fail(`ambiguous "${ref}" — matches: ${matches.map((n) => n.name).join(', ')}`);
    }

    const note = matches[0];
    const proj = note.fm.project && note.fm.project !== 'global' ? note.fm.project : PROJECT;
    const p = partition(ROOT, proj);
    let dest;
    if (restore) {
      ensure(p.memory);
      dest = join(p.memory, basename(note.file));
    } else {
      const archive = join(dirname(note.file), ARCHIVE_DIR);
      ensure(archive);
      dest = join(archive, basename(note.file));
    }
    renameSync(note.file, dest);
    return {
      ok: true,
      lines: [`${restore ? 'restored' : 'archived'}: ${relOf(ROOT, dest)}`],
      data: { file: relOf(ROOT, dest), archived: !restore },
    };
  },
};
