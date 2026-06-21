// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// changelog (F39) — generate a markdown changelog from decision/learning notes, grouped by
// created date (descending), each entry badged by type ([decision]/[learning]). `--since`
// filters by created>=since; `--save` persists as a `memory` note (tag changelog). Determinism:
// the save date falls back to opt.today→today() so tests can pin it. Read-only without --save.
import { collectNotes, saveNote } from '../notes.mjs';
import { today } from '../lib.mjs';

const BADGE = { decision: '[decision]', learning: '[learning]' };

export default {
  name: 'changelog',
  summary: 'Markdown changelog from decision/learning notes, grouped by date',
  usage: 'changelog [--since YYYY-MM-DD] [--save] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const since = typeof opt.since === 'string' ? opt.since : null;

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope).filter(
      (n) => n.fm.type === 'decision' || n.fm.type === 'learning',
    );

    const entries = notes
      .filter((n) => !since || (n.created && n.created >= since))
      .map((n) => ({
        date: n.created || '',
        type: n.fm.type,
        title: n.name,
        summary: n.fm.summary || '',
      }))
      // Newest first; ties by title for a stable order.
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

    const data = { since, entries };

    // Build the markdown body once (reused by terminal output and --save).
    const md = [];
    if (!entries.length) {
      md.push('# changelog', '', '(nothing in the window)');
    } else {
      md.push('# changelog', '');
      let curDate = null;
      for (const e of entries) {
        if (e.date !== curDate) {
          if (curDate !== null) md.push('');
          md.push(`## ${e.date || '(no date)'}`);
          curDate = e.date;
        }
        const badge = BADGE[e.type] || `[${e.type}]`;
        md.push(`- ${badge} **${e.title}** — ${e.summary}`);
      }
    }

    if (opt.save === true) {
      const { file } = saveNote(ROOT, PROJECT, {
        type: 'memory',
        title: 'changelog',
        summary: 'Changelog of decisions and learnings',
        tags: ['changelog'],
        agent: 'changelog',
        body: md.join('\n'),
        created: typeof opt.today === 'string' ? opt.today : today(),
      });
      return { ok: true, lines: [`saved changelog → ${file}`, ...md], data: { ...data, file } };
    }

    return { ok: true, lines: md, data };
  },
};
