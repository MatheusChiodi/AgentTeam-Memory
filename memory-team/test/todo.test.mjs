import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'td', 'memory', 'tasks.md',
    { type: 'memory', project: 'td', agent: 'x', summary: 'task list', tags: ['t'], created: '2026-06-10' },
    '## Tasks\n- [ ] write the parser\n- [ ] write the tests\n- [x] read the spec');
  seedNote(root, 'td', 'memory', 'other.md',
    { type: 'memory', project: 'td', agent: 'x', summary: 'more', tags: ['t'], created: '2026-06-11' },
    '- [ ] deploy to prod');
  seedNote(root, 'td', 'memory', 'plain.md',
    { type: 'memory', project: 'td', agent: 'x', summary: 'no boxes', tags: ['t'], created: '2026-06-12' },
    'just prose, no checkboxes here');
});
after(() => cleanup(root));

test('todo: lists open checkboxes grouped by note', async () => {
  const res = await run('todo', { project: 'td', root });
  assert.equal(res.ok, true);
  assert.equal(res.data.open, 3); // 2 in tasks + 1 in other
  assert.equal(res.data.done, 1);
  const openTexts = res.data.items.filter((i) => !i.checked).map((i) => i.text);
  assert.ok(openTexts.includes('write the parser'));
  assert.ok(openTexts.includes('deploy to prod'));
});

test('todo: default output hides done; --done shows them', async () => {
  const plain = await run('todo', { project: 'td', root });
  assert.ok(!plain.lines.join('\n').includes('read the spec'));
  const withDone = await run('todo', { opt: { done: true }, project: 'td', root });
  assert.match(withDone.lines.join('\n'), /read the spec/);
});

test('todo: --json returns { open, done, items }', async () => {
  const res = await run('todo', { opt: { json: true }, project: 'td', root });
  assert.ok('open' in res.data && 'done' in res.data && 'items' in res.data);
  assert.ok(res.data.items.every((i) => 'note' in i && 'text' in i && 'checked' in i));
});

test('todo: no checkboxes anywhere → empty list, exit 0', async () => {
  const res = await run('todo', { project: 'tdempty', root });
  assert.equal(res.ok, true);
  assert.equal(res.data.open, 0);
  assert.deepEqual(res.data.items, []);
  assert.match(res.lines.join('\n'), /no checkboxes/);
});

test('todo check: flips a unique open checkbox and persists on disk', async () => {
  const res = await run('todo', { pos: ['check', 'tasks', 'parser'], project: 'td', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, { note: 'tasks', text: 'write the parser', checked: true });
  const raw = readFileSync(`${root}/projects/td/memory/tasks.md`, 'utf8');
  assert.match(raw, /- \[x\] write the parser/);
  // the other open item stays open
  assert.match(raw, /- \[ \] write the tests/);
});

test('todo check: ambiguous text matches multiple → exit 1, no flip', async () => {
  seedNote(root, 'amb', 'memory', 'two.md',
    { type: 'memory', project: 'amb', agent: 'x', summary: 's', tags: ['t'], created: '2026-06-13' },
    '- [ ] write the alpha doc\n- [ ] write the beta doc');
  const res = await run('todo', { pos: ['check', 'two', 'write the'], project: 'amb', root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /ambiguous/);
  const raw = readFileSync(`${root}/projects/amb/memory/two.md`, 'utf8');
  assert.match(raw, /- \[ \] write the alpha doc/); // unchanged
});

test('todo check: no matching open checkbox → exit 1', async () => {
  const res = await run('todo', { pos: ['check', 'other', 'nonexistent'], project: 'td', root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no open checkbox/);
});

test('todo check: nonexistent ref → exit 1', async () => {
  const res = await run('todo', { pos: ['check', 'ghost', 'x'], project: 'td', root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('todo check: preserves an unknown frontmatter field after rewrite', async () => {
  seedNote(root, 'keep', 'memory', 'kept.md',
    { type: 'memory', project: 'keep', agent: 'x', summary: 's', tags: ['t'], custom: 'keepme', created: '2026-06-14' },
    '- [ ] flip me please');
  const res = await run('todo', { pos: ['check', 'kept', 'flip me'], project: 'keep', root });
  assert.equal(res.ok, true);
  const raw = readFileSync(`${root}/projects/keep/memory/kept.md`, 'utf8');
  assert.match(raw, /custom: keepme/);
  assert.match(raw, /- \[x\] flip me please/);
});

test('todo check: missing args shows usage, exit 1', async () => {
  const res = await run('todo', { pos: ['check'], project: 'td', root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /usage: todo check/);
});
