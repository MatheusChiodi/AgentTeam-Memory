process.env.NO_COLOR = '1'; // assert on rendered sparkline text, not ANSI
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

// Window anchored at 2026-01-14, 14 days back → 2026-01-01..2026-01-14.
// Seed: 2 on 01-10 (agents x,y), 1 on 01-12 (x), 1 outside window (2025-12-20).
let root;
const P = 'actproj';
const TODAY = '2026-01-14';
before(() => {
  root = makeVault();
  seedNote(root, P, 'memory', 'a.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2026-01-10' }, 'b');
  seedNote(root, P, 'memory', 'b.md',
    { type: 'decision', project: P, agent: 'y', summary: 's', tags: ['t'], created: '2026-01-10' }, 'b');
  seedNote(root, P, 'memory', 'c.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2026-01-12' }, 'b');
  seedNote(root, P, 'memory', 'old.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2025-12-20' }, 'b');
});
after(() => cleanup(root));

test('activity: counts created per day in the window (deterministic today)', async () => {
  const res = await run('activity', { root, project: P, opt: { today: TODAY } });
  assert.equal(res.ok, true);
  assert.equal(res.data.days, 14);
  assert.equal(res.data.total, 3); // old.md excluded
  assert.equal(res.data.max, 2); // 01-10 has 2
  const jan10 = res.data.series.find((s) => s.date === '2026-01-10');
  assert.equal(jan10.count, 2);
});

test('activity: --days controls the window length', async () => {
  const res = await run('activity', { root, project: P, opt: { today: TODAY, days: '3' } });
  // window 2026-01-12..2026-01-14 → only c (01-12) counts
  assert.equal(res.data.days, 3);
  assert.equal(res.data.total, 1);
});

test('activity: sparkline + total/avg/peak rendered', async () => {
  const res = await run('activity', { root, project: P, opt: { today: TODAY } });
  const text = res.lines.join('\n');
  assert.match(text, /total 3/);
  assert.match(text, /peak 2 \(2026-01-10\)/);
  // sparkline uses block glyphs
  assert.match(text, /[▁▂▃▄▅▆▇█]/);
});

test('activity: --by agent emits one line per dimension', async () => {
  const res = await run('activity', { root, project: P, opt: { today: TODAY, by: 'agent' } });
  assert.equal(res.data.by, 'agent');
  assert.ok('x' in res.data.byDim);
  assert.ok('y' in res.data.byDim);
  // x has 2 notes in window (01-10, 01-12), y has 1
  assert.equal(res.data.byDim.x.reduce((a, s) => a + s.count, 0), 2);
  assert.equal(res.data.byDim.y.reduce((a, s) => a + s.count, 0), 1);
});

test('activity: empty window is a flat sparkline, no divide-by-zero, exit 0', async () => {
  const empty = makeVault();
  const res = await run('activity', { root: empty, project: 'void', opt: { today: TODAY } });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 0);
  assert.equal(res.data.max, 0);
  // flat sparkline: all lowest glyph
  assert.match(res.lines.join('\n'), /▁{14}/);
  cleanup(empty);
});

test('activity: --json returns { days, total, max, series }', async () => {
  const res = await run('activity', { root, project: P, opt: { today: TODAY, json: true } });
  assert.ok('days' in res.data && 'total' in res.data && 'max' in res.data);
  assert.ok(Array.isArray(res.data.series));
  assert.equal(res.data.series.length, 14);
  assert.ok(res.data.series.every((s) => 'date' in s && 'count' in s));
});
