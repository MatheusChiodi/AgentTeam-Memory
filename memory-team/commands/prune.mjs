// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// prune — find notes whose body is empty or still the save template placeholder.
// Dry-run by default (just lists); --apply moves candidates into the project _archive.
import { renameSync } from 'node:fs';
import { join, basename } from 'node:path';
import { collectNotes } from '../notes.mjs';
import { partition, ensure } from '../lib.mjs';

// A body counts as "prunable" when, after stripping the leading `# Title` line,
// nothing of substance remains — i.e. it is empty or still the template boilerplate.
function isPrunable(note) {
  let body = String(note.body || '')
    .replace(/^\s*#.*$/m, '') // drop the first heading line
    .trim();
  if (!body) return true;
  if (body.includes('(objective content')) return true;
  return false;
}

export default {
  name: 'prune',
  summary: 'Find empty/placeholder notes; --apply archives them (dry-run by default)',
  usage: 'prune [--apply] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const apply = opt.apply === true;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    const candidates = notes.filter(isPrunable);
    let movedCount = 0;
    if (apply) {
      for (const n of candidates) {
        const proj = n.fm.project && n.fm.project !== 'global' ? n.fm.project : PROJECT;
        const archive = join(partition(ROOT, proj).base, '_archive');
        ensure(archive);
        try {
          renameSync(n.file, join(archive, basename(n.file)));
          movedCount += 1;
        } catch { /* skip files we can't move */ }
      }
    }

    const data = { candidates: candidates.map((n) => n.name), applied: apply, movedCount };
    const lines = [];
    if (!candidates.length) lines.push('nothing to prune');
    else {
      lines.push(`# ${candidates.length} prunable note(s)${apply ? ` — archived ${movedCount}` : ' (dry-run; pass --apply to archive)'}`, '');
      for (const n of candidates) lines.push(`- [[${n.name}]]`);
    }
    return { ok: true, lines, data };
  },
};
