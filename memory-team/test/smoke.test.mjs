// smoke.test.mjs — proves the modular refactor preserves the original 5 commands,
// both in-process and through the real CLI dispatcher.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, runCli } from './_helpers.mjs';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

test('save: writes an atomic memory note and returns its relative path', async () => {
  const res = await run('save', {
    pos: ['memory', 'Hello World'],
    opt: { agent: 'tester', summary: 'a smoke note', tags: 'alpha,beta', task: 't1' },
    root,
  });
  assert.equal(res.ok, true);
  assert.match(res.data.file, /projects\/testproj\/memory\/.*hello-world\.md$/);
  const full = join(root, res.data.file);
  assert.ok(existsSync(full));
  const txt = readFileSync(full, 'utf8');
  assert.match(txt, /type: memory/);
  assert.match(txt, /summary: "a smoke note"/);
  assert.match(txt, /tags: \[alpha, beta\]/);
  assert.match(txt, /task: t1/);
});

test('search: ranks the saved note for a matching term', async () => {
  const res = await run('search', { pos: ['alpha'], root });
  assert.equal(res.ok, true);
  assert.ok(res.data.length >= 1);
  assert.ok(res.data.some((n) => n.tags.includes('alpha')));
});

test('index: regenerates per-project and master index files', async () => {
  const res = await run('index', { root });
  assert.equal(res.ok, true);
  assert.ok(existsSync(join(root, 'projects', 'testproj', '_index.md')));
  assert.ok(existsSync(join(root, '_index.md')));
});

test('e2e: the real CLI dispatcher saves + searches through a subprocess', () => {
  const r2 = makeVault();
  try {
    const save = runCli(['save', 'decision', 'CLI roundtrip', '--agent', 'tester', '--summary', 'via subprocess'], { root: r2 });
    assert.equal(save.code, 0);
    assert.match(save.stdout, /cli-roundtrip\.md/);

    const search = runCli(['search', 'roundtrip'], { root: r2 });
    assert.equal(search.code, 0);
    assert.match(search.stdout, /1 note\(s\)/);

    const help = runCli([], { root: r2 });
    assert.match(help.stdout, /commands:/);
  } finally {
    cleanup(r2);
  }
});

test('json mode: read commands emit structured data via --json', () => {
  const r3 = makeVault();
  try {
    runCli(['save', 'memory', 'Json note', '--agent', 'tester', '--tags', 'json,test'], { root: r3 });
    const out = runCli(['search', 'json', '--json'], { root: r3 });
    const parsed = JSON.parse(out.stdout);
    assert.ok(Array.isArray(parsed));
    assert.ok(parsed.length >= 1);
  } finally {
    cleanup(r3);
  }
});
