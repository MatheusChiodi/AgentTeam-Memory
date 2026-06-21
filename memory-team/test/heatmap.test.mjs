process.env.NO_COLOR = '1'; // assert on rendered grid text, not ANSI
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
const P = 'heatproj';
const TODAY = '2026-01-14'; // Wednesday
before(() => {
  root = makeVault();
  // dates within the last 12 weeks of TODAY
  seedNote(root, P, 'memory', 'a.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2026-01-12' }, 'b');
  seedNote(root, P, 'memory', 'b.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2026-01-12' }, 'b');
  seedNote(root, P, 'memory', 'c.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2026-01-05' }, 'b');
  // far outside the window → must not count
  seedNote(root, P, 'memory', 'old.md',
    { type: 'memory', project: P, agent: 'x', summary: 's', tags: ['t'], created: '2024-01-01' }, 'b');
});
after(() => cleanup(root));

test('heatmap: grid has weeks×7 cells, total counts in-window creations', async () => {
  const res = await run('heatmap', { root, project: P, opt: { today: TODAY } });
  assert.equal(res.ok, true);
  assert.equal(res.data.weeks, 12);
  assert.equal(res.data.cells.length, 12 * 7);
  const total = res.data.cells.reduce((a, c) => a + c.count, 0);
  assert.equal(total, 3); // old.md excluded
});

test('heatmap: a busy day has a higher level than a quiet one', async () => {
  const res = await run('heatmap', { root, project: P, opt: { today: TODAY } });
  const busy = res.data.cells.find((c) => c.date === '2026-01-12'); // 2 notes
  const quiet = res.data.cells.find((c) => c.date === '2026-01-05'); // 1 note
  assert.ok(busy && quiet);
  assert.equal(busy.count, 2);
  assert.equal(quiet.count, 1);
  assert.ok(busy.level >= quiet.level);
  assert.ok(quiet.level >= 1); // any positive count is at least level 1
});

test('heatmap: --weeks controls the grid width', async () => {
  const res = await run('heatmap', { root, project: P, opt: { today: TODAY, weeks: '4' } });
  assert.equal(res.data.weeks, 4);
  assert.equal(res.data.cells.length, 4 * 7);
});

test('heatmap: zero-count cells are level 0', async () => {
  const res = await run('heatmap', { root, project: P, opt: { today: TODAY } });
  const zero = res.data.cells.find((c) => c.count === 0);
  assert.ok(zero);
  assert.equal(zero.level, 0);
});

test('heatmap: all-zero vault is a valid empty grid, exit 0', async () => {
  const empty = makeVault();
  const res = await run('heatmap', { root: empty, project: 'void', opt: { today: TODAY } });
  assert.equal(res.ok, true);
  assert.equal(res.data.cells.length, 12 * 7);
  assert.ok(res.data.cells.every((c) => c.count === 0 && c.level === 0));
  cleanup(empty);
});

test('heatmap: renders 7 weekday rows + legend', async () => {
  const res = await run('heatmap', { root, project: P, opt: { today: TODAY } });
  const text = res.lines.join('\n');
  for (const wd of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
    assert.match(text, new RegExp(wd));
  }
  assert.match(text, /less/);
  assert.match(text, /more/);
});

test('heatmap: --json returns { weeks, cells:[{date,count,level}] }', async () => {
  const res = await run('heatmap', { root, project: P, opt: { today: TODAY, json: true } });
  assert.ok('weeks' in res.data);
  assert.ok(Array.isArray(res.data.cells));
  assert.ok(res.data.cells.every((c) => 'date' in c && 'count' in c && 'level' in c));
});
