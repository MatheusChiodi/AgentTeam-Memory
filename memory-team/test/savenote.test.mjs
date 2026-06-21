import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup } from './_helpers.mjs';
import { saveNote, readNote, collectNotes } from '../notes.mjs';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

test('saveNote: writes a canonical note discoverable by collectNotes', () => {
  const r = saveNote(root, 'proj', {
    type: 'memory', title: 'My Plan', summary: 'a plan', tags: ['plan'],
    agent: 'executor', body: '## Goal\nship it', created: '2026-06-01',
  });
  assert.equal(r.created, true);
  assert.match(r.file, /projects\/proj\/memory\/2026-06-01-my-plan\.md/);
  const notes = collectNotes(root, { project: 'proj', includeGlobal: false });
  assert.equal(notes.length, 1);
  assert.equal(notes[0].fm.type, 'memory');
  assert.deepEqual(notes[0].tags, ['plan']);
});

test('saveNote: prepends the title heading and keeps the body', () => {
  const r = saveNote(root, 'proj', { title: 'Headed', body: 'content here', created: '2026-06-02' });
  const raw = readFileSync(`${root}/${r.file}`, 'utf8');
  assert.match(raw, /# Headed/);
  assert.match(raw, /content here/);
});

test('saveNote: suffixes on slug collision (-2)', () => {
  saveNote(root, 'coll', { title: 'Dup', created: '2026-06-03' });
  const r2 = saveNote(root, 'coll', { title: 'Dup', created: '2026-06-03' });
  assert.match(r2.file, /2026-06-03-dup-2\.md/);
  assert.equal(r2.created, true);
});

test('saveNote: state notes are idempotent (created:false when present)', () => {
  const a = saveNote(root, 'st', { type: 'state', title: 'executor', created: '2026-06-04' });
  assert.equal(a.created, true);
  const b = saveNote(root, 'st', { type: 'state', title: 'executor', created: '2026-06-05' });
  assert.equal(b.created, false);
  assert.equal(b.file, a.file);
});

test('saveNote: normalizes related into canonical "[[name]]" via formatNote', () => {
  const r = saveNote(root, 'rel', { title: 'Linker', related: ['other-note', '[[third]]'], created: '2026-06-06' });
  const note = readNote(`${root}/${r.file}`);
  // wikilinks survive the round-trip regardless of input form
  assert.ok(note.fm.related.some((x) => x.includes('other-note')));
  assert.ok(note.fm.related.some((x) => x.includes('third')));
});

test('saveNote: requires a title', () => {
  assert.throws(() => saveNote(root, 'x', { title: '' }), /title is required/);
});
