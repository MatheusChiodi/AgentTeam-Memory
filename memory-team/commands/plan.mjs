// plan — scaffold a structured planning note (objective, steps, risks, done-when).
// Standardizes how a teammate kicks off a task: one memory note (tag `plan`) with
// fixed sections. `--steps "a;b;c"` pre-populates the Steps section as `- [ ]`
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
  usage: 'plan "<goal>" [--steps "a;b;c"] [--agent name] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const goal = ctx.pos.join(' ').trim();
    if (!goal) return fail('usage: plan "<goal>" [--steps "a;b;c"] [--agent name]');

    const steps = parseSteps(opt.steps);
    const agent = opt.agent || 'unknown';

    // Fixed section skeleton. Steps become open checkboxes; empty sections keep a
    // placeholder line so the structure is visible and editable later.
    const stepsBlock = steps.length
      ? steps.map((s) => `- [ ] ${s}`).join('\n')
      : '- [ ] (define the steps)';
    const body = [
      '## Goal', '', goal, '',
      '## Steps', '', stepsBlock, '',
      '## Risks', '', '- (list the risks)', '',
      '## Done when', '', '- (define the done criteria)',
    ].join('\n');

    const { file, created } = saveNote(ROOT, PROJECT, {
      type: 'memory',
      title: goal,
      summary: `Plan: ${goal}`,
      tags: ['plan'],
      agent,
      body,
      task: opt.task,
    });
    void created;

    const name = file.replace(/^.*\//, '').replace(/\.md$/, '');
    const data = { name, path: file, steps };
    const lines = [
      `# plan created: [[${name}]] (${file})`,
      '',
      `goal: ${goal}`,
      ...(steps.length ? ['steps:', ...steps.map((s) => `- [ ] ${s}`)] : ['(no steps)']),
    ];
    return { ok: true, lines, data };
  },
};
