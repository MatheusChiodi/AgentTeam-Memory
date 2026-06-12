import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  // a -> b, b -> c (resolved), a -> ghost (dangling, dropped), c -> c (self, dropped)
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-01' },
    'go [[2026-01-02-b]] and [[ghost]]');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-02' }, 'on [[2026-01-03-c]]');
  seedNote(root, 'testproj', 'memory', '2026-01-03-c.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-03' }, 'self [[2026-01-03-c]]');
});
after(() => cleanup(root));

test('graph: only resolved, non-self edges appear', async () => {
  const res = await run('graph', { root });
  assert.equal(res.ok, true);
  const edgeSet = res.data.edges.map((e) => e.join('->')).sort();
  assert.deepEqual(edgeSet, ['2026-01-01-a->2026-01-02-b', '2026-01-02-b->2026-01-03-c']);
});

test('graph: nodes cover both endpoints of every edge', async () => {
  const res = await run('graph', { root });
  assert.ok(res.data.nodes.includes('2026-01-01-a'));
  assert.ok(res.data.nodes.includes('2026-01-02-b'));
  assert.ok(res.data.nodes.includes('2026-01-03-c'));
});

test('graph: output is a Mermaid graph block', async () => {
  const res = await run('graph', { root });
  assert.equal(res.lines[0], 'graph LR');
  assert.ok(res.lines.some((l) => /-->/.test(l)));
});

test('graph: no edges yields an empty mermaid block', async () => {
  const empty = makeVault();
  try {
    seedNote(empty, 'testproj', 'memory', '2026-01-01-lonely.md',
      { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-01' }, 'no links');
    const res = await run('graph', { root: empty });
    assert.equal(res.data.edges.length, 0);
    assert.equal(res.lines[0], 'graph LR');
  } finally {
    cleanup(empty);
  }
});

test('graph: --json populates structured data', async () => {
  const res = await run('graph', { opt: { json: true }, root });
  assert.ok(Array.isArray(res.data.nodes));
  assert.ok(Array.isArray(res.data.edges));
});
