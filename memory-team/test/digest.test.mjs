import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

// Use today's date so the default (--since = today) window is exercised deterministically.
const TODAY = (() => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

let root;
before(() => {
  root = makeVault();
  // Old notes (outside the default window).
  seedNote(root, 'testproj', 'memory', '2026-01-01-old.md',
    { type: 'memory', agent: 'researcher', project: 'testproj', summary: 'old research', created: '2026-01-01' }, '# Old research note');
  seedNote(root, 'testproj', 'memory', '2026-03-05-mid.md',
    { type: 'decision', agent: 'executor', project: 'testproj', summary: 'mid decision', created: '2026-03-05' }, '# Mid decision');
  // Today's notes (inside the default window), across agents and types.
  seedNote(root, 'testproj', 'memory', `${TODAY}-r.md`,
    { type: 'memory', agent: 'researcher', project: 'testproj', summary: 'fresh research', created: TODAY }, '# Fresh research title');
  seedNote(root, 'testproj', 'memory', `${TODAY}-e.md`,
    { type: 'decision', agent: 'executor', project: 'testproj', summary: 'fresh decision', created: TODAY }, '# Fresh decision');
  seedNote(root, 'testproj', 'memory', `${TODAY}-e2.md`,
    { type: 'memory', agent: 'executor', project: 'testproj', summary: 'second exec note', created: TODAY }, '# Second exec note');
});
after(() => cleanup(root));

test('digest: default since=today picks only today notes', async () => {
  const res = await run('digest', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.since, TODAY);
  assert.equal(res.data.total, 3);
  assert.equal(res.data.notes.every((n) => n.created === TODAY), true);
});

test('digest: groups by agent with correct counts', async () => {
  const res = await run('digest', { root });
  assert.equal(res.data.byAgent.executor, 2);
  assert.equal(res.data.byAgent.researcher, 1);
  const md = res.lines.join('\n');
  assert.match(md, /## by agent/);
  assert.match(md, /### executor \(2\)/);
  assert.match(md, /### researcher \(1\)/);
});

test('digest: groups by type with correct counts', async () => {
  const res = await run('digest', { root });
  assert.equal(res.data.byType.memory, 2);
  assert.equal(res.data.byType.decision, 1);
  const md = res.lines.join('\n');
  assert.match(md, /## by type/);
  assert.match(md, /### memory \(2\)/);
  assert.match(md, /### decision \(1\)/);
});

test('digest: --since filters to a wider window', async () => {
  const res = await run('digest', { root, opt: { since: '2026-03-01' } });
  // mid (2026-03-05) + the 3 today notes.
  assert.equal(res.data.total, 4);
  assert.equal(res.data.since, '2026-03-01');
});

test('digest: bullets show the real title (alias) and summary', async () => {
  const res = await run('digest', { root });
  const md = res.lines.join('\n');
  // [[name|título]] — summary : title from the body's `# heading`, not the basename.
  assert.match(md, /- \[\[.*-r\|Fresh research title\]\] — fresh research/);
});

test('digest: empty window degrades gracefully, exit 0', async () => {
  const res = await run('digest', { root, opt: { since: '2099-01-01' } });
  assert.equal(res.ok, true);
  assert.equal(res.data.total, 0);
  assert.deepEqual(res.data.byAgent, {});
  assert.deepEqual(res.data.byType, {});
  assert.match(res.lines.join('\n'), /nenhuma nota na janela/);
});

test('digest: --json shape', async () => {
  const res = await run('digest', { root });
  const { data } = res;
  assert.equal(typeof data.since, 'string');
  assert.equal(typeof data.total, 'number');
  assert.equal(typeof data.byAgent, 'object');
  assert.equal(typeof data.byType, 'object');
  assert.ok(Array.isArray(data.notes));
  const n = data.notes[0];
  assert.deepEqual(Object.keys(n).sort(), ['agent', 'created', 'name', 'summary', 'type']);
});

test('digest: --since falls back to mtime when created is absent', async () => {
  // Note with no `created` frontmatter; only its mtime places it in the window.
  const file = seedNote(root, 'testproj', 'memory', 'no-created.md',
    { type: 'learning', agent: 'reviewer', project: 'testproj', summary: 'no created field' }, '# No created');
  const t = new Date(`${TODAY}T12:00:00`);
  utimesSync(file, t, t);
  const res = await run('digest', { root });
  assert.ok(res.data.notes.some((n) => n.name === 'no-created'),
    'expected the created-less note to surface via mtime fallback');
  assert.equal(res.data.byAgent.reviewer, 1);
});

test('digest: --save persists the actual digest markdown as the note body', async () => {
  const res = await run('digest', { root, opt: { save: true } });
  assert.equal(res.ok, true);
  assert.ok(res.data.saved, 'expected saved metadata');
  assert.equal(res.data.saved.created, true);
  assert.equal(res.data.saved.type, 'memory');

  const file = join(root, res.data.saved.file);
  assert.equal(existsSync(file), true);
  const text = readFileSync(file, 'utf8');
  // Frontmatter: tag + source wikilinks in related.
  assert.match(text, /tags: \[digest\]/);
  assert.match(text, /related: \[.*\[\[.*-r\]\].*\]/);
  // BODY must contain the real digest, not save's placeholder.
  assert.match(text, /## by agent/);
  assert.match(text, /## by type/);
  assert.match(text, /### executor \(2\)/);
  assert.doesNotMatch(text, /objective content — use \[\[wikilinks\]\]/);
});

test('digest: --save on empty window still creates a note', async () => {
  const res = await run('digest', { root, opt: { save: true, since: '2099-01-01' } });
  assert.equal(res.ok, true);
  assert.ok(res.data.saved);
  assert.equal(res.data.saved.created, true);
  const text = readFileSync(join(root, res.data.saved.file), 'utf8');
  assert.match(text, /nenhuma nota na janela/);
});
