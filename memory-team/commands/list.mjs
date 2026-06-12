// list — enumerate notes with optional filters, newest first.
import { collectNotes, relOf } from '../notes.mjs';

/** Project/agent/type/tag/since filters; returns notes sorted by `created` desc. */
function filterNotes(notes, { type, tag, agent, project, since }) {
  return notes.filter((n) => {
    if (type && (n.fm.type || '').toLowerCase() !== String(type).toLowerCase()) return false;
    if (agent && (n.fm.agent || '').toLowerCase() !== String(agent).toLowerCase()) return false;
    if (project && (n.fm.project || '').toLowerCase() !== String(project).toLowerCase()) return false;
    if (tag && !n.tags.some((t) => t.toLowerCase() === String(tag).toLowerCase())) return false;
    if (since && (n.created || '') < String(since)) return false;
    return true;
  });
}

/** Shared rendering for list/recent: one bullet per note, optional tag line. */
export function renderNotes(ROOT, notes) {
  const data = notes.map((n) => ({
    name: n.name,
    type: n.fm.type || null,
    project: n.fm.project || null,
    agent: n.fm.agent || null,
    summary: n.fm.summary || null,
    tags: n.tags,
    file: relOf(ROOT, n.file),
    created: n.created || null,
  }));
  const lines = [];
  for (const n of notes) {
    lines.push(`- [[${n.name}]]  (${n.fm.type || '?'} · ${n.fm.project || '?'} · ${n.fm.agent || '?'})`);
    if (n.fm.summary) lines.push(`    summary: ${n.fm.summary}`);
    if (n.tags.length) lines.push(`    tags: ${n.tags.join(', ')}`);
  }
  return { lines, data };
}

export default {
  name: 'list',
  summary: 'List notes with filters (--type/--tag/--agent/--project/--since/--limit/--archived)',
  usage: 'list [--type t] [--tag x] [--agent a] [--project p] [--since YYYY-MM-DD] [--limit n] [--archived] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const archived = opt.archived === true;
    const collected = collectNotes(ROOT, ctx.all
      ? { all: true, includeArchive: archived }
      : { project: PROJECT, includeArchive: archived });

    let notes = filterNotes(collected, {
      type: opt.type, tag: opt.tag, agent: opt.agent, project: opt.project, since: opt.since,
    });
    notes.sort((a, b) => (b.created || '').localeCompare(a.created || '') || b.mtime - a.mtime);

    const limit = Number(opt.limit);
    if (Number.isFinite(limit) && limit > 0) notes = notes.slice(0, limit);

    const { lines, data } = renderNotes(ROOT, notes);
    if (!notes.length) {
      return { ok: true, lines: ['(no notes match)'], data };
    }
    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    return { ok: true, lines: [`# ${notes.length} note(s) in ${where}`, '', ...lines], data };
  },
};
