// plan — scaffold a structured planning note (objective, steps, risks, done-when).
// Standardizes how a teammate kicks off a task: one memory note (tag `plan`) with
// fixed sections. `--steps "a;b;c"` pre-populates the Passos section as `- [ ]`
// checkboxes so `todo`/`progress` can track them. Writes via saveNote (shared with
// `save`), so the note is indistinguishable from a hand-written one.
import { saveNote } from '../notes.mjs';
import { fail } from './_ctx.mjs';

/** Split a `--steps "a;b;c"` string into trimmed, non-empty step labels. */
function parseSteps(raw) {
  if (typeof raw !== 'string') return [];
  return raw.split(';').map((s) => s.trim()).filter(Boolean);
}

export default {
  name: 'plan',
  summary: 'Scaffold a planning note (objective, steps, risks, done-when)',
  usage: 'plan "<objetivo>" [--steps "a;b;c"] [--agent name] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const objetivo = ctx.pos.join(' ').trim();
    if (!objetivo) return fail('usage: plan "<objetivo>" [--steps "a;b;c"] [--agent name]');

    const steps = parseSteps(opt.steps);
    const agent = opt.agent || 'unknown';

    // Fixed section skeleton. Steps become open checkboxes; empty sections keep a
    // placeholder line so the structure is visible and editable later.
    const passos = steps.length
      ? steps.map((s) => `- [ ] ${s}`).join('\n')
      : '- [ ] (defina os passos)';
    const body = [
      '## Objetivo', '', objetivo, '',
      '## Passos', '', passos, '',
      '## Riscos', '', '- (liste os riscos)', '',
      '## Pronto quando', '', '- (defina o critério de pronto)',
    ].join('\n');

    const { file, created } = saveNote(ROOT, PROJECT, {
      type: 'memory',
      title: objetivo,
      summary: `Plano: ${objetivo}`,
      tags: ['plan'],
      agent,
      body,
      task: opt.task,
    });
    void created;

    const name = file.replace(/^.*\//, '').replace(/\.md$/, '');
    const data = { name, path: file, steps };
    const lines = [
      `# plano criado: [[${name}]] (${file})`,
      '',
      `objetivo: ${objetivo}`,
      ...(steps.length ? ['passos:', ...steps.map((s) => `- [ ] ${s}`)] : ['(sem passos)']),
    ];
    return { ok: true, lines, data };
  },
};
