// move — relocate a note to the equivalent folder in another project, fixing fm.project.
import { writeFileSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { resolveNotes, formatNote, relOf } from '../notes.mjs';
import { partition, ensurePartition, slug } from '../lib.mjs';
import { fail } from './_ctx.mjs';

// Which partition sub-folder a note currently lives in (memory/board/agents/tasks).
function subOf(rel) {
  const m = /\/(memory|board|agents|tasks)\//.exec(`/${rel}`);
  return m ? m[1] : 'memory';
}

export default {
  name: 'move',
  summary: "Move a note to another project's equivalent folder and update fm.project",
  usage: 'move <ref> <targetProject>',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const ref = ctx.pos[0];
    const target = ctx.pos[1] ? slug(ctx.pos[1]) : null;
    if (!ref || !target) return fail('usage: move <ref> <targetProject>');

    const matches = resolveNotes(ROOT, ref, { project: PROJECT }).filter((n) => !n.archived);
    if (!matches.length) return fail(`no note matches "${ref}"`);
    if (matches.length > 1) {
      return fail(`ambiguous "${ref}" — matches: ${matches.map((n) => n.name).join(', ')}`);
    }
    const note = matches[0];

    ensurePartition(ROOT, target);
    const sub = subOf(note.rel);
    const destDir = partition(ROOT, target)[sub] || partition(ROOT, target).memory;
    const dest = join(destDir, basename(note.file));
    if (note.file === dest) return fail(`already in ${target}`);

    const fm = { ...note.fm, project: target };
    writeFileSync(dest, formatNote(fm, note.body), 'utf8');
    try { rmSync(note.file); } catch { /* original may already be gone */ }

    return {
      ok: true,
      lines: [`moved ${note.name} → projects/${target}/${sub}/`],
      data: { from: note.rel, to: relOf(ROOT, dest) },
    };
  },
};
