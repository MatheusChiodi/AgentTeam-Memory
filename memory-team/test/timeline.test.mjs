import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'old one', created: '2026-01-01' }, '# a');
  seedNote(root, 'testproj', 'memory', '2026-03-05-b.md',
    { type: 'decision', agent: 'a', project: 'testproj', summary: 'new one', created: '2026-03-05' }, '# b');
  seedNote(root, 'testproj', 'memory', '2026-03-05-c.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'same day', created: '2026-03-05' }, '# c');
});
after(() => cleanup(root));

test('timeline: groups by day, newest first', async () => {
  const res = await run('timeline', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data[0].date, '2026-03-05');
  assert.equal(res.data[0].notes.length, 2);
  assert.equal(res.data[1].date, '2026-01-01');
  assert.match(res.lines.join('\n'), /## 2026-03-05/);
});

test('timeline: --since filters older notes', async () => {
  const res = await run('timeline', { root, opt: { since: '2026-02-01' } });
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].date, '2026-03-05');
});

test('timeline: --limit caps note count', async () => {
  const res = await run('timeline', { root, opt: { limit: '1' } });
  const total = res.data.reduce((s, g) => s + g.notes.length, 0);
  assert.equal(total, 1);
});

test('timeline: empty range yields no groups', async () => {
  const res = await run('timeline', { root, opt: { since: '2099-01-01' } });
  assert.equal(res.data.length, 0);
  assert.match(res.lines.join('\n'), /no notes in range/);
});
