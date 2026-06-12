// search — rank notes for a term/tag across the current project + global (or --all).
import { collectNotes, relOf } from '../notes.mjs';

function scoreNote(n, t) {
  let score = 0;
  if (n.tags.some((x) => x.toLowerCase().includes(t))) score += 5;
  if ((n.fm.summary || '').toLowerCase().includes(t)) score += 4;
  if (n.name.toLowerCase().includes(t)) score += 3;
  if ((n.fm.type || '').toLowerCase() === t) score += 3;
  if ((n.fm.agent || '').toLowerCase().includes(t)) score += 2;
  if (n.body.toLowerCase().includes(t)) score += 1;
  return score;
}

export default {
  name: 'search',
  summary: 'Rank notes for a term/tag (current project + global; --all = every project)',
  usage: 'search <term|tag> [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const term = ctx.pos.join(' ').trim();
    if (!term) return { ok: false, code: 1, lines: ['usage: search <term|tag> [--all]'] };
    const t = term.toLowerCase();

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const res = [];
    for (const n of notes) {
      const score = scoreNote(n, t);
      if (score > 0) res.push({ ...n, score });
    }
    res.sort((a, b) => b.score - a.score);

    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const data = res.map((r) => ({
      name: r.name, type: r.fm.type || null, project: r.fm.project || null,
      agent: r.fm.agent || null, summary: r.fm.summary || null, tags: r.tags,
      file: relOf(ROOT, r.file), score: r.score,
    }));

    if (!res.length) return { ok: true, lines: [`(no notes for "${term}" in ${where})`], data };

    const lines = [`# ${res.length} note(s) for "${term}" in ${where}`, ''];
    for (const r of res) {
      lines.push(`- [[${r.name}]]  (${r.fm.type || '?'} · ${r.fm.project || '?'} · ${r.fm.agent || '?'})`);
      if (r.fm.summary) lines.push(`    summary: ${r.fm.summary}`);
      if (r.tags.length) lines.push(`    tags: ${r.tags.join(', ')}`);
      lines.push(`    file: ${relOf(ROOT, r.file)}`);
    }
    return { ok: true, lines, data };
  },
};
