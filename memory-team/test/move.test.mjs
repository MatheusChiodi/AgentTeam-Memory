import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-thing.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'movable', created: '2026-01-01' }, '# thing\nbody');
});
afterEach(() => cleanup(root));

test('move: relocates note and rewrites fm.project', async () => {
  const res = await run('move', { root, pos: ['thing', 'otherproj'] });
  assert.equal(res.ok, true);
  const dest = join(root, 'projects', 'otherproj', 'memory', '2026-01-01-thing.md');
  assert.ok(existsSync(dest));
  assert.ok(!existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-thing.md')));
  const txt = readFileSync(dest, 'utf8');
  assert.match(txt, /project: otherproj/);
  assert.equal(res.data.to, 'projects/otherproj/memory/2026-01-01-thing.md');
});

test('move: keeps board notes in the board folder', async () => {
  seedNote(root, 'testproj', 'board', '2026-01-02-msg.md',
    { type: 'communication', agent: 'a', project: 'testproj', summary: 'note', created: '2026-01-02' }, '# msg');
  const res = await run('move', { root, pos: ['msg', 'otherproj'] });
  assert.equal(res.ok, true);
  assert.ok(existsSync(join(root, 'projects', 'otherproj', 'board', '2026-01-02-msg.md')));
});

test('move: unknown ref fails', async () => {
  const res = await run('move', { root, pos: ['ghost', 'otherproj'] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /no note matches/);
});

test('move: missing target fails', async () => {
  const res = await run('move', { root, pos: ['thing'] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /usage: move/);
});

test('move: refuses to clobber a same-named note in the target project', async () => {
  // The destination project already has a note with the same filename.
  seedNote(root, 'otherproj', 'memory', '2026-01-01-thing.md',
    { type: 'memory', agent: 'b', project: 'otherproj', summary: 'do not lose', created: '2026-01-01' }, '# thing\ndest body');
  const res = await run('move', { root, pos: ['thing', 'otherproj'] });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.lines.join(' '), /already exists/);
  // destination note untouched, source still present
  const dest = readFileSync(join(root, 'projects', 'otherproj', 'memory', '2026-01-01-thing.md'), 'utf8');
  assert.match(dest, /dest body/);
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-thing.md')));
});
