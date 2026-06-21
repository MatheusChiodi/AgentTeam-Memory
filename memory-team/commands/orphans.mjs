// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// orphans — notes with no inbound and no outbound wikilinks (fully disconnected).
import { collectNotes, wikilinksOf, relOf } from '../notes.mjs';

export default {
  name: 'orphans',
  summary: 'List notes with no inbound and no outbound links',
  usage: 'orphans [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    // Names referenced by at least one note (resolved targets only).
    const byName = new Map(notes.map((n) => [n.name.toLowerCase(), n.name]));
    const linkedTo = new Set();
    const outgoing = new Map(); // note name -> count of resolved outgoing links
    for (const n of notes) {
      let out = 0;
      for (const link of wikilinksOf(n)) {
        const to = byName.get(link.toLowerCase());
        if (!to || to === n.name) continue;
        linkedTo.add(to.toLowerCase());
        out += 1;
      }
      outgoing.set(n.name.toLowerCase(), out);
    }

    const orphans = notes.filter((n) => {
      const key = n.name.toLowerCase();
      return (outgoing.get(key) || 0) === 0 && !linkedTo.has(key);
    });

    const data = orphans.map((n) => ({
      name: n.name, summary: n.fm.summary || null, file: relOf(ROOT, n.file),
    }));
    if (!orphans.length) return { ok: true, lines: ['(no orphan notes — everything is connected)'], data };

    const lines = [`# ${orphans.length} orphan note(s)`, ''];
    for (const n of orphans) lines.push(`- [[${n.name}]]  (${relOf(ROOT, n.file)})`);
    return { ok: true, lines, data };
  },
};
