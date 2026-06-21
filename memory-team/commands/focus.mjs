// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// focus — budgeted retrieval for a query (F28/US-055). Like brief, but query-first:
// rank every note by scoreByQuery desc (drop score 0 — pure noise), then fill by token
// budget. --top caps the count, --budget caps tokens; whichever limit hits first wins.
// The win over brief is signal density: you get ONLY the notes worth the agent's context.
import { collectNotes } from '../notes.mjs';
import { estimateTokens, scoreByQuery, budgetFill } from '../analyze.mjs';
import { fail } from './_ctx.mjs';

const DEFAULT_BUDGET = 1500;

/** Same per-note token cost as `tokens`: title + summary + body. Keeps estimates aligned. */
function noteTokens(note) {
  return estimateTokens(`${note.name}\n${note.fm.summary || ''}\n${note.body || ''}`);
}

export default {
  name: 'focus',
  summary: 'Rank notes by query relevance and return those that fit a token budget',
  usage: 'focus <query>... [--top N] [--budget N] [--json] [--all]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const query = ctx.pos.join(' ').trim();
    if (!query) return fail('usage: focus <query> [--top N] [--budget N] [--json]');

    // Distinguish absent/invalid (→ default) from a legitimate 0 (→ empty) for both caps,
    // so `--budget 0` and `--top 0` mean "nothing", not "the default / no cap" (B1 fix).
    const bn = parseInt(opt.budget, 10);
    const budget = Math.max(0, Number.isFinite(bn) ? bn : DEFAULT_BUDGET);
    const top = parseInt(opt.top, 10);
    const cap = Number.isFinite(top) && top >= 0 ? top : Infinity;

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    // Score, drop zeros (irrelevant), rank by score desc with a stable name tie-break.
    const ranked = collectNotes(ROOT, scope)
      .map((n) => ({ name: n.name, score: scoreByQuery(n, query), tokens: noteTokens(n) }))
      .filter((n) => n.score > 0)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

    // --top first (count cap), then budgetFill (token cap) on the survivors — both compose.
    const capped = ranked.slice(0, cap === Infinity ? ranked.length : cap);
    const { included } = budgetFill(capped, (n) => n.tokens, budget);
    const data = included.map((i) => ({ name: i.item.name, score: i.item.score, tokens: i.tokens }));

    if (!data.length) {
      return { ok: true, lines: [`(no notes match "${query}")`], data };
    }
    const used = data.reduce((a, n) => a + n.tokens, 0);
    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const lines = [`# focus "${query}" — ${where} — ${data.length} note(s), ${used}/${budget} tokens`, ''];
    for (const n of data) lines.push(`- ${n.name}  (score ${n.score}, ${n.tokens} tok)`);
    return { ok: true, lines, data };
  },
};
