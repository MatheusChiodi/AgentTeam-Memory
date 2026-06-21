// heatmap (F25) — a GitHub-style calendar of note creation: a grid of `--weeks N`
// (default 12) columns × 7 weekday rows. Intensity comes from heatLevels (quartiles of
// the *non-zero* counts in the period, not fixed thresholds) → heatGlyph. "Today" is
// injectable (`--today YYYY-MM-DD`) so the grid is deterministic in tests; the period
// ends on the week containing today (filled to Saturday) and spans N weeks back.
import { collectNotes } from '../notes.mjs';
import { today, addDays, dayOfWeek } from '../lib.mjs';
import { heatLevels, heatGlyph, dim } from '../render.mjs';

const DEFAULT_WEEKS = 12;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default {
  name: 'heatmap',
  summary: 'GitHub-style calendar heatmap of note creation (weeks × weekdays)',
  usage: 'heatmap [--weeks N] [--all] [--json] [--today YYYY-MM-DD]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const weeks = Math.max(1, parseInt(opt.weeks, 10) || DEFAULT_WEEKS);
    const end = typeof opt.today === 'string' ? opt.today : today();

    // Anchor the grid: the last column ends on the Saturday of today's week, the first
    // column starts (weeks-1) Sundays before that week's Sunday. Aligning to week
    // boundaries is what makes columns read as calendar weeks, like GitHub's graph.
    const lastSat = addDays(end, 6 - dayOfWeek(end));
    const firstSun = addDays(lastSat, -(weeks * 7 - 1));

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const counts = new Map();
    for (const n of notes) {
      if (n.created) counts.set(n.created, (counts.get(n.created) || 0) + 1);
    }

    // Walk the grid column-major (week by week) so cells stay date-ordered & deterministic.
    const dates = [];
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) dates.push(addDays(firstSun, w * 7 + d));
    }
    const cellCounts = dates.map((d) => counts.get(d) || 0);
    const levels = heatLevels(cellCounts, 4);
    const cells = dates.map((date, i) => ({ date, count: cellCounts[i], level: levels[i] }));
    const total = cellCounts.reduce((a, b) => a + b, 0);

    const data = { weeks, cells };

    // Render: 7 rows (one per weekday), each row a strip of weekly glyphs.
    const lines = [`# heatmap — ${weeks}w (${firstSun}..${lastSat}) · total ${total}`];
    for (let d = 0; d < 7; d++) {
      let row = `${WEEKDAYS[d]} `;
      for (let w = 0; w < weeks; w++) row += heatGlyph(levels[w * 7 + d]);
      lines.push(row);
    }
    const legend = [0, 1, 2, 3, 4].map((l) => heatGlyph(l)).join('');
    lines.push(dim(`less ${legend} more`));

    return { ok: true, lines, data };
  },
};
