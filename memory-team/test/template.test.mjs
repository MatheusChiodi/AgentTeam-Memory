import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run } from './_helpers.mjs';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

/** Resolve a note record's body file from a command result. */
function readCreated(res) {
  const abs = join(root, res.data.file);
  return readFileSync(abs, 'utf8');
}

test('template list: shows the built-ins', async () => {
  const res = await run('template', { root, pos: ['list'] });
  assert.equal(res.ok, true);
  const names = res.data.templates.map((t) => t.name);
  for (const n of ['decision', 'learning', 'meeting']) assert.ok(names.includes(n), `missing ${n}`);
  // decision template declares the decision type, not the default memory.
  const dec = res.data.templates.find((t) => t.name === 'decision');
  assert.equal(dec.type, 'decision');
});

test('template list: empty positional behaves like list', async () => {
  const res = await run('template', { root, pos: [] });
  assert.equal(res.ok, true);
  assert.ok(res.data.templates.length >= 3);
});

test('template <name>: creates a note with the skeleton and filled placeholders', async () => {
  const res = await run('template', {
    root,
    pos: ['learning', 'Cache invalidation gotcha'],
    opt: { agent: 'executor', tags: 'cache,bug' },
  });
  assert.equal(res.ok, true);
  assert.equal(res.data.created, true);
  assert.equal(res.data.template, 'learning');
  assert.equal(res.data.type, 'learning');

  const text = readCreated(res);
  // Frontmatter from save is preserved.
  assert.match(text, /type: learning/);
  assert.match(text, /agent: executor/);
  assert.match(text, /tags: \[cache, bug\]/);
  // Template sections present.
  assert.match(text, /## What I learned/);
  assert.match(text, /## Evidence/);
  assert.match(text, /## How to apply/);
  // {{title}} placeholder filled; {{project}} filled with the test project.
  assert.match(text, /# Cache invalidation gotcha/);
  assert.match(text, /testproj/);
  // No raw placeholders left behind.
  assert.doesNotMatch(text, /\{\{/);
});

test('template decision: uses the type the template declares', async () => {
  const res = await run('template', {
    root,
    pos: ['decision', 'Adopt zero-dep policy'],
    opt: { agent: 'lead' },
  });
  assert.equal(res.data.type, 'decision');
  const text = readCreated(res);
  assert.match(text, /type: decision/);
  assert.match(text, /## Context/);
  assert.match(text, /## Options/);
  assert.match(text, /## Decision/);
  assert.match(text, /## Consequences/);
  // agent placeholder substituted in the Decision section.
  assert.match(text, /lead/);
});

test('template: agent defaults to teammate when not given', async () => {
  const res = await run('template', { root, pos: ['meeting', 'Standup notes'] });
  const text = readCreated(res);
  assert.match(text, /agent: teammate/);
  assert.match(text, /## Participants/);
  assert.match(text, /## Actions/);
});

test('template: unknown name fails with exit 1 and writes nothing', async () => {
  const memDir = join(root, 'projects', 'testproj', 'memory');
  const before = existsSync(memDir) ? readdirSync(memDir).length : 0;
  const res = await run('template', { root, pos: ['nope', 'Whatever'] });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.lines.join('\n'), /unknown template/);
  assert.match(res.lines.join('\n'), /decision/); // lists the valid ones
  const after = existsSync(memDir) ? readdirSync(memDir).length : 0;
  assert.equal(after, before, 'no note should be written on a bad template');
});

test('template: missing title fails cleanly', async () => {
  const res = await run('template', { root, pos: ['learning'] });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
});

test('template: vault _templates/ override is picked up', async () => {
  const vr = makeVault();
  try {
    const tdir = join(vr, '_templates');
    mkdirSync(tdir, { recursive: true });
    writeFileSync(join(tdir, 'incident.md'),
      '---\ntype: memory\n---\n# {{title}}\n\n## Impact\n(for {{project}} on {{date}})\n', 'utf8');

    const list = await run('template', { root: vr, pos: ['list'] });
    assert.ok(list.data.templates.some((t) => t.name === 'incident' && t.source === 'vault'));

    const res = await run('template', { root: vr, pos: ['incident', 'DB outage'], opt: { agent: 'ops' } });
    assert.equal(res.ok, true);
    const text = readFileSync(join(vr, res.data.file), 'utf8');
    assert.match(text, /# DB outage/);
    assert.match(text, /## Impact/);
    assert.doesNotMatch(text, /\{\{/);
  } finally {
    cleanup(vr);
  }
});

test('template type:state: second run preserves the first body, reports created:false (B1)', async () => {
  const vr = makeVault();
  try {
    const tdir = join(vr, '_templates');
    mkdirSync(tdir, { recursive: true });
    // A vault template that declares the (idempotent) state type.
    writeFileSync(join(tdir, 'st.md'), '---\ntype: state\n---\n# {{title}}\n\nscaffolded state body\n', 'utf8');

    // First run: save creates the state note; template fills the skeleton.
    const first = await run('template', { root: vr, pos: ['st', 'Estado Z'], opt: { agent: 'z' } });
    assert.equal(first.ok, true);
    assert.equal(first.data.created, true);
    const file = join(vr, first.data.file);
    const original = readFileSync(file, 'utf8');
    assert.match(original, /scaffolded state body/);

    // Second run: save is idempotent for state (created:false); the template MUST NOT
    // rewrite the body — the first scaffold survives byte-for-byte.
    const second = await run('template', { root: vr, pos: ['st', 'Estado Z'], opt: { agent: 'z' } });
    assert.equal(second.data.created, false, 'second run must report created:false, not clobber');
    assert.equal(readFileSync(file, 'utf8'), original, 'existing state body must survive untouched');
  } finally {
    cleanup(vr);
  }
});

test('template: re-running never overwrites an existing note body (idempotency, B1)', async () => {
  const vr = makeVault();
  try {
    // First creation.
    const a = await run('template', { root: vr, pos: ['learning', 'Same title'], opt: { agent: 'x' } });
    assert.equal(a.data.created, true);
    const file = join(vr, a.data.file);
    const original = readFileSync(file, 'utf8');

    // Second creation with the same title: save dedups to a *new* file (-2.md),
    // so the original body must remain byte-for-byte intact.
    const b = await run('template', { root: vr, pos: ['learning', 'Same title'], opt: { agent: 'x' } });
    assert.notEqual(b.data.file, a.data.file, 'expected a deduped second file');
    assert.equal(readFileSync(file, 'utf8'), original, 'first note body must be untouched');
  } finally {
    cleanup(vr);
  }
});

test('template: unknown placeholder is left literal (A1 contract)', async () => {
  const vr = makeVault();
  try {
    const tdir = join(vr, '_templates');
    mkdirSync(tdir, { recursive: true });
    writeFileSync(join(tdir, 'extra.md'),
      '---\ntype: memory\n---\n# {{title}}\n\nowner: {{owner}}\nseen on {{date}}\n', 'utf8');

    const res = await run('template', { root: vr, pos: ['extra', 'With extras'], opt: { agent: 'a' } });
    assert.equal(res.ok, true);
    const text = readFileSync(join(vr, res.data.file), 'utf8');
    assert.match(text, /# With extras/);       // known placeholder filled
    assert.match(text, /seen on \d{4}-\d{2}-\d{2}/); // {{date}} filled
    assert.match(text, /owner: \{\{owner\}\}/); // {{owner}} preserved literally
  } finally {
    cleanup(vr);
  }
});

test('template: --json create shape', async () => {
  const res = await run('template', { root, pos: ['decision', 'JSON shape check'], opt: { json: true, agent: 'x' } });
  assert.deepEqual(Object.keys(res.data).sort(), ['created', 'file', 'template', 'type'].sort());
  assert.equal(res.data.created, true);
  assert.equal(res.data.template, 'decision');
  assert.ok(res.data.file.endsWith('.md'));
});
