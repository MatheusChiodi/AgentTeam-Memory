// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// tree (F23) — the vault as a directory-like tree: project → type → note (or `--by
// agent`). Connectors come from treeLines; each type carries a glyph and each leaf shows
// `name — short summary`. `--depth N` clamps how deep we descend; `--all` spans every
// project; `--json` returns the nested tree as data.
import { collectNotes } from '../notes.mjs';
import { treeLines, truncate, dim } from '../render.mjs';

const TYPE_GLYPH = {
  memory: '◆', decision: '★', learning: '✎', communication: '✉', state: '◉',
};
const glyphFor = (type) => TYPE_GLYPH[type] || '•';

export default {
  name: 'tree',
  summary: 'Vault as a tree: project → type → note (or --by agent), with type glyphs',
  usage: 'tree [--by type|agent] [--depth N] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const by = opt.by === 'agent' ? 'agent' : 'type';
    // depth counts visible levels (1=projects, 2=groups, 3=leaves). 0/absent → unbounded.
    const depth = Math.max(0, parseInt(opt.depth, 10) || 0);
    const within = (level) => depth === 0 || level <= depth;

    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    // project → groupKey → [notes]
    const byProject = new Map();
    for (const n of notes) {
      const proj = n.fm.project || PROJECT;
      const key = by === 'agent' ? (n.fm.agent || 'unknown') : (n.fm.type || 'untyped');
      if (!byProject.has(proj)) byProject.set(proj, new Map());
      const groups = byProject.get(proj);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(n);
    }

    // Build both the render nodes (treeLines) and the JSON tree from the same structure.
    const nodes = [];
    const jsonTree = [];
    for (const proj of [...byProject.keys()].sort()) {
      const groups = byProject.get(proj);
      const projChildren = [];
      const projJson = { label: proj, children: [] };
      for (const key of [...groups.keys()].sort()) {
        const items = groups.get(key)
          .sort((a, b) => a.name.localeCompare(b.name));
        const glyph = by === 'type' ? `${glyphFor(key)} ` : '';
        const groupNode = { label: `${glyph}${key} (${items.length})`, children: [] };
        const groupJson = { label: key, count: items.length, children: [] };
        if (within(3)) {
          for (const n of items) {
            const summary = truncate(n.fm.summary || '', 50);
            groupNode.children.push({ label: summary ? `${n.name} ${dim(`— ${summary}`)}` : n.name });
            groupJson.children.push({ label: n.name, summary: n.fm.summary || '' });
          }
        }
        if (within(2)) {
          projChildren.push(groupNode);
          projJson.children.push(groupJson);
        }
      }
      if (within(1)) {
        nodes.push({ label: proj, children: projChildren });
        jsonTree.push(projJson);
      }
    }

    const data = { by, tree: jsonTree };
    if (!notes.length) {
      return { ok: true, lines: ['(empty vault — no notes)'], data };
    }
    return { ok: true, lines: treeLines(nodes), data };
  },
};
