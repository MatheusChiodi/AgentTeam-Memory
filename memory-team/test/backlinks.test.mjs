import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  // a -> target, b -> target, c -> (nothing), target -> a
  seedNote(root, 'testproj', 'memory', '2026-01-01-target.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-01' }, 'see [[2026-01-02-a]]');
  seedNote(root, 'testproj', 'memory', '2026-01-02-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-02' }, 'links [[2026-01-01-target]]');
  seedNote(root, 'testproj', 'memory', '2026-01-03-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-03' }, 'also [[2026-01-01-target]]');
  seedNote(root, 'testproj', 'memory', '2026-01-04-c.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-04' }, 'no links here');
});
after(() => cleanup(root));

test('backlinks: finds every note linking to the target', async () => {
  const res = await run('backlinks', { pos: ['2026-01-01-target'], root });
  assert.equal(res.ok, true);
  const names = res.data.map((n) => n.name).sort();
  assert.deepEqual(names, ['2026-01-02-a', '2026-01-03-b']);
});

test('backlinks: a note with no inbound links reports none', async () => {
  const res = await run('backlinks', { pos: ['2026-01-04-c'], root });
  assert.equal(res.ok, true);
  assert.equal(res.data.length, 0);
  assert.match(res.lines.join('\n'), /no backlinks/);
});

test('backlinks: nonexistent ref errors', async () => {
  const res = await run('backlinks', { pos: ['ghost'], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /no note matches/);
});

test('backlinks: missing ref shows usage', async () => {
  const res = await run('backlinks', { pos: [], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /usage: backlinks/);
});

test('backlinks: --json populates data', async () => {
  const res = await run('backlinks', { pos: ['2026-01-01-target'], opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'name' in d && 'file' in d));
});
