import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';
import { loadCommands } from '../commands/registry.mjs';

process.env.NO_COLOR = '1';

// i18n regression gate: the whole system is English. The seeded vault below is 100% English,
// so any Portuguese token appearing in a command's user-facing output can only come from the
// command's own strings — i.e. an un-translated leftover. \b avoids matching English lookalikes
// (e.g. "agent" never matches \bagente\b; "open" never matches \baberto\b).
const PT = /\b(nenhum|nenhuma|nada|janela|aberto|aberta|abertos|bloqueio|bloqueios|decis[aã]o|decis[oõ]es|objetivo|passos|riscos|agente|agentes|criada|criado|inv[aá]lido|ausente|defina|liste|crit[eé]rio|estado registrado|sem passos)\b/i;

const PHASE3 = [
  'diagram', 'dashboard', 'tree', 'activity', 'heatmap',
  'brief', 'tokens', 'focus', 'tldr', 'recap',
  'plan', 'standup', 'handoff', 'todo', 'roadmap',
  'blockers', 'glossary', 'progress', 'changelog', 'mindmap',
];

// How to invoke each command meaningfully (args that exercise the real path).
const INVOKE = {
  diagram: {}, dashboard: {}, tree: {}, activity: { opt: { today: '2026-06-21' } },
  heatmap: { opt: { today: '2026-06-21' } }, brief: {}, tokens: {}, focus: { pos: ['cache'] },
  tldr: {}, recap: { opt: { today: '2026-06-21' } }, plan: { pos: ['Ship the feature'], opt: { steps: 'a;b' } },
  standup: { opt: { today: '2026-06-21' } }, handoff: {}, todo: {}, roadmap: {},
  blockers: {}, glossary: {}, progress: {}, changelog: { opt: { today: '2026-06-21' } },
  mindmap: { opt: { tag: 'cache' } },
};

const textOf = (res) => [
  ...(res?.lines || []),
  res?.data?.error || '',
].join('\n');

let root;
before(() => {
  root = makeVault();
  // an English-only populated project
  seedNote(root, 'en', 'memory', 'cache-note.md',
    { type: 'memory', project: 'en', agent: 'executor', summary: 'about the cache layer', tags: ['cache'], created: '2026-06-20' },
    '## Notes\n- [ ] wire the cache\n- [x] read the spec');
  seedNote(root, 'en', 'memory', 'pick-db.md',
    { type: 'decision', project: 'en', agent: 'executor', summary: 'use KV for storage', tags: ['infra'], created: '2026-06-21' }, 'we will use KV');
  seedNote(root, 'en', 'memory', 'risk-note.md',
    { type: 'learning', project: 'en', agent: 'researcher', summary: 'KV has limits', tags: ['risk'], created: '2026-06-21' }, 'watch the limit');
  seedNote(root, 'en', 'agents', 'executor.md',
    { type: 'state', project: 'en', agent: 'executor', summary: 'mid task', tags: [], created: '2026-06-21' }, 'doing work');
});
after(() => cleanup(root));

test('i18n: empty-vault output of every Phase 3 command is English (empty-state messages)', async () => {
  for (const name of PHASE3) {
    const res = await run(name, { ...INVOKE[name], root, project: 'empty-proj' });
    const text = textOf(res);
    const m = PT.exec(text);
    assert.equal(m, null, `Portuguese leftover in "${name}" (empty vault): ${m && m[0]} → ${text.slice(0, 120)}`);
  }
});

test('i18n: populated-vault output of every Phase 3 command is English', async () => {
  for (const name of PHASE3) {
    const res = await run(name, { ...INVOKE[name], root, project: 'en' });
    const text = textOf(res);
    const m = PT.exec(text);
    assert.equal(m, null, `Portuguese leftover in "${name}" (populated): ${m && m[0]} → ${text.slice(0, 120)}`);
  }
});

test('i18n: plan writes English section headers into the note body', async () => {
  const res = await run('plan', { pos: ['Build the thing'], opt: { steps: 'design;ship' }, root, project: 'planproj' });
  assert.equal(res.ok, true);
  const raw = readFileSync(`${root}/${res.data.file || res.data.path}`, 'utf8');
  assert.match(raw, /## Goal/);
  assert.match(raw, /## Steps/);
  assert.match(raw, /## Risks/);
  assert.match(raw, /## Done when/);
  assert.equal(PT.exec(raw), null, `Portuguese leftover in plan note body: ${PT.exec(raw)?.[0]}`);
});

test('i18n: every command summary and usage (help metadata) is English', async () => {
  const cmds = await loadCommands();
  for (const name of PHASE3) {
    const cmd = cmds.get(name);
    assert.ok(cmd, `missing command ${name}`);
    assert.equal(PT.exec(cmd.summary), null, `Portuguese in "${name}" summary: ${cmd.summary}`);
    assert.equal(PT.exec(cmd.usage), null, `Portuguese in "${name}" usage: ${cmd.usage}`);
  }
});

test('i18n: no Phase 3 command crashes on an empty vault (logic intact after translation)', async () => {
  for (const name of PHASE3) {
    const res = await run(name, { ...INVOKE[name], root, project: 'empty-proj-2' });
    assert.ok(res && typeof res.ok === 'boolean', `${name} returned a malformed result`);
    // commands that require args may fail(), but they must fail cleanly with code 1, never throw
    if (res.ok === false) assert.equal(res.code, 1, `${name} failed without a clean exit code`);
  }
});
