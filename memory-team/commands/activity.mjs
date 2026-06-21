// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// activity (F24) — a sparkline of notes created per day across a window (`--days N`,
// default 14), plus total / average / peak day. `--by agent|type` emits one sparkline
// per dimension. "Today" is injectable (`--today YYYY-MM-DD`) so tests never read the
// real clock; the window is the N days ending on today (inclusive).
import { collectNotes } from '../notes.mjs';
import { today, addDays, dateRange } from '../lib.mjs';
import { sparkline } from '../render.mjs';

const DEFAULT_DAYS = 14;

/** Count notes by `created` for each date in `range`; returns date→count map. */
function countByDate(notes, range) {
  const set = new Set(range);
  const counts = new Map(range.map((d) => [d, 0]));
  for (const n of notes) {
    if (n.created && set.has(n.created)) counts.set(n.created, counts.get(n.created) + 1);
  }
  return counts;
}

export default {
  name: 'activity',
  summary: 'Sparkline of notes created per day (window), with total/avg/peak',
  usage: 'activity [--days N] [--by agent|type] [--all] [--json] [--today YYYY-MM-DD]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const days = Math.max(1, parseInt(opt.days, 10) || DEFAULT_DAYS);
    const end = typeof opt.today === 'string' ? opt.today : today();
    const range = dateRange(addDays(end, -(days - 1)), end);
    const by = (opt.by === 'agent' || opt.by === 'type') ? opt.by : null;

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    const overall = countByDate(notes, range);
    const series = range.map((d) => ({ date: d, count: overall.get(d) }));
    const total = series.reduce((a, s) => a + s.count, 0);
    const max = series.reduce((a, s) => Math.max(a, s.count), 0);
    // Average over the window length (not over active days) — the "rhythm" the US wants.
    const avg = total / range.length;
    const peak = series.reduce((best, s) => (s.count > best.count ? s : best), series[0]
      || { date: end, count: 0 });

    const data = { days: range.length, total, max, series };

    const lines = [];
    lines.push(`# activity — last ${range.length}d (${range[0]}..${end})`);
    lines.push(`${sparkline(series.map((s) => s.count))}  total ${total} · avg ${avg.toFixed(1)} · peak ${peak.count} (${peak.date})`);

    if (by) {
      // One sparkline per dimension, sharing the same date window.
      const groups = new Map();
      for (const n of notes) {
        const key = by === 'agent' ? (n.fm.agent || 'unknown') : (n.fm.type || 'untyped');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(n);
      }
      const width = Math.max(0, ...[...groups.keys()].map((k) => k.length));
      const byDim = {};
      lines.push('');
      for (const key of [...groups.keys()].sort()) {
        const c = countByDate(groups.get(key), range);
        const vals = range.map((d) => c.get(d));
        byDim[key] = range.map((d) => ({ date: d, count: c.get(d) }));
        lines.push(`${key.padEnd(width)}  ${sparkline(vals)}  ${vals.reduce((a, b) => a + b, 0)}`);
      }
      data.by = by;
      data.byDim = byDim;
    }

    return { ok: true, lines, data };
  },
};
