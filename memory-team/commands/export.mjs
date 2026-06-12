// export — dump notes as a JSON array or a concatenated Markdown bundle (optionally to a file).
import { writeFileSync } from 'node:fs';
import { collectNotes, formatNote } from '../notes.mjs';

export default {
  name: 'export',
  summary: 'Export notes as JSON (default) or concatenated Markdown; --out writes to a file',
  usage: 'export [--format json|md] [--out file] [--all]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const format = opt.format === 'md' ? 'md' : 'json';
    const out = typeof opt.out === 'string' ? opt.out : null;

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    let payload;
    if (format === 'json') {
      payload = JSON.stringify(
        notes.map((n) => ({ file: n.rel, fm: n.fm, body: n.body })),
        null,
        2,
      );
    } else {
      payload = notes.map((n) => formatNote(n.fm, n.body).trim()).join('\n\n---\n\n');
    }

    const data = { format, count: notes.length };
    if (out) {
      writeFileSync(out, payload, 'utf8');
      data.out = out;
      return { ok: true, lines: [`wrote ${out} (${notes.length} notes)`], data };
    }
    return { ok: true, lines: [payload], data: ctx.json ? { ...data, payload } : data };
  },
};
