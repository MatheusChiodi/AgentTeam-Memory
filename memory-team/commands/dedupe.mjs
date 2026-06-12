// dedupe — report groups of notes that look like duplicates (same title slug or summary).
import { collectNotes } from '../notes.mjs';

// Strip a leading YYYY-MM-DD- date prefix to compare titles regardless of when saved.
const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;
const baseSlug = (name) => name.replace(DATE_PREFIX, '');
const normSummary = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

export default {
  name: 'dedupe',
  summary: 'Report suspected duplicate notes (same title slug or identical summary)',
  usage: 'dedupe [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    const groups = new Map(); // key -> Set(names)
    const add = (key, name) => {
      if (!key) return;
      if (!groups.has(key)) groups.set(key, new Set());
      groups.get(key).add(name);
    };
    for (const n of notes) {
      add(`slug:${baseSlug(n.name)}`, n.name);
      const s = normSummary(n.fm.summary);
      if (s) add(`summary:${s}`, n.name);
    }

    const data = [...groups.entries()]
      .filter(([, set]) => set.size > 1)
      .map(([key, set]) => ({ key, notes: [...set].sort() }))
      .sort((a, b) => b.notes.length - a.notes.length || a.key.localeCompare(b.key));

    const lines = [];
    if (!data.length) lines.push('no suspected duplicates');
    else {
      lines.push(`# ${data.length} duplicate group(s)`, '');
      for (const g of data) {
        lines.push(`- ${g.key}`);
        for (const name of g.notes) lines.push(`    [[${name}]]`);
      }
    }
    return { ok: true, lines, data };
  },
};
