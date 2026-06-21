// dashboard (F22) — a compact ANSI panel summarizing the vault: counts by type/agent
// (mini histograms), the most-recent notes, pin count and orphan count (notes with no
// outgoing [[wikilinks]]). One screen instead of five commands. Colors degrade to plain
// text under NO_COLOR/TERM=dumb (handled inside render.mjs).
import { collectNotes, wikilinksOf, isPinned } from '../notes.mjs';
import { isEnabled } from '../lib.mjs';
import { box, bar, dim } from '../render.mjs';

const RECENT_N = 5;
const bump = (o, k) => { if (k) o[k] = (o[k] || 0) + 1; };

/** Sort a count map into [key, n][] desc, then render `key  [bar] n` lines. */
function histogram(counts, total) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const width = Math.max(0, ...entries.map(([k]) => k.length));
  return entries.map(([k, n]) => {
    const pct = total ? (n / total) * 100 : 0;
    return `${k.padEnd(width)}  ${bar(pct, 8)} ${n}`;
  });
}

export default {
  name: 'dashboard',
  summary: 'Compact ANSI panel: counts by type/agent, recent notes, pins, orphans',
  usage: 'dashboard [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const enabled = isEnabled();

    const byType = {};
    const byAgent = {};
    let pins = 0;
    let orphans = 0;
    for (const n of notes) {
      bump(byType, n.fm.type || 'untyped');
      bump(byAgent, n.fm.agent || 'unknown');
      if (isPinned(n)) pins++;
      if (!wikilinksOf(n).length) orphans++;
    }

    // Recency: created (date) desc, then mtime as a stable tiebreaker.
    const recent = [...notes]
      .sort((a, b) => (b.created || '').localeCompare(a.created || '') || b.mtime - a.mtime)
      .slice(0, RECENT_N)
      .map((n) => ({ name: n.name, type: n.fm.type || 'untyped', created: n.created || '' }));

    const data = {
      project: PROJECT,
      enabled,
      total: notes.length,
      byType,
      byAgent,
      recent,
      pins,
      orphans,
    };

    const scope = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const head = box('dashboard', [
      `scope:   ${scope}`,
      `enabled: ${enabled ? 'yes' : 'no'}`,
      `total:   ${notes.length}`,
      `pins:    ${pins}`,
      `orphans: ${orphans}`,
    ]);
    const types = box('by type', byType && Object.keys(byType).length
      ? histogram(byType, notes.length) : [dim('(none)')]);
    const agents = box('by agent', Object.keys(byAgent).length
      ? histogram(byAgent, notes.length) : [dim('(none)')]);
    const recentBox = box('recent', recent.length
      ? recent.map((r) => `${r.created || '------'}  ${r.type}: ${r.name}`) : [dim('(none)')]);

    const lines = [...head, ...types, ...agents, ...recentBox];
    return { ok: true, lines, data };
  },
};
