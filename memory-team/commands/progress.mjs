// progress (F38) — objective completion metrics across the vault: checkbox done/total,
// how many `plan` notes are fully checked, and how many blockers are open. Shares the single
// checkbox extractor (extractCheckboxes) with todo/handoff so the counts never drift, and the
// risk predicate spirit with `blockers` (duplicated minimally here to stay self-contained).
// Read-only. Bars are painted by severity via paintPct.
import { collectNotes } from '../notes.mjs';
import { extractCheckboxes } from '../analyze.mjs';
import { bar, paintPct } from '../render.mjs';

// Minimal local copy of the blockers predicate (risk tags OR body markers — mirrors the
// `blockers` tool's selection). Kept local so progress has no cross-command dependency.
const RISK_TAGS = new Set(['blocker', 'risk', 'blocked']);
const BODY_MARKERS = ['blocked', 'blocker', 'risco', '⚠'];
function isBlocker(note) {
  for (const t of note.tags) if (RISK_TAGS.has(String(t).toLowerCase())) return true;
  const body = String(note.body || '').toLowerCase();
  return BODY_MARKERS.some((m) => body.includes(m));
}

function hasTag(note, tag) {
  return note.tags.some((t) => String(t).toLowerCase() === tag);
}

export default {
  name: 'progress',
  summary: 'Completion metrics: checkboxes, completed plans, open blockers',
  usage: 'progress [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope);

    let done = 0;
    let total = 0;
    let plansTotal = 0;
    let plansComplete = 0;
    let blockers = 0;

    for (const n of notes) {
      const boxes = extractCheckboxes(n.body);
      done += boxes.filter((b) => b.checked).length;
      total += boxes.length;

      if (hasTag(n, 'plan')) {
        plansTotal++;
        // A plan is "complete" when it has at least one checkbox and all are checked.
        if (boxes.length && boxes.every((b) => b.checked)) plansComplete++;
      }
      if (isBlocker(n)) blockers++;
    }

    // Guard the only division in the tool.
    const pct = total ? Math.round((done / total) * 100) : 0;
    const data = {
      checkboxes: { done, total, pct },
      plans: { total: plansTotal, complete: plansComplete },
      blockers,
    };

    const lines = [
      '# progresso',
      '',
      `checkboxes  ${paintPct(bar(pct), pct)} ${pct}%  (${done}/${total})`,
      `planos      ${plansComplete}/${plansTotal} completos`,
      `bloqueios   ${blockers} aberto(s)`,
    ];
    return { ok: true, lines, data };
  },
};
