import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  // a -> b (both connected); lonely has no links in or out; ghostlink only points
  // at a non-existent note (no resolved outbound), nobody points at it -> orphan.
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-01' }, 'to [[2026-01-02-b]]');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-02' }, 'leaf');
  seedNote(root, 'testproj', 'memory', '2026-01-03-lonely.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-03' }, 'truly alone');
  seedNote(root, 'testproj', 'memory', '2026-01-04-ghostlink.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-04' }, 'points at [[does-not-exist]]');
});
after(() => cleanup(root));

test('orphans: only fully disconnected notes are reported', async () => {
  const res = await run('orphans', { root });
  assert.equal(res.ok, true);
  const names = res.data.map((n) => n.name).sort();
  assert.deepEqual(names, ['2026-01-03-lonely', '2026-01-04-ghostlink']);
});

test('orphans: linked notes are excluded', async () => {
  const res = await run('orphans', { root });
  const names = res.data.map((n) => n.name);
  assert.ok(!names.includes('2026-01-01-a'));
  assert.ok(!names.includes('2026-01-02-b'));
});

test('orphans: fully connected vault reports none', async () => {
  const v = makeVault();
  try {
    seedNote(v, 'testproj', 'memory', '2026-01-01-x.md',
      { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-01' }, 'to [[2026-01-02-y]]');
    seedNote(v, 'testproj', 'memory', '2026-01-02-y.md',
      { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-02' }, 'to [[2026-01-01-x]]');
    const res = await run('orphans', { root: v });
    assert.equal(res.data.length, 0);
    assert.match(res.lines.join('\n'), /no orphan/);
  } finally {
    cleanup(v);
  }
});

test('orphans: empty vault reports none', async () => {
  const empty = makeVault();
  try {
    const res = await run('orphans', { root: empty });
    assert.equal(res.data.length, 0);
  } finally {
    cleanup(empty);
  }
});

test('orphans: --json populates data', async () => {
  const res = await run('orphans', { opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'name' in d && 'file' in d));
});
