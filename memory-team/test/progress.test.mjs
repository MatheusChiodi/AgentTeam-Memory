import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Known seed for deterministic percentages:
//   plan-done : tag plan, 2 checkboxes both checked          → complete plan, 2 done / 2 total
//   plan-open : tag plan, 2 checkboxes, 1 checked            → incomplete plan, 1 done / 2 total
//   loose     : no plan tag, 1 checkbox checked              → 1 done / 1 total
//   blocked   : tag blocker                                  → 1 open blocker
// Totals: done = 2+1+1 = 4, total = 2+2+1 = 5 → 80%.
const PROJ = 'progress-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'plan-done.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['plan'], created: '2026-01-01' },
    '## Steps\n- [x] one\n- [x] two');
  seedNote(root, PROJ, 'memory', 'plan-open.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['plan'], created: '2026-01-02' },
    '## Steps\n- [x] done\n- [ ] pending');
  seedNote(root, PROJ, 'memory', 'loose.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['misc'], created: '2026-01-03' },
    '- [x] standalone');
  seedNote(root, PROJ, 'memory', 'blocked.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['blocker'], created: '2026-01-04' }, 'b');
});
after(() => cleanup(root));

test('progress: computes correct checkbox done/total/pct on a known seed', async () => {
  const res = await run('progress', { project: PROJ, root });
  assert.equal(res.ok, true);
  assert.equal(res.data.checkboxes.done, 4);
  assert.equal(res.data.checkboxes.total, 5);
  assert.equal(res.data.checkboxes.pct, 80);
});

test('progress: counts plans and how many are fully complete', async () => {
  const res = await run('progress', { project: PROJ, root });
  assert.equal(res.data.plans.total, 2);
  assert.equal(res.data.plans.complete, 1); // only plan-done has all boxes checked
});

test('progress: counts open blockers', async () => {
  const res = await run('progress', { project: PROJ, root });
  assert.equal(res.data.blockers, 1);
});

test('progress: --json returns the three-block object', async () => {
  const res = await run('progress', { project: PROJ, opt: { json: true }, root });
  assert.ok('checkboxes' in res.data && 'plans' in res.data && 'blockers' in res.data);
  assert.ok('done' in res.data.checkboxes && 'total' in res.data.checkboxes && 'pct' in res.data.checkboxes);
});

test('progress: empty vault → zeros, no divide-by-zero, exit 0', async () => {
  const res = await run('progress', { project: 'progress-empty', root });
  assert.equal(res.ok, true);
  assert.equal(res.data.checkboxes.total, 0);
  assert.equal(res.data.checkboxes.done, 0);
  assert.equal(res.data.checkboxes.pct, 0); // not NaN
  assert.equal(res.data.plans.total, 0);
  assert.equal(res.data.plans.complete, 0);
  assert.equal(res.data.blockers, 0);
});

test('progress: a plan with no checkboxes is not counted complete', async () => {
  seedNote(root, 'progress-noboxes', 'memory', 'empty-plan.md',
    { type: 'memory', project: 'progress-noboxes', agent: 'x', summary: 's', tags: ['plan'], created: '2026-02-01' },
    'no checkbox at all here');
  const res = await run('progress', { project: 'progress-noboxes', root });
  assert.equal(res.data.plans.total, 1);
  assert.equal(res.data.plans.complete, 0);
});
