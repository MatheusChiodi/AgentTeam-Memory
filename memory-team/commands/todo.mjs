// todo — aggregate every checkbox scattered across note bodies into one place, and
// flip one to done. List mode collects `- [ ]` (open) / `- [x]` (done) via the
// shared extractor. The `todo check <ref> "<texto>"` subcommand resolves a note,
// finds the UNIQUE open checkbox whose text includes <texto> (case-insensitive),
// flips that body line to `- [x]`, and rewrites the note via formatNote so any
// unknown frontmatter survives the round-trip.
import { writeFileSync } from 'node:fs';
import { collectNotes, resolveNotes, formatNote } from '../notes.mjs';
import { extractCheckboxes } from '../analyze.mjs';
import { fail } from './_ctx.mjs';

/** Flip the Nth body line's `- [ ]` to `- [x]`, preserving the rest of the line. */
function checkLine(body, lineIdx) {
  const lines = body.split(/\r?\n/);
  lines[lineIdx] = lines[lineIdx].replace(/^(\s*[-*]\s+)\[[ ]\]/, '$1[x]');
  return lines.join('\n');
}

function runCheck(ctx) {
  const { ROOT, PROJECT, opt } = ctx;
  // pos = ['check', <ref>, ...textWords]; ref is pos[1], the rest is the match text.
  const ref = ctx.pos[1];
  const text = ctx.pos.slice(2).join(' ').trim();
  if (!ref || !text) return fail('usage: todo check <ref> "<texto>"');

  const scope = ctx.all ? { all: true } : { project: PROJECT };
  const matches = resolveNotes(ROOT, ref, scope);
  if (!matches.length) return fail(`no note matches "${ref}"`);
  if (matches.length > 1) {
    return fail(`ambiguous "${ref}" — matches: ${matches.map((m) => m.name).join(', ')}`);
  }

  const note = matches[0];
  const needle = text.toLowerCase();
  const open = extractCheckboxes(note.body)
    .filter((cb) => !cb.checked && cb.text.toLowerCase().includes(needle));
  if (!open.length) return fail(`no open checkbox in [[${note.name}]] matching "${text}"`);
  if (open.length > 1) {
    return fail(`ambiguous "${text}" in [[${note.name}]] — matches: ${open.map((o) => o.text).join(' | ')}`);
  }

  const target = open[0];
  const newBody = checkLine(note.body, target.line);
  // Rewrite preserving unknown frontmatter (formatNote keeps any extra keys).
  writeFileSync(note.file, formatNote({ ...note.fm }, newBody), 'utf8');

  const data = { note: note.name, text: target.text, checked: true };
  return { ok: true, lines: [`checked [[${note.name}]]: ${target.text}`], data };
}

export default {
  name: 'todo',
  summary: 'List open checkboxes across notes, or `todo check <ref> "<texto>"` to flip one',
  usage: 'todo [--done] [--all] [--json]  |  todo check <ref> "<texto>"',
  run(ctx) {
    if (ctx.pos[0] === 'check') return runCheck(ctx);

    const { ROOT, PROJECT, opt } = ctx;
    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope)
      .sort((a, b) => a.name.localeCompare(b.name));

    const items = [];
    for (const n of notes) {
      for (const cb of extractCheckboxes(n.body)) {
        items.push({ note: n.name, text: cb.text, checked: cb.checked });
      }
    }
    const openItems = items.filter((i) => !i.checked);
    const doneItems = items.filter((i) => i.checked);
    // data always carries the full picture; --done only changes what we *show*.
    const shown = opt.done === true ? items : openItems;
    const data = { open: openItems.length, done: doneItems.length, items };

    if (!shown.length) {
      return { ok: true, lines: ['(nenhum checkbox)'], data };
    }

    const lines = [`# todo — ${openItems.length} aberto(s)${opt.done === true ? `, ${doneItems.length} feito(s)` : ''}`, ''];
    let cur = null;
    for (const i of shown) {
      if (i.note !== cur) { lines.push(`## [[${i.note}]]`); cur = i.note; }
      lines.push(`- [${i.checked ? 'x' : ' '}] ${i.text}`);
    }
    return { ok: true, lines, data };
  },
};
