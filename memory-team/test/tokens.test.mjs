import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

const PROJ = 'tokens-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'small.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'tiny', tags: ['t'], created: '2026-01-01' }, 'hi');
  seedNote(root, PROJ, 'memory', 'large.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'a much bigger note', tags: ['t'], created: '2026-01-02' },
    'word '.repeat(120));
});
after(() => cleanup(root));

test('tokens <ref>: estimates a single note (title+summary+body)', async () => {
  const res = await run('tokens', { pos: ['large'], root, project: PROJ });
  assert.equal(res.ok, true);
  assert.equal(res.data.perNote.length, 1);
  assert.equal(res.data.perNote[0].name, 'large');
  assert.ok(res.data.total > 0);
  // the large note must cost more than the small one
  const small = await run('tokens', { pos: ['small'], root, project: PROJ });
  assert.ok(res.data.total > small.data.total);
});

test('tokens (aggregate): total, average and per-note list', async () => {
  const res = await run('tokens', { root, project: PROJ });
  assert.equal(res.ok, true);
  assert.equal(res.data.perNote.length, 2);
  const sum = res.data.perNote.reduce((a, n) => a + n.tokens, 0);
  assert.equal(res.data.total, sum);
  // sorted largest-first
  assert.ok(res.data.perNote[0].tokens >= res.data.perNote[1].tokens);
});

test('tokens --text: estimates raw text deterministically', async () => {
  const a = await run('tokens', { opt: { text: 'one two three four five' }, root, project: PROJ });
  const b = await run('tokens', { opt: { text: 'one two three four five' }, root, project: PROJ });
  assert.equal(a.data.tokens, b.data.tokens);
  assert.ok(a.data.tokens > 0);
  assert.equal(a.data.text, 'one two three four five');
});

test('tokens --text "": empty text yields 0, exit 0', async () => {
  const res = await run('tokens', { opt: { text: '' }, root, project: PROJ });
  assert.equal(res.ok, true);
  assert.equal(res.data.tokens, 0);
});

test('tokens --json on a ref exposes { total, perNote }', async () => {
  const res = await run('tokens', { pos: ['small'], opt: { json: true }, root, project: PROJ });
  assert.ok('total' in res.data && Array.isArray(res.data.perNote));
  assert.ok(res.data.perNote[0].name === 'small' && 'tokens' in res.data.perNote[0]);
});

test('tokens <ref>: nonexistent ref errors with exit 1', async () => {
  const res = await run('tokens', { pos: ['ghost'], root, project: PROJ });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('tokens (aggregate): empty project totals 0, exit 0', async () => {
  const res = await run('tokens', { root, project: 'tokens-empty-proj' });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 0);
  assert.deepEqual(res.data.perNote, []);
});
