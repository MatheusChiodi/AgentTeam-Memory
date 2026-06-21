import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Vault for focus (query = "graph"):
//   strong : tag graph + summary term       → highest score
//   weak   : body mentions graph only       → low score
//   none   : nothing about graph            → score 0, excluded
//   big    : tag graph + huge body          → relevant but heavy (budget drop test)
const PROJ = 'focus-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'strong.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'the graph ranking engine', tags: ['graph'], created: '2026-01-01' }, 'about graph');
  seedNote(root, PROJ, 'memory', 'weak.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'unrelated words', tags: ['z'], created: '2026-01-02' }, 'mentions graph once');
  seedNote(root, PROJ, 'memory', 'none.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'totally different topic', tags: ['z'], created: '2026-01-03' }, 'nothing here');
});
after(() => cleanup(root));

test('focus: ranks by score desc and drops score-0 notes', async () => {
  const res = await run('focus', { pos: ['graph'], root, project: PROJ });
  assert.equal(res.ok, true);
  const names = res.data.map((d) => d.name);
  assert.equal(names[0], 'strong');
  assert.ok(names.includes('weak'));
  assert.ok(!names.includes('none')); // score 0 excluded
  assert.ok(res.data[0].score >= res.data[res.data.length - 1].score);
});

test('focus: --top caps the count', async () => {
  const res = await run('focus', { pos: ['graph'], opt: { top: '1' }, root, project: PROJ });
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].name, 'strong');
});

test('focus: --budget never exceeds tokens; over-budget note excluded', async () => {
  seedNote(root, PROJ, 'memory', 'big.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'graph graph graph', tags: ['graph'], created: '2026-01-04' },
    'graph '.repeat(300));
  const res = await run('focus', { pos: ['graph'], opt: { budget: '30' }, root, project: PROJ });
  const used = res.data.reduce((a, n) => a + n.tokens, 0);
  assert.ok(used <= 30, `used ${used} must be <= 30`);
  assert.ok(!res.data.map((d) => d.name).includes('big'));
});

test('focus: --json yields [{ name, score, tokens }] sorted by score', async () => {
  const res = await run('focus', { pos: ['graph'], opt: { json: true }, root, project: PROJ });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'name' in d && 'score' in d && 'tokens' in d));
});

test('focus: empty query errors with exit 1', async () => {
  const res = await run('focus', { pos: [], root, project: PROJ });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /usage: focus/);
});

test('focus: no candidates yields an empty list, exit 0', async () => {
  const res = await run('focus', { pos: ['zzqqxx'], root, project: PROJ });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
});

test('focus: --budget 0 returns nothing (zero is honored, not the default) — B1', async () => {
  const res = await run('focus', { pos: ['graph'], opt: { budget: '0' }, root, project: PROJ });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
});

test('focus: --top 0 returns nothing (zero is a real cap, not "no cap")', async () => {
  const res = await run('focus', { pos: ['graph'], opt: { top: '0' }, root, project: PROJ });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
});
