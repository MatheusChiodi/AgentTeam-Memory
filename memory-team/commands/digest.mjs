// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// digest — session summary: notes in a time window, grouped by agent and by type.
// Mirrors timeline/stats (collectNotes + --since/--all/--json). With --save it
// persists the *rendered markdown* as a `memory` note (tag `digest`): we delegate
// creation to `save` (canonical naming/destination/dedup/frontmatter) — same pattern
// as `template` — then rewrite the body with the real digest via formatNote, so the
// saved note carries the summary, not save's generic placeholder. Source notes are
// wired in through `related` wikilinks.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { collectNotes, readNote, formatNote } from '../notes.mjs';
import { today } from '../lib.mjs';
import save from './save.mjs';

const bump = (o, k) => { if (k) o[k] = (o[k] || 0) + 1; };

/** A note's effective date for windowing: `created`, else the mtime day (fallback). */
function noteDate(n) {
  if (n.created) return n.created;
  if (n.mtime) {
    const d = new Date(n.mtime);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return '';
}

/** The human title of a note: first `# heading` of the body, else the basename. */
function noteTitle(n) {
  const m = /^#\s+(.+?)\s*$/m.exec(n.body || '');
  return m ? m[1].trim() : n.name;
}

/** A navigable, readable bullet: `[[name|título]] — summary` (alias = real title). */
function bullet(n) {
  const title = noteTitle(n);
  const link = title && title !== n.name ? `[[${n.name}|${title}]]` : `[[${n.name}]]`;
  return `- ${link} — ${n.fm.summary || ''}`.trimEnd();
}

/** Group notes into a { key: [notes] } map, preserving insertion order. */
function groupBy(notes, pick) {
  const groups = new Map();
  for (const n of notes) {
    const k = pick(n) || 'unknown';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(n);
  }
  return groups;
}

/** Stable order: most populated group first, ties broken alphabetically. */
function sortedGroups(groups) {
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
}

/** Render the digest markdown (the body of a --save note, sans frontmatter). */
function renderMarkdown(notes, { where, since }) {
  const lines = [`# digest — ${where} — since ${since}`, '', `total: ${notes.length}`, ''];
  if (!notes.length) {
    lines.push('nenhuma nota na janela.');
    return lines;
  }
  lines.push('## by agent', '');
  for (const [agent, arr] of sortedGroups(groupBy(notes, (n) => n.fm.agent))) {
    lines.push(`### ${agent} (${arr.length})`);
    for (const n of arr) lines.push(bullet(n));
    lines.push('');
  }
  lines.push('## by type', '');
  for (const [type, arr] of sortedGroups(groupBy(notes, (n) => n.fm.type))) {
    lines.push(`### ${type} (${arr.length})`);
    for (const n of arr) lines.push(bullet(n));
    lines.push('');
  }
  return lines;
}

/**
 * Persist the digest as a `memory` note. Delegates creation to `save` (so naming,
 * destination, dedup and frontmatter stay canonical — the same pattern `template`
 * uses), then rewrites only the body with the real digest markdown via formatNote.
 */
function persist(ctx, { since, markdown, notes, byAgent }) {
  const { ROOT, PROJECT, opt } = ctx;
  const now = new Date();
  const stamp = `${now.getHours()}`.padStart(2, '0') + `${now.getMinutes()}`.padStart(2, '0');
  const title = `Digest ${since}${ctx.all ? ' (all)' : ''} ${stamp}`;
  const summary = notes.length
    ? `Digest desde ${since}: ${notes.length} nota(s) — ${Object.keys(byAgent).join(', ')}.`
    : `Digest desde ${since}: nenhuma nota na janela.`;

  const saved = save.run({
    ROOT,
    PROJECT,
    pos: ['memory', title],
    opt: {
      agent: opt.agent || 'digest',
      summary,
      tags: 'digest',
      // Source notes as wikilinks; save normalizes each into the canonical "[[name]]".
      related: notes.map((n) => n.name).join(','),
      task: opt.task,
    },
  });
  if (!saved.ok || !saved.data || !saved.data.file) return saved.data || null;

  // Rewrite only the body with the real digest, preserving save's frontmatter.
  const file = join(ROOT, saved.data.file);
  const note = readNote(file, ROOT);
  writeFileSync(file, formatNote(note.fm, markdown.join('\n')), 'utf8');
  return { file: saved.data.file, type: 'memory', created: true };
}

export default {
  name: 'digest',
  summary: 'Markdown summary of a time window, grouped by agent and type (--since, --save, --json)',
  usage: 'digest [--since YYYY-MM-DD] [--all] [--save] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const since = typeof opt.since === 'string' ? opt.since : today();

    // Window by effective date (created, else mtime day) so freshly-saved notes
    // without a `created` frontmatter still surface in a session digest.
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT })
      .map((n) => ({ ...n, _date: noteDate(n) }))
      .filter((n) => n._date && n._date >= since)
      .sort((a, b) => (b._date.localeCompare(a._date)) || a.name.localeCompare(b.name));

    const byAgent = {};
    const byType = {};
    for (const n of notes) {
      bump(byAgent, n.fm.agent || 'unknown');
      bump(byType, n.fm.type || 'untyped');
    }

    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const markdown = renderMarkdown(notes, { where, since });

    const data = {
      since,
      total: notes.length,
      byAgent,
      byType,
      notes: notes.map((n) => ({
        name: n.name,
        type: n.fm.type || null,
        agent: n.fm.agent || null,
        summary: n.fm.summary || null,
        created: n._date || null,
      })),
    };

    const lines = [...markdown];
    if (opt.save === true) {
      const saved = persist(ctx, { since, markdown, notes, byAgent });
      data.saved = saved;
      lines.push('', `saved: ${saved.file}`);
    }

    return { ok: true, lines, data };
  },
};
