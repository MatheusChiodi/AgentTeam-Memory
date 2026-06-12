import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';
import { parseFM } from '../lib.mjs';

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

test('export -> import round-trip preserves frontmatter, related and body', async () => {
  const rt = makeVault();
  try {
    // Seed via the real `save` so the on-disk form is the canonical one.
    await run('save', {
      root: rt, project: 'rtsrc', pos: ['memory', 'Round Trip'],
      opt: {
        agent: 'alpha', tags: 'x,y', summary: 'has "inner" quotes, and a comma', task: '7',
      },
    });
    // Inject a related entry (and a degraded triple form) to exercise canonicalization.
    seedNote(rt, 'rtsrc', 'memory', '2026-01-09-rel.md',
      { type: 'memory', project: 'rtsrc', agent: 'a', summary: 'with rel', tags: ['z'], related: ['[[a]]', '[[b]]'], created: '2026-01-09' },
      '# rel\nbody with [[a]]');

    const out = join(rt, 'bundle.json');
    const exp = await run('export', { root: rt, project: 'rtsrc', opt: { out } });
    assert.equal(exp.ok, true);

    const imp = await run('import', { root: rt, project: 'rtdst', pos: [out], opt: { project: 'rtdst' } });
    assert.equal(imp.ok, true);

    const srcDir = join(rt, 'projects', 'rtsrc', 'memory');
    const dstDir = join(rt, 'projects', 'rtdst', 'memory');
    // `import` derives the dest filename from the summary, so match notes by summary,
    // then compare content byte-for-byte modulo the rewritten project line.
    const norm = (s) => s.replace(/^project: .*$/m, 'project: X');
    const bySummary = (dir) => {
      const m = new Map();
      for (const f of readdirSync(dir)) {
        const txt = readFileSync(join(dir, f), 'utf8');
        m.set(parseFM(txt).fm.summary, txt);
      }
      return m;
    };
    const src = bySummary(srcDir);
    const dst = bySummary(dstDir);
    assert.equal(dst.size, src.size);

    // The note created via `save` is already canonical: a round-trip must reproduce it
    // byte-for-byte (modulo the rewritten project line) — proving no escaping drift.
    // (Match by substring: the kernel's `save` escapes inner quotes when it stores the
    // summary, so the parsed key carries a literal backslash — we don't depend on its form.)
    const savedKey = [...src.keys()].find((k) => k.includes('inner'));
    assert.ok(savedKey, 'expected the saved note in the source export');
    assert.ok(dst.has(savedKey), 'imported note for the saved key is missing');
    assert.equal(
      norm(dst.get(savedKey)),
      norm(src.get(savedKey)),
      'round-trip altered the canonical saved note',
    );

    // The hand-seeded note carried a degraded `related: [[[a]], [[b]]]`; the round-trip
    // must canonicalize it to `["[[a]]", "[[b]]"]` — no bracket multiplication.
    const relDst = dst.get('with rel');
    const fm = parseFM(relDst).fm;
    assert.deepEqual(fm.related, ['[[a]]', '[[b]]']);
    assert.equal(fm.project, 'rtdst');
    assert.doesNotMatch(relDst, /\[\[\[/);
    assert.doesNotMatch(relDst, /\\\\"/); // no doubled backslash-escape leaking in
  } finally {
    cleanup(rt);
  }
});
