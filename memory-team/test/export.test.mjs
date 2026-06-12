import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'first', created: '2026-01-01' }, '# a\nbody a');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'second', created: '2026-01-02' }, '# b\nbody b');
});
after(() => cleanup(root));

test('export: default json returns array of notes in lines', async () => {
  const res = await run('export', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.format, 'json');
  assert.equal(res.data.count, 2);
  const parsed = JSON.parse(res.lines[0]);
  assert.equal(parsed.length, 2);
  assert.ok(parsed[0].fm && parsed[0].body !== undefined);
});

test('export: md format concatenates with separators', async () => {
  const res = await run('export', { root, opt: { format: 'md' } });
  assert.equal(res.data.format, 'md');
  assert.match(res.lines[0], /\n\n---\n\n/);
});

test('export: --out writes a file', async () => {
  const out = join(root, 'dump.json');
  const res = await run('export', { root, opt: { out } });
  assert.equal(res.ok, true);
  assert.equal(res.data.out, out);
  assert.ok(existsSync(out));
  const parsed = JSON.parse(readFileSync(out, 'utf8'));
  assert.equal(parsed.length, 2);
  assert.match(res.lines[0], /wrote .* \(2 notes\)/);
});

test('export: empty project yields zero count', async () => {
  const res = await run('export', { root, project: 'nope' });
  assert.equal(res.data.count, 0);
});
