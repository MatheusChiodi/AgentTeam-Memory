process.env.NO_COLOR = '1'; // assert on rendered tree text, not ANSI
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
const P = 'treeproj';
before(() => {
  root = makeVault();
  seedNote(root, P, 'memory', 'a.md',
    { type: 'memory', project: P, agent: 'x', summary: 'alpha summary here', tags: ['t'], created: '2026-01-01' }, 'b');
  seedNote(root, P, 'memory', 'b.md',
    { type: 'memory', project: P, agent: 'y', summary: 'beta summary', tags: ['t'], created: '2026-01-02' }, 'b');
  seedNote(root, P, 'memory', 'd.md',
    { type: 'decision', project: P, agent: 'x', summary: 'a decision', tags: ['t'], created: '2026-01-03' }, 'b');
});
after(() => cleanup(root));

test('tree: groups by type with glyphs and connectors', async () => {
  const res = await run('tree', { root, project: P });
  assert.equal(res.ok, true);
  const text = res.lines.join('\n');
  // type glyphs for memory (◆) and decision (★)
  assert.match(text, /◆ memory/);
  assert.match(text, /★ decision/);
  // tree connectors
  assert.match(text, /[├└]─/);
  // leaf names present
  assert.match(text, /a/);
});

test('tree: --by agent regroups under agents', async () => {
  const res = await run('tree', { root, project: P, opt: { by: 'agent' } });
  assert.equal(res.data.by, 'agent');
  const labels = res.data.tree.flatMap((p) => p.children.map((g) => g.label));
  assert.ok(labels.includes('x'));
  assert.ok(labels.includes('y'));
});

test('tree: --depth 2 stops before leaves', async () => {
  const res = await run('tree', { root, project: P, opt: { depth: '2' } });
  // groups present but their children (notes) elided at depth 2
  const groups = res.data.tree.flatMap((p) => p.children);
  assert.ok(groups.length > 0);
  assert.ok(groups.every((g) => g.children.length === 0));
});

test('tree: leaf shows truncated summary in --json', async () => {
  const res = await run('tree', { root, project: P, opt: { json: true } });
  const leaves = res.data.tree.flatMap((p) => p.children).flatMap((g) => g.children);
  const a = leaves.find((l) => l.label === 'a');
  assert.ok(a);
  assert.match(a.summary, /alpha/);
});

test('tree: --json returns the nested tree', async () => {
  const res = await run('tree', { root, project: P, opt: { json: true } });
  assert.ok(Array.isArray(res.data.tree));
  assert.equal(res.data.tree[0].label, P);
  assert.ok(Array.isArray(res.data.tree[0].children));
});

test('tree: empty vault yields a clear empty tree, exit 0', async () => {
  const empty = makeVault();
  const res = await run('tree', { root: empty, project: 'void' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.tree, []);
  assert.match(res.lines.join('\n'), /empty/);
  cleanup(empty);
});
