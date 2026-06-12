// import — load a JSON bundle produced by `export` and write each note into a project.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { formatNote, relOf } from '../notes.mjs';
import {
  partition, ensurePartition, slug, today,
} from '../lib.mjs';
import { fail } from './_ctx.mjs';

export default {
  name: 'import',
  summary: 'Import notes from a JSON bundle (from `export`) into a project memory/ folder',
  usage: 'import <file> [--project p]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const file = ctx.pos[0];
    if (!file) return fail('usage: import <file> [--project p]');
    if (!existsSync(file)) return fail(`file not found: ${file}`);

    let items;
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      items = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.notes) ? parsed.notes : null);
    } catch (e) {
      return fail(`invalid JSON: ${e.message}`);
    }
    if (!items) return fail('expected a JSON array of {fm,body} notes');

    const target = typeof opt.project === 'string' ? slug(opt.project) : PROJECT;
    ensurePartition(ROOT, target);
    const dir = partition(ROOT, target).memory;

    const files = [];
    for (const item of items) {
      const fm = { ...(item.fm || {}), project: target };
      const body = item.body || '';
      const created = fm.created || today();
      const base = `${created}-${slug(fm.summary || fm.title || body.split('\n').find((l) => l.startsWith('# ')) || 'note')}`;
      let dest = join(dir, `${base}.md`);
      let n = 2;
      while (existsSync(dest)) { dest = join(dir, `${base}-${n}.md`); n += 1; }
      fm.created = created;
      writeFileSync(dest, formatNote(fm, body), 'utf8');
      files.push(relOf(ROOT, dest));
    }
    return { ok: true, lines: [`imported ${files.length} note(s) into projects/${target}/memory/`], data: { imported: files.length, files } };
  },
};
