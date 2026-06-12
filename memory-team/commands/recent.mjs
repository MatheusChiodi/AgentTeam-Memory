// recent — the N most recently created notes (mtime as tie-breaker).
import { collectNotes } from '../notes.mjs';
import { renderNotes } from './list.mjs';

export default {
  name: 'recent',
  summary: 'Show the N most recent notes (default 10)',
  usage: 'recent [n] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const n = Number(ctx.pos[0]);
    const limit = Number.isFinite(n) && n > 0 ? n : 10;

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    notes.sort((a, b) => (b.created || '').localeCompare(a.created || '') || b.mtime - a.mtime);
    const top = notes.slice(0, limit);

    const { lines, data } = renderNotes(ROOT, top);
    if (!top.length) return { ok: true, lines: ['(no notes yet)'], data };
    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    void opt;
    return { ok: true, lines: [`# ${top.length} most recent in ${where}`, '', ...lines], data };
  },
};
