import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Window determinism: every note has a seeded `created`; standup gets --today so it
// never reads the wall clock. since defaults to today.
let root;
before(() => {
  root = makeVault();
  seedNote(root, 'sup', 'memory', 'a-mem.md',
    { type: 'memory', project: 'sup', agent: 'executor', summary: 'did a thing', tags: ['x'], created: '2026-06-10' }, 'b');
  seedNote(root, 'sup', 'memory', 'a-dec.md',
    { type: 'decision', project: 'sup', agent: 'executor', summary: 'chose y', tags: ['x'], created: '2026-06-10' }, 'b');
  seedNote(root, 'sup', 'agents', 'executor.md',
    { type: 'state', project: 'sup', agent: 'executor', summary: 'mid task', tags: [], created: '2026-06-10' }, 'b');
  seedNote(root, 'sup', 'memory', 'r-mem.md',
    { type: 'memory', project: 'sup', agent: 'researcher', summary: 'gathered refs', tags: ['x'], created: '2026-06-10' }, 'b');
  // out of window (before since)
  seedNote(root, 'sup', 'memory', 'old.md',
    { type: 'memory', project: 'sup', agent: 'executor', summary: 'ancient', tags: ['x'], created: '2026-01-01' }, 'b');
});
after(() => cleanup(root));

test('standup: groups by agent, counts, sorted by count desc', async () => {
  const res = await run('standup', { opt: { since: '2026-06-01', today: '2026-06-21' }, project: 'sup', root });
  assert.equal(res.ok, true);
  const agents = res.data.map((a) => a.agent);
  // executor (3: mem+dec+state) above researcher (1)
  assert.equal(agents[0], 'executor');
  assert.equal(res.data[0].count, 3);
  assert.equal(res.data.find((a) => a.agent === 'researcher').count, 1);
});

test('standup: items are `tipo: título` and lastState is the state note', async () => {
  const res = await run('standup', { opt: { since: '2026-06-01', today: '2026-06-21' }, project: 'sup', root });
  const exec = res.data.find((a) => a.agent === 'executor');
  assert.ok(exec.items.includes('decision: a-dec'));
  assert.ok(exec.items.includes('state: executor'));
  assert.equal(exec.lastState.title, 'executor');
  assert.match(exec.lastState.summary, /mid task/);
});

test('standup: --since excludes notes before the window', async () => {
  const res = await run('standup', { opt: { since: '2026-06-05', today: '2026-06-21' }, project: 'sup', root });
  const exec = res.data.find((a) => a.agent === 'executor');
  // the 2026-01-01 note must not be counted
  assert.equal(exec.count, 3);
  assert.ok(!exec.items.some((i) => i.includes('old')));
});

test('standup: --json shape [{ agent, count, items, lastState }]', async () => {
  const res = await run('standup', { opt: { json: true, since: '2026-06-01', today: '2026-06-21' }, project: 'sup', root });
  assert.ok(Array.isArray(res.data));
  for (const a of res.data) {
    assert.ok('agent' in a && 'count' in a && 'items' in a && 'lastState' in a);
    assert.ok(!('_stateDate' in a));
  }
});

test('standup: empty window says no active agents, exit 0', async () => {
  const res = await run('standup', { opt: { since: '2026-12-01', today: '2026-12-31' }, project: 'sup', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
  assert.match(res.lines.join('\n'), /nenhum agente ativo/);
});

test('standup: agent with no state note has lastState null', async () => {
  const res = await run('standup', { opt: { since: '2026-06-01', today: '2026-06-21' }, project: 'sup', root });
  const r = res.data.find((a) => a.agent === 'researcher');
  assert.equal(r.lastState, null);
});
