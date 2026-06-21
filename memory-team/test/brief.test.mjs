import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Vault for brief:
//   pinned   : pinned, low recency        → must lead regardless of recency
//   relevant : matches the query "graph"  → leads over irrelevant when query given
//   recent   : newest created             → leads on pure recency (no query)
//   old      : oldest                      → trails
//   big      : a deliberately huge body    → used for the over-budget drop test
const PROJ = 'brief-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'pinned.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'a pinned note', tags: ['t'], pinned: 'true', created: '2026-01-01' }, 'pin body');
  seedNote(root, PROJ, 'memory', 'relevant.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'all about the graph engine', tags: ['graph'], created: '2026-01-02' }, 'graph body');
  seedNote(root, PROJ, 'memory', 'recent.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'newest of them all', tags: ['z'], created: '2026-06-01' }, 'recent body');
  seedNote(root, PROJ, 'memory', 'old.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'ancient relic note', tags: ['z'], created: '2025-01-01' }, 'old body');
});
after(() => cleanup(root));

test('brief: happy path returns a pack under budget with pins first', async () => {
  const res = await run('brief', { root, project: PROJ });
  assert.equal(res.ok, true);
  assert.ok(res.data.notes.length > 0);
  assert.equal(res.data.notes[0].name, 'pinned');
  assert.ok(res.data.usedTokens <= res.data.budget);
});

test('brief: a query reorders by relevance (after pins)', async () => {
  const res = await run('brief', { pos: ['graph'], root, project: PROJ });
  const names = res.data.notes.map((n) => n.name);
  // pinned still leads; the query-relevant note ranks above the irrelevant recent/old ones
  assert.equal(names[0], 'pinned');
  assert.ok(names.indexOf('relevant') < names.indexOf('old'));
});

test('brief: never exceeds the budget; over-budget notes are dropped whole', async () => {
  // A huge body (counted only with --full) cannot fit a tiny budget. As the oldest note it
  // ranks last, so budgetFill reaches it after the small notes and must drop it whole.
  seedNote(root, PROJ, 'memory', 'big.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'huge', tags: ['z'], created: '2024-01-01' },
    'lorem ipsum dolor sit amet '.repeat(200));
  const res = await run('brief', { opt: { full: true, budget: '40' }, root, project: PROJ });
  assert.ok(res.data.usedTokens <= 40, `used ${res.data.usedTokens} must be <= 40`);
  const included = res.data.notes.map((n) => n.name);
  // 'big' (≈1350 tokens) cannot fit 40 → reported as dropped, never partially included
  assert.ok(!included.includes('big'));
  assert.ok(res.data.dropped.includes('big'));
});

test('brief: --full appends bodies but still respects the budget', async () => {
  const res = await run('brief', { opt: { full: true, budget: '10000' }, root, project: PROJ });
  assert.ok(res.data.usedTokens <= 10000);
  // with a generous budget and bodies, the assembled pack should contain body text
  assert.match(res.lines.join('\n'), /pin body|graph body|recent body/);
});

test('brief: --json exposes { budget, usedTokens, notes, dropped }', async () => {
  const res = await run('brief', { opt: { json: true, budget: '500' }, root, project: PROJ });
  assert.ok('budget' in res.data && 'usedTokens' in res.data);
  assert.ok(Array.isArray(res.data.notes) && Array.isArray(res.data.dropped));
  assert.ok(res.data.notes.every((n) => 'name' in n && 'tokens' in n));
  assert.ok(res.data.usedTokens <= res.data.budget);
});

test('brief: empty vault yields an empty pack, exit 0', async () => {
  const res = await run('brief', { root, project: 'brief-empty-proj' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.notes, []);
  assert.equal(res.data.usedTokens, 0);
});
