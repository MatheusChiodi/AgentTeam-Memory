import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

test('validate: clean vault passes with ok=true', async () => {
  const r = makeVault();
  try {
    seedNote(r, 'testproj', 'memory', '2026-01-01-good.md',
      { type: 'memory', agent: 'a', project: 'testproj', summary: 'fine', created: '2026-01-01' }, '# good');
    const res = await run('validate', { root: r });
    assert.equal(res.ok, true);
    assert.equal(res.code ?? 0, 0);
    assert.equal(res.data.issues.length, 0);
    assert.match(res.lines.join('\n'), /all notes valid/);
  } finally {
    cleanup(r);
  }
});

test('validate: flags problems and returns code 1', async () => {
  seedNote(root, 'testproj', 'memory', '2026-01-01-bad.md',
    { type: 'wrongtype', agent: 'a', project: 'testproj', summary: '', created: 'not-a-date' }, '# bad');
  const res = await run('validate', { root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.equal(res.data.ok, false);
  assert.equal(res.data.issues.length, 1);
  const probs = res.data.issues[0].problems.join(' | ');
  assert.match(probs, /invalid type/);
  assert.match(probs, /empty summary/);
  assert.match(probs, /malformed created/);
});

test('validate: missing agent is reported', async () => {
  const r = makeVault();
  try {
    seedNote(r, 'testproj', 'memory', '2026-01-01-noagent.md',
      { type: 'memory', project: 'testproj', summary: 'x', created: '2026-01-01' }, '# n');
    const res = await run('validate', { root: r });
    assert.equal(res.ok, false);
    assert.match(res.data.issues[0].problems.join(' '), /missing agent/);
  } finally {
    cleanup(r);
  }
});
