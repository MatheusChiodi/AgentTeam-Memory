import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['cli', 'graph'], created: '2026-01-01' }, 'a');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['cli'], created: '2026-01-02' }, 'b');
  seedNote(root, 'other', 'memory', '2026-01-03-c.md',
    { type: 'memory', project: 'other', agent: 'x', summary: 's', tags: ['solo'], created: '2026-01-03' }, 'c');
});
after(() => cleanup(root));

test('tags: histogram for current project, count-desc', async () => {
  const res = await run('tags', { root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data[0], { tag: 'cli', count: 2 });
  assert.ok(res.data.some((d) => d.tag === 'graph' && d.count === 1));
  assert.ok(!res.data.some((d) => d.tag === 'solo'));
});

test('tags: --all spans every project', async () => {
  const res = await run('tags', { opt: { all: true }, root });
  assert.ok(res.data.some((d) => d.tag === 'solo' && d.count === 1));
});

test('tags: empty vault yields none', async () => {
  const empty = makeVault();
  try {
    const res = await run('tags', { root: empty });
    assert.equal(res.data.length, 0);
    assert.match(res.lines.join('\n'), /no tags yet/);
  } finally {
    cleanup(empty);
  }
});

test('tags: --json populates data', async () => {
  const res = await run('tags', { opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'tag' in d && 'count' in d));
});
