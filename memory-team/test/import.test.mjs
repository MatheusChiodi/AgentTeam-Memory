import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run } from './_helpers.mjs';

let root;
beforeEach(() => { root = makeVault(); });
afterEach(() => cleanup(root));

function writeBundle(file, notes) {
  writeFileSync(file, JSON.stringify(notes), 'utf8');
}

test('import: loads a bundle into the project memory folder', async () => {
  const bundle = join(root, 'bundle.json');
  writeBundle(bundle, [
    { fm: { type: 'memory', agent: 'a', summary: 'Imported One', created: '2026-01-01' }, body: '# Imported One\nbody' },
    { fm: { type: 'decision', agent: 'b', summary: 'Imported Two', created: '2026-01-02' }, body: '# Imported Two' },
  ]);
  const res = await run('import', { root, pos: [bundle] });
  assert.equal(res.ok, true);
  assert.equal(res.data.imported, 2);
  const f1 = join(root, 'projects', 'testproj', 'memory', '2026-01-01-imported-one.md');
  assert.ok(existsSync(f1));
  const txt = readFileSync(f1, 'utf8');
  assert.match(txt, /project: testproj/);
  assert.match(txt, /type: memory/);
});

test('import: --project targets another project', async () => {
  const bundle = join(root, 'b2.json');
  writeBundle(bundle, [{ fm: { type: 'memory', agent: 'a', summary: 'X', created: '2026-01-01' }, body: '# X' }]);
  const res = await run('import', { root, pos: [bundle], opt: { project: 'archive-proj' } });
  assert.equal(res.ok, true);
  assert.ok(existsSync(join(root, 'projects', 'archive-proj', 'memory', '2026-01-01-x.md')));
});

test('import: avoids overwriting with a -2 suffix', async () => {
  const bundle = join(root, 'dup.json');
  writeBundle(bundle, [
    { fm: { type: 'memory', agent: 'a', summary: 'Same', created: '2026-01-01' }, body: '# Same' },
    { fm: { type: 'memory', agent: 'a', summary: 'Same', created: '2026-01-01' }, body: '# Same again' },
  ]);
  const res = await run('import', { root, pos: [bundle] });
  assert.equal(res.data.imported, 2);
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-same.md')));
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-same-2.md')));
});

test('import: missing file fails', async () => {
  const res = await run('import', { root, pos: [join(root, 'nope.json')] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /file not found/);
});

test('import: invalid JSON fails', async () => {
  const bad = join(root, 'bad.json');
  writeFileSync(bad, '{ not valid', 'utf8');
  const res = await run('import', { root, pos: [bad] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /invalid JSON/);
});
