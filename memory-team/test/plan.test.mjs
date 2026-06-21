import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run } from './_helpers.mjs';
import { readNote, formatNote } from '../notes.mjs';
import { writeFileSync } from 'node:fs';

process.env.NO_COLOR = '1';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

test('plan: creates a memory note tagged plan with the fixed sections', async () => {
  const res = await run('plan', { pos: ['ship', 'the', 'feature'], project: 'planp', root });
  assert.equal(res.ok, true);
  assert.match(res.data.path, /projects\/planp\/memory\/.*-ship-the-feature\.md/);
  const raw = readFileSync(`${root}/${res.data.path}`, 'utf8');
  assert.match(raw, /tags: \[plan\]/);
  assert.match(raw, /## Objetivo/);
  assert.match(raw, /## Passos/);
  assert.match(raw, /## Riscos/);
  assert.match(raw, /## Pronto quando/);
  assert.match(raw, /ship the feature/);
});

test('plan: --steps become open checkboxes in Passos', async () => {
  const res = await run('plan', { pos: ['build x'], opt: { steps: 'design;code;test' }, project: 'planp', root });
  assert.deepEqual(res.data.steps, ['design', 'code', 'test']);
  const raw = readFileSync(`${root}/${res.data.path}`, 'utf8');
  assert.match(raw, /- \[ \] design/);
  assert.match(raw, /- \[ \] code/);
  assert.match(raw, /- \[ \] test/);
});

test('plan: empty objective errors with exit 1 and writes nothing', async () => {
  const res = await run('plan', { pos: [], project: 'planp', root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /usage: plan/);
});

test('plan: --json returns { name, path, steps }', async () => {
  const res = await run('plan', { pos: ['json plan'], opt: { json: true, steps: 'a;b' }, project: 'planj', root });
  assert.ok('name' in res.data && 'path' in res.data && 'steps' in res.data);
  assert.deepEqual(res.data.steps, ['a', 'b']);
  assert.match(res.data.name, /json-plan/);
});

test('plan: empty --steps yields a placeholder checkbox, no steps', async () => {
  const res = await run('plan', { pos: ['no steps plan'], project: 'plann', root });
  assert.deepEqual(res.data.steps, []);
  const raw = readFileSync(`${root}/${res.data.path}`, 'utf8');
  assert.match(raw, /- \[ \] \(defina os passos\)/);
});

test('plan: slug collision suffixes the filename (-2)', async () => {
  const a = await run('plan', { pos: ['dup plan'], project: 'planc', root });
  const b = await run('plan', { pos: ['dup plan'], project: 'planc', root });
  assert.notEqual(a.data.path, b.data.path);
  assert.match(b.data.path, /-dup-plan-2\.md/);
});

test('plan: the canonical write preserves an unknown frontmatter field (round-trip)', async () => {
  // plan writes via saveNote→formatNote; prove that an extra/unknown FM key on a
  // plan note survives a formatNote rewrite (the same mechanism plan/todo rely on).
  const res = await run('plan', { pos: ['guarded plan'], project: 'plang', root });
  const note = readNote(`${root}/${res.data.path}`);
  const fm = { ...note.fm, custom: 'keepme' };
  writeFileSync(note.file, formatNote(fm, note.body), 'utf8');
  const raw = readFileSync(note.file, 'utf8');
  assert.match(raw, /custom: keepme/);
  assert.match(raw, /tags: \[plan\]/);
  // objective text untouched after the rewrite
  assert.match(raw, /guarded plan/);
});
