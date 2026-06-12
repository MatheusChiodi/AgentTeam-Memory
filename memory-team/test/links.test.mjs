import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-01' },
    'links [[2026-01-02-b]] and [[ghost-note]]');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t'], created: '2026-01-02' }, 'no outgoing links');
});
after(() => cleanup(root));

test('links: lists outgoing targets flagged resolved/dangling', async () => {
  const res = await run('links', { pos: ['2026-01-01-a'], root });
  assert.equal(res.ok, true);
  const map = Object.fromEntries(res.data.map((d) => [d.target, d.resolved]));
  assert.equal(map['2026-01-02-b'], true);
  assert.equal(map['ghost-note'], false);
});

test('links: a note with no links reports none', async () => {
  const res = await run('links', { pos: ['2026-01-02-b'], root });
  assert.equal(res.ok, true);
  assert.equal(res.data.length, 0);
  assert.match(res.lines.join('\n'), /no outgoing links/);
});

test('links: nonexistent ref errors', async () => {
  const res = await run('links', { pos: ['ghost'], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /no note matches/);
});

test('links: missing ref shows usage', async () => {
  const res = await run('links', { pos: [], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /usage: links/);
});

test('links: --json populates data', async () => {
  const res = await run('links', { pos: ['2026-01-01-a'], opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'target' in d && 'resolved' in d));
});
