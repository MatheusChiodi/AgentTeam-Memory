// brief — a budgeted context-pack to seed an agent (F26/US-053). The point is token
// economy: instead of making the LLM scan the whole vault, we distill it LOCALLY here
// (rank + estimate + fill) and hand the agent a pack that already fits a token budget.
// Selection priority: pins → relevance to <query> (if any) → recency. Each note renders
// as `título — summary` (body appended with --full). budgetFill never exceeds the budget:
// the first note that would overflow is dropped whole (and the rest), never truncated.
import { collectNotes, isPinned } from '../notes.mjs';
import { estimateTokens, scoreByQuery, budgetFill } from '../analyze.mjs';

const DEFAULT_BUDGET = 1500;

/** The renderable text for a candidate: `título — summary`, plus body when --full. */
function renderNote(note, full) {
  const head = `## ${note.name}${note.fm.summary ? ` — ${note.fm.summary}` : ''}`;
  if (full && note.body) {
    // Strip a leading `# heading` (redundant with the head line) and trim edges.
    const body = String(note.body).replace(/^\s*#\s+.*$/m, '').trim();
    return body ? `${head}\n${body}` : head;
  }
  return head;
}

export default {
  name: 'brief',
  summary: 'Budgeted context-pack (pins + query-relevant + recent) under a token budget',
  usage: 'brief [<query>...] [--budget N] [--full] [--json] [--all]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const query = ctx.pos.join(' ').trim();
    const full = opt.full === true;
    const budget = Math.max(0, parseInt(opt.budget, 10) || DEFAULT_BUDGET);

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope);

    // Ordering: pins first; then, when a query is present, by relevance desc; finally by
    // recency (created day, mtime tie-break). A stable name tie-break keeps it deterministic.
    const scoreOf = query ? (n) => scoreByQuery(n, query) : () => 0;
    const ordered = notes.slice().sort((a, b) => {
      const pin = Number(isPinned(b)) - Number(isPinned(a));
      if (pin) return pin;
      if (query) {
        const s = scoreOf(b) - scoreOf(a);
        if (s) return s;
      }
      const rec = (b.created || '').localeCompare(a.created || '') || (b.mtime - a.mtime);
      return rec || a.name.localeCompare(b.name);
    });

    // Pre-render each note so the token estimate matches exactly what ends up in the pack.
    const rendered = ordered.map((n) => ({ name: n.name, text: renderNote(n, full) }));
    const { included, dropped, used } = budgetFill(rendered, (r) => estimateTokens(r.text), budget);

    const data = {
      budget,
      usedTokens: used,
      notes: included.map((i) => ({ name: i.item.name, tokens: i.tokens })),
      dropped: dropped.map((r) => r.name),
    };

    if (!included.length) {
      // Empty vault (or budget too small for even the first note) → an explicit empty pack.
      const lines = [`# brief — 0/${budget} tokens`];
      if (dropped.length) lines.push('', `(dropped ${dropped.length}: nothing fit the budget)`);
      else lines.push('', '(no notes)');
      return { ok: true, lines, data };
    }

    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const lines = [`# brief — ${where} — ${used}/${budget} tokens`, ''];
    for (const inc of included) lines.push(inc.item.text, '');
    if (dropped.length) lines.push(`(dropped ${dropped.length}: ${dropped.map((r) => r.name).join(', ')})`);
    return { ok: true, lines, data };
  },
};
