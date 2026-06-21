// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// retag — rename a tag (old → new) across every note in the project (or --all).
import { writeFileSync } from 'node:fs';
import { collectNotes, formatNote, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';

export default {
  name: 'retag',
  summary: 'Rename a tag across all notes (old → new)',
  usage: 'retag <old> <new> [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const [oldTag, newTag] = ctx.pos;
    if (!oldTag || !newTag) return fail('usage: retag <old> <new> [--all]');
    const wantOld = oldTag.toLowerCase();

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const changed = [];
    for (const n of notes) {
      if (!n.tags.some((t) => t.toLowerCase() === wantOld)) continue;
      const next = [];
      for (const t of n.tags) {
        const replaced = t.toLowerCase() === wantOld ? newTag : t;
        if (!next.some((x) => x.toLowerCase() === replaced.toLowerCase())) next.push(replaced);
      }
      const fm = { ...n.fm, tags: next };
      writeFileSync(n.file, formatNote(fm, n.body), 'utf8');
      changed.push(relOf(ROOT, n.file));
    }

    const lines = changed.length
      ? [`retagged ${oldTag} → ${newTag} in ${changed.length} note(s):`, ...changed.map((f) => `- ${f}`)]
      : [`no note carries tag "${oldTag}"`];
    void opt;
    return { ok: true, lines, data: { changed: changed.length, files: changed } };
  },
};
