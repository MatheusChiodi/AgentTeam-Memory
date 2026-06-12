// validate — lint every note's frontmatter; exits 1 when any note has a problem.
import { collectNotes } from '../notes.mjs';
import { TYPES } from '../lib.mjs';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function lint(note) {
  const problems = [];
  const type = note.fm.type;
  if (!type) problems.push('missing type');
  else if (!TYPES.includes(type)) problems.push(`invalid type "${type}" (use: ${TYPES.join(' | ')})`);
  if (!note.fm.summary || !String(note.fm.summary).trim()) problems.push('empty summary');
  if (!note.fm.created) problems.push('missing created');
  else if (!DATE_RE.test(String(note.fm.created))) problems.push(`malformed created "${note.fm.created}"`);
  if (!note.fm.agent || !String(note.fm.agent).trim()) problems.push('missing agent');
  return problems;
}

export default {
  name: 'validate',
  summary: 'Lint note frontmatter (type/summary/created/agent); exits 1 on any problem',
  usage: 'validate [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const notes = collectNotes(ROOT, ctx.all ? { all: true } : { project: PROJECT });

    const issues = [];
    for (const n of notes) {
      const problems = lint(n);
      if (problems.length) issues.push({ file: n.rel, problems });
    }
    const ok = issues.length === 0;
    const data = { ok, checked: notes.length, issues };

    const lines = [];
    if (ok) lines.push(`all notes valid (${notes.length} checked)`);
    else {
      lines.push(`# ${issues.length} note(s) with problems (${notes.length} checked)`, '');
      for (const it of issues) {
        lines.push(`- ${it.file}`);
        for (const p of it.problems) lines.push(`    • ${p}`);
      }
    }
    return { ok, code: ok ? 0 : 1, lines, data };
  },
};
