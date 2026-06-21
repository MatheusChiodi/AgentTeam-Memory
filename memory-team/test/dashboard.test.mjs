process.env.NO_COLOR = '1'; // assert on rendered panel text, not ANSI
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
const P = 'dashproj';
before(() => {
  root = makeVault();
  // 2 memory, 1 decision; agents x(2)/y(1); one pinned; one orphan (no links).
  seedNote(root, P, 'memory', 'a.md',
    { type: 'memory', project: P, agent: 'x', summary: 'alpha', tags: ['t'], related: ['[[b]]'], created: '2026-01-05' }, 'links [[b]]');
  seedNote(root, P, 'memory', 'b.md',
    { type: 'decision', project: P, agent: 'y', summary: 'beta', tags: ['t'], pinned: 'true', created: '2026-01-06' }, 'pinned, links [[a]]\n[[a]]');
  seedNote(root, P, 'memory', 'c.md',
    { type: 'memory', project: P, agent: 'x', summary: 'gamma orphan', tags: ['z'], created: '2026-01-07' }, 'no links at all');
});
after(() => cleanup(root));

test('dashboard: aggregates totals, byType, byAgent', async () => {
  const res = await run('dashboard', { root, project: P });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 3);
  assert.equal(res.data.byType.memory, 2);
  assert.equal(res.data.byType.decision, 1);
  assert.equal(res.data.byAgent.x, 2);
  assert.equal(res.data.byAgent.y, 1);
});

test('dashboard: counts pins and orphans', async () => {
  const res = await run('dashboard', { root, project: P });
  assert.equal(res.data.pins, 1);
  // c is the only note with no [[links]] (a and b link each other)
  assert.equal(res.data.orphans, 1);
});

test('dashboard: recent is sorted by created desc', async () => {
  const res = await run('dashboard', { root, project: P });
  const dates = res.data.recent.map((r) => r.created);
  const sorted = [...dates].sort((x, y) => y.localeCompare(x));
  assert.deepEqual(dates, sorted);
  assert.equal(res.data.recent[0].name, 'c'); // 2026-01-07 newest
});

test('dashboard: renders boxes (terminal lines present)', async () => {
  const res = await run('dashboard', { root, project: P });
  const text = res.lines.join('\n');
  assert.match(text, /dashboard/);
  assert.match(text, /by type/);
  assert.match(text, /by agent/);
  assert.match(text, /recent/);
  // box borders present
  assert.match(text, /[┌└│]/);
});

test('dashboard: --json yields the full object', async () => {
  const res = await run('dashboard', { root, project: P, opt: { json: true } });
  for (const k of ['project', 'enabled', 'total', 'byType', 'byAgent', 'recent', 'pins', 'orphans']) {
    assert.ok(k in res.data, `missing key ${k}`);
  }
  assert.equal(typeof res.data.enabled, 'boolean');
});

test('dashboard: empty vault is all zeros, exit 0', async () => {
  const empty = makeVault();
  const res = await run('dashboard', { root: empty, project: 'void' });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 0);
  assert.equal(res.data.pins, 0);
  assert.equal(res.data.orphans, 0);
  assert.deepEqual(res.data.recent, []);
  cleanup(empty);
});
