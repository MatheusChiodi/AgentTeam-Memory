import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'alice', summary: 's-a', tags: ['t1', 't2'], created: '2026-01-01' }, 'body a');
  seedNote(root, 'testproj', 'memory', '2026-03-01-b.md',
    { type: 'decision', project: 'testproj', agent: 'bob', summary: 's-b', tags: ['t2'], created: '2026-03-01' }, 'body b');
  seedNote(root, 'testproj', 'memory', '2026-02-01-c.md',
    { type: 'memory', project: 'testproj', agent: 'alice', summary: 's-c', tags: ['t3'], created: '2026-02-01' }, 'body c');
});
after(() => cleanup(root));

test('list: returns all project notes newest-first', async () => {
  const res = await run('list', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.length, 3);
  assert.deepEqual(res.data.map((n) => n.name), ['2026-03-01-b', '2026-02-01-c', '2026-01-01-a']);
});

test('list: filters by type', async () => {
  const res = await run('list', { opt: { type: 'memory' }, root });
  assert.equal(res.data.length, 2);
  assert.ok(res.data.every((n) => n.type === 'memory'));
});

test('list: filters by tag', async () => {
  const res = await run('list', { opt: { tag: 't2' }, root });
  assert.equal(res.data.length, 2);
  assert.ok(res.data.every((n) => n.tags.includes('t2')));
});

test('list: filters by agent', async () => {
  const res = await run('list', { opt: { agent: 'bob' }, root });
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].agent, 'bob');
});

test('list: filters by --since (inclusive lower bound)', async () => {
  const res = await run('list', { opt: { since: '2026-02-01' }, root });
  assert.equal(res.data.length, 2);
  assert.ok(res.data.every((n) => n.created >= '2026-02-01'));
});

test('list: applies --limit', async () => {
  const res = await run('list', { opt: { limit: '1' }, root });
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].name, '2026-03-01-b');
});

test('list: empty vault yields no matches', async () => {
  const empty = makeVault();
  try {
    const res = await run('list', { root: empty });
    assert.equal(res.ok, true);
    assert.equal(res.data.length, 0);
    assert.match(res.lines.join('\n'), /no notes match/);
  } finally {
    cleanup(empty);
  }
});

test('list: --json path still populates data', async () => {
  const res = await run('list', { opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.equal(res.data.length, 3);
  assert.ok('file' in res.data[0] && 'created' in res.data[0]);
});
