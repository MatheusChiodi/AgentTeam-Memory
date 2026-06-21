// recap — an ultra-compact session recap in minimal tokens (F30/US-057). Complements
// `digest` (verbose) with dense bullets grouped by type, capped at --max, prioritizing
// high-signal types (decision/state) over noise (communication). Reports how many notes
// the cap left out so the agent knows the recap is partial.
//   recap [--since YYYY-MM-DD] [--max N] [--json] [--today YYYY-MM-DD]
// `--today` is injectable so tests are deterministic without reading the real clock.
import { collectNotes } from '../notes.mjs';
import { today } from '../lib.mjs';

const DEFAULT_MAX = 12;

// Signal ranking: decisions and states first (durable, high-value), then memory/learning,
// communication last (chatter). Lower number = shown first when the --max cap bites.
const TYPE_RANK = { decision: 0, state: 1, learning: 2, memory: 3, communication: 4 };
const rankOf = (t) => (t in TYPE_RANK ? TYPE_RANK[t] : 3);

/** A note's effective date for windowing: `created` else the mtime day. */
function noteDate(n) {
  if (n.created) return n.created;
  if (n.mtime) {
    const d = new Date(n.mtime);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return '';
}

/** A dense bullet: `type: title` plus a short summary if one exists. */
function bullet(n) {
  const type = n.fm.type || 'note';
  const head = `${type}: ${n.name}`;
  return n.fm.summary ? `- ${head} — ${n.fm.summary}` : `- ${head}`;
}

export default {
  name: 'recap',
  summary: 'Ultra-compact recap of a window, dense bullets by type, capped at --max',
  usage: 'recap [--since YYYY-MM-DD] [--max N] [--json] [--today YYYY-MM-DD]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const now = typeof opt.today === 'string' ? opt.today : today();
    const since = typeof opt.since === 'string' ? opt.since : now;
    const maxRaw = parseInt(opt.max, 10);
    const max = Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : DEFAULT_MAX;

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    // Collect the window, then order by signal rank, recency, name (deterministic).
    const inWindow = collectNotes(ROOT, scope)
      .map((n) => ({ ...n, _date: noteDate(n) }))
      .filter((n) => n._date && n._date >= since)
      .sort((a, b) => rankOf(a.fm.type) - rankOf(b.fm.type)
        || b._date.localeCompare(a._date) || a.name.localeCompare(b.name));

    const total = inWindow.length;
    const shown = inWindow.slice(0, max);
    const bullets = shown.map(bullet);
    const data = { since, total, shown: shown.length, bullets };

    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    if (!total) {
      // Empty window is a valid recap, exit 0 — the agent learns "nothing happened".
      return {
        ok: true,
        lines: [`# recap — ${where} — since ${since}`, '', 'nothing in the window.'],
        data,
      };
    }
    const lines = [`# recap — ${where} — since ${since} — ${shown.length}/${total}`, '', ...bullets];
    if (total > shown.length) lines.push('', `(+${total - shown.length} more left out)`);
    return { ok: true, lines, data };
  },
};
