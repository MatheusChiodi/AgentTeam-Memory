import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Determinism via seeded `created`: months derive from the date strings, no clock.
let root;
before(() => {
  root = makeVault();
  seedNote(root, 'rm', 'memory', 'd-jan.md',
    { type: 'decision', project: 'rm', agent: 'x', summary: 'adopt ESM', tags: ['arch'], created: '2026-01-15' }, 'b');
  seedNote(root, 'rm', 'memory', 'd-feb.md',
    { type: 'decision', project: 'rm', agent: 'x', summary: 'use node:test', tags: ['test'], created: '2026-02-03' }, 'b');
  seedNote(root, 'rm', 'memory', 'd-feb2.md',
    { type: 'decision', project: 'rm', agent: 'x', summary: 'zero deps', tags: ['arch'], created: '2026-02-20' }, 'b');
  seedNote(root, 'rm', 'memory', 'l-feb.md',
    { type: 'learning', project: 'rm', agent: 'x', summary: 'parseFM edge case', tags: ['fm'], created: '2026-02-10' }, 'b');
  seedNote(root, 'rm', 'memory', 'plain.md',
    { type: 'memory', project: 'rm', agent: 'x', summary: 'not a decision', tags: ['x'], created: '2026-02-12' }, 'b');
});
after(() => cleanup(root));

test('roadmap: groups decisions by month, sorted ascending', async () => {
  const res = await run('roadmap', { project: 'rm', root });
  assert.equal(res.ok, true);
  const months = res.data.months.map((m) => m.month);
  assert.deepEqual(months, ['2026-01', '2026-02']);
  const feb = res.data.months.find((m) => m.month === '2026-02');
  // 2 decisions in feb, learning excluded by default, memory excluded
  assert.equal(feb.items.length, 2);
  assert.ok(feb.items.every((it) => it.type === 'decision'));
});

test('roadmap: --include learning folds in learning notes', async () => {
  const res = await run('roadmap', { opt: { include: 'learning' }, project: 'rm', root });
  const feb = res.data.months.find((m) => m.month === '2026-02');
  assert.equal(feb.items.length, 3); // 2 decisions + 1 learning
  assert.ok(feb.items.some((it) => it.type === 'learning'));
});

test('roadmap: markdown has `## YYYY-MM` headers and `título — summary` bullets', async () => {
  const res = await run('roadmap', { project: 'rm', root });
  const md = res.lines.join('\n');
  assert.match(md, /## 2026-01/);
  assert.match(md, /- d-jan — adopt ESM/);
});

test('roadmap: --json returns { months: [{ month, items }] }', async () => {
  const res = await run('roadmap', { opt: { json: true }, project: 'rm', root });
  assert.ok('months' in res.data);
  assert.ok(res.data.months.every((m) => 'month' in m && Array.isArray(m.items)));
  assert.ok(res.data.months[0].items.every((it) => 'name' in it && 'title' in it && 'summary' in it && 'type' in it));
});

test('roadmap: --save persists a memory note tagged roadmap', async () => {
  const res = await run('roadmap', { opt: { save: true }, project: 'rm', root });
  assert.ok(res.data.path);
  const raw = readFileSync(`${root}/${res.data.path}`, 'utf8');
  assert.match(raw, /tags: \[roadmap\]/);
  assert.match(raw, /## 2026-01/);
  assert.match(raw, /related: \[/);
});

test('roadmap: no decisions → empty roadmap, exit 0', async () => {
  const res = await run('roadmap', { project: 'rmempty', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.months, []);
  assert.match(res.lines.join('\n'), /no decisions/);
});
