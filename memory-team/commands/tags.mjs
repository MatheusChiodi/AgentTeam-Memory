// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// tags — frequency histogram of tags across the project (or every project with --all).
import { collectNotes, tagHistogram } from '../notes.mjs';

export default {
  name: 'tags',
  summary: 'Show tag frequency across the project (--all = every project)',
  usage: 'tags [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });
    const hist = tagHistogram(notes);

    const data = hist.map(([tag, count]) => ({ tag, count }));
    if (!hist.length) return { ok: true, lines: ['(no tags yet)'], data };

    const lines = hist.map(([tag, count]) => `- ${tag} (${count})`);
    return { ok: true, lines, data };
  },
};
