import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Deterministic windowing via opt.today + seeded `created` (never the real clock).
const PROJ = 'recap-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'decision', 'dec.md',
    { type: 'decision', project: PROJ, agent: 'a', summary: 'chose ESM', tags: ['t'], created: '2026-06-20' }, 'b');
  seedNote(root, PROJ, 'state', 'st.md',
    { type: 'state', project: PROJ, agent: 'a', summary: 'mid task', tags: ['t'], created: '2026-06-20' }, 'b');
  seedNote(root, PROJ, 'communication', 'comm.md',
    { type: 'communication', project: PROJ, agent: 'a', summary: 'pinged lead', tags: ['t'], created: '2026-06-20' }, 'b');
  seedNote(root, PROJ, 'memory', 'mem.md',
    { type: 'memory', project: PROJ, agent: 'a', summary: 'implemented X', tags: ['t'], created: '2026-06-20' }, 'b');
  // outside the window (older) — must not appear when since=2026-06-20
  seedNote(root, PROJ, 'memory', 'old.md',
    { type: 'memory', project: PROJ, agent: 'a', summary: 'ancient', tags: ['t'], created: '2026-01-01' }, 'b');
});
after(() => cleanup(root));

test('recap: collects the window and prioritizes decision/state over communication', async () => {
  const res = await run('recap', { opt: { since: '2026-06-20' }, root, project: PROJ });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 4); // old.md excluded
  // decision and state lead; communication trails
  const order = res.data.bullets.join('\n');
  assert.ok(order.indexOf('decision:') < order.indexOf('communication:'));
  assert.ok(order.indexOf('state:') < order.indexOf('communication:'));
});

test('recap: --max caps the bullets and reports the leftover count', async () => {
  const res = await run('recap', { opt: { since: '2026-06-20', max: '2' }, root, project: PROJ });
  assert.equal(res.data.shown, 2);
  assert.equal(res.data.total, 4);
  // the two highest-signal types survive the cap
  assert.match(res.data.bullets.join('\n'), /decision:|state:/);
  assert.match(res.lines.join('\n'), /\+2 more left out/);
});

test('recap: --today defaults the window deterministically', async () => {
  // since omitted → defaults to opt.today; only notes created on/after that day count
  const res = await run('recap', { opt: { today: '2026-06-20' }, root, project: PROJ });
  assert.equal(res.data.since, '2026-06-20');
  assert.equal(res.data.total, 4);
});

test('recap: --json exposes { since, total, shown, bullets }', async () => {
  const res = await run('recap', { opt: { since: '2026-06-20', json: true }, root, project: PROJ });
  assert.ok('since' in res.data && 'total' in res.data && 'shown' in res.data);
  assert.ok(Array.isArray(res.data.bullets));
});

test('recap: bullet format is `tipo: título — summary`', async () => {
  const res = await run('recap', { opt: { since: '2026-06-20' }, root, project: PROJ });
  assert.ok(res.data.bullets.some((b) => /^- decision: dec — chose ESM$/.test(b)));
});

test('recap: empty window is a valid recap, exit 0', async () => {
  const res = await run('recap', { opt: { since: '2099-01-01', today: '2099-01-01' }, root, project: PROJ });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 0);
  assert.deepEqual(res.data.bullets, []);
  assert.match(res.lines.join('\n'), /nada na janela/);
});
