// timeline — notes grouped by creation day, newest first, with optional --since/--limit.
import { collectNotes } from '../notes.mjs';

export default {
  name: 'timeline',
  summary: 'Notes grouped by creation day (newest first), filtered by --since and capped by --limit',
  usage: 'timeline [--since YYYY-MM-DD] [--limit n] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const since = typeof opt.since === 'string' ? opt.since : null;
    const limit = opt.limit != null && opt.limit !== true ? Number(opt.limit) : null;

    let notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT })
      .filter((n) => n.created);
    if (since) notes = notes.filter((n) => n.created >= since);
    notes.sort((a, b) => (b.created.localeCompare(a.created)) || a.name.localeCompare(b.name));
    if (limit != null && Number.isFinite(limit)) notes = notes.slice(0, limit);

    const groups = new Map();
    for (const n of notes) {
      if (!groups.has(n.created)) groups.set(n.created, []);
      groups.get(n.created).push(n);
    }
    const data = [...groups.entries()].map(([date, arr]) => ({
      date,
      notes: arr.map((n) => ({
        name: n.name, type: n.fm.type || null, summary: n.fm.summary || null,
      })),
    }));

    const lines = [];
    if (!notes.length) lines.push('(no notes in range)');
    for (const { date, notes: arr } of data) {
      lines.push(`## ${date}`);
      for (const n of arr) lines.push(`- [[${n.name}]] (${n.type || '?'}) ${n.summary || ''}`.trimEnd());
      lines.push('');
    }
    return { ok: true, lines, data };
  },
};
