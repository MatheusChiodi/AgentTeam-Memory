// pin-ordering.test.mjs — F18/N3. The `pin` tool only marks `pinned: true`; this covers
// the lead-owned integration: list/search/recent float pinned notes to the top WITHOUT
// otherwise changing their order. Seeds a pinned note that is NOT the newest, so floating
// is observable.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  for (let i = 1; i <= 5; i++) {
    const day = String(i).padStart(2, '0');
    const fm = { type: 'memory', project: 'testproj', agent: 'x', summary: `topic note ${i}`, tags: ['topic'], created: `2026-02-${day}` };
    if (i === 2) fm.pinned = true; // older than n3..n5, yet must come first
    seedNote(root, 'testproj', 'memory', `2026-02-${day}-n${i}.md`, fm, `body topic ${i}`);
  }
});
after(() => cleanup(root));

test('list: pinned note floats to top despite older date', async () => {
  const res = await run('list', { root });
  assert.equal(res.data[0].name, '2026-02-02-n2');
});

test('list: the rest stays newest-first (order otherwise unchanged)', async () => {
  const res = await run('list', { root });
  const rest = res.data.slice(1).map((d) => d.name);
  assert.deepEqual(rest, ['2026-02-05-n5', '2026-02-04-n4', '2026-02-03-n3', '2026-02-01-n1']);
});

test('recent: pinned note floats to top', async () => {
  const res = await run('recent', { root });
  assert.equal(res.data[0].name, '2026-02-02-n2');
});

test('search: pinned note ranks first among equal-score matches', async () => {
  const res = await run('search', { pos: ['topic'], root });
  assert.equal(res.data[0].name, '2026-02-02-n2');
});
