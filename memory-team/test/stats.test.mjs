import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', agent: 'alice', project: 'testproj', summary: 'first', tags: ['x', 'y'], created: '2026-01-01' }, '# a\nbody');
  seedNote(root, 'testproj', 'memory', '2026-03-05-b.md',
    { type: 'decision', agent: 'bob', project: 'testproj', summary: 'second', tags: ['x'], created: '2026-03-05' }, '# b\nbody');
  seedNote(root, 'testproj', 'board', '2026-02-02-c.md',
    { type: 'communication', agent: 'alice', project: 'testproj', summary: 'third', tags: ['z'], created: '2026-02-02' }, '# c\nbody');
});
after(() => cleanup(root));

test('stats: aggregates totals, byType/byAgent, top tags, oldest/newest', async () => {
  const res = await run('stats', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 3);
  assert.equal(res.data.byType.memory, 1);
  assert.equal(res.data.byType.decision, 1);
  assert.equal(res.data.byAgent.alice, 2);
  assert.equal(res.data.byProject.testproj, 3);
  assert.deepEqual(res.data.topTags[0], ['x', 2]);
  assert.equal(res.data.oldest, '2026-01-01');
  assert.equal(res.data.newest, '2026-03-05');
});

test('stats: empty vault reports zero total', async () => {
  const empty = makeVault();
  try {
    const res = await run('stats', { root: empty, project: 'nope' });
    assert.equal(res.ok, true);
    assert.equal(res.data.total, 0);
  } finally {
    cleanup(empty);
  }
});

test('stats: --json keeps structured data', async () => {
  const res = await run('stats', { root, opt: { json: true } });
  assert.equal(res.ok, true);
  assert.ok(res.data.byType);
});
