import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-alpha.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'alpha summary', tags: ['t1'], created: '2026-01-01' }, 'alpha body');
  seedNote(root, 'testproj', 'memory', '2026-01-02-alphabet.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'beta summary', tags: ['t2'], created: '2026-01-02' }, 'beta body');
});
after(() => cleanup(root));

test('show: prints fm + body for an exact basename', async () => {
  const res = await run('show', { pos: ['2026-01-01-alpha'], root });
  assert.equal(res.ok, true);
  assert.equal(res.data.fm.summary, 'alpha summary');
  assert.match(res.data.body, /alpha body/);
  assert.match(res.lines[0], /type: memory/);
});

test('show: nonexistent ref errors', async () => {
  const res = await run('show', { pos: ['does-not-exist'], root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('show: ambiguous ref lists candidates (ok:true)', async () => {
  const res = await run('show', { pos: ['alpha'], root });
  assert.equal(res.ok, true);
  assert.equal(res.data.ambiguous, true);
  assert.equal(res.data.candidates.length, 2);
});

test('show: missing ref shows usage', async () => {
  const res = await run('show', { pos: [], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /usage: show/);
});
