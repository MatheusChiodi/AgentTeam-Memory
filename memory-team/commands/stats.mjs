// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// stats — aggregate counts over the vault (totals, by type/agent/project, top tags).
import { collectNotes, tagHistogram } from '../notes.mjs';

const bump = (o, k) => { if (k) o[k] = (o[k] || 0) + 1; };

export default {
  name: 'stats',
  summary: 'Aggregate vault stats: totals, byType/byAgent/byProject, top tags, oldest/newest',
  usage: 'stats [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    const byType = {};
    const byAgent = {};
    const byProject = {};
    let oldest = null;
    let newest = null;
    for (const n of notes) {
      bump(byType, n.fm.type || 'untyped');
      bump(byAgent, n.fm.agent || 'unknown');
      bump(byProject, n.fm.project || 'unknown');
      if (n.created) {
        if (!oldest || n.created < oldest) oldest = n.created;
        if (!newest || n.created > newest) newest = n.created;
      }
    }
    const topTags = tagHistogram(notes).slice(0, 10);
    const data = {
      total: notes.length, byType, byAgent, byProject, topTags, oldest, newest,
    };

    const where = ctx.all ? 'all projects + global' : `${PROJECT} + global`;
    const dump = (label, obj) => Object.entries(obj)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, v]) => `    ${k}: ${v}`);
    const lines = [`# stats — ${where}`, `total: ${notes.length}`];
    if (notes.length) {
      lines.push('', 'by type:', ...dump('type', byType));
      lines.push('', 'by agent:', ...dump('agent', byAgent));
      lines.push('', 'by project:', ...dump('project', byProject));
      lines.push('', 'top tags:', ...topTags.map(([t, c]) => `    ${t}: ${c}`));
      lines.push('', `oldest: ${oldest || '-'}`, `newest: ${newest || '-'}`);
    }
    return { ok: true, lines, data };
  },
};
