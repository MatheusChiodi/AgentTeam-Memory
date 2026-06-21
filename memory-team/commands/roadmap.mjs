// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// roadmap — turn `decision` notes into a timeline grouped by month, to communicate
// the project's direction. Collects type:decision (+ learning with --include
// learning), sorts by created, groups by YYYY-MM, emits markdown `## YYYY-MM` with
// `title — summary` bullets. `--save` persists it as a memory note (tag `roadmap`).
import { collectNotes, saveNote } from '../notes.mjs';

export default {
  name: 'roadmap',
  summary: 'Timeline of decisions (and optionally learnings) grouped by month',
  usage: 'roadmap [--include learning] [--save] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const includeLearning = opt.include === 'learning';
    const wanted = new Set(['decision', ...(includeLearning ? ['learning'] : [])]);

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope)
      .filter((n) => wanted.has(n.fm.type || '') && n.created)
      .sort((a, b) => (a.created || '').localeCompare(b.created || '') || a.name.localeCompare(b.name));

    // Group by YYYY-MM (first 7 chars of the created date).
    const groups = new Map();
    for (const n of notes) {
      const month = String(n.created).slice(0, 7);
      if (!groups.has(month)) groups.set(month, []);
      groups.get(month).push({
        name: n.name, title: n.name, summary: n.fm.summary || '', type: n.fm.type || 'decision',
      });
    }
    const months = [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, items]) => ({ month, items }));
    const data = { months };

    const body = [];
    if (!months.length) body.push('(no decisions)');
    for (const { month, items } of months) {
      body.push(`## ${month}`);
      for (const it of items) body.push(`- ${it.title} — ${it.summary}`.trimEnd());
      body.push('');
    }

    if (opt.save === true) {
      const related = months.flatMap((m) => m.items.map((it) => `[[${it.name}]]`));
      const { file } = saveNote(ROOT, PROJECT, {
        type: 'memory',
        title: 'Roadmap',
        summary: 'Roadmap of decisions by month.',
        tags: ['roadmap'],
        related,
        agent: opt.agent || 'unknown',
        body: body.join('\n'),
      });
      data.path = file;
      return { ok: true, lines: [`# roadmap saved (${file})`, '', ...body], data };
    }

    return { ok: true, lines: ['# Roadmap', '', ...body], data };
  },
};
