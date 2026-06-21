import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { makeVault, cleanup, run } from './_helpers.mjs';

// An assistant transcript line as Claude Code writes it: {type,message:{role,usage}}.
const line = (usage, { timestamp, costUSD } = {}) => JSON.stringify({
  type: 'assistant',
  ...(timestamp ? { timestamp } : {}),
  ...(costUSD != null ? { costUSD } : {}),
  message: { role: 'assistant', usage },
});

// A non-assistant line (user turn) — must be ignored by the aggregator.
const userLine = (text) => JSON.stringify({ type: 'user', message: { role: 'user', content: text } });

/** Build a temp transcripts tree: <root>/<project>/<file>.jsonl with given lines. */
function makeTranscripts() {
  const root = mkdtempSync(join(tmpdir(), 'mem-tx-')).replace(/\\/g, '/');

  // projA: two sessions on different days.
  mkdirSync(join(root, 'projA'), { recursive: true });
  writeFileSync(join(root, 'projA', 's1.jsonl'), [
    userLine('hi'),
    line({ input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 10, cache_creation_input_tokens: 5 },
      { timestamp: '2026-06-10T10:00:00Z', costUSD: 0.02 }),
    line({ input_tokens: 200, output_tokens: 100 }, { timestamp: '2026-06-10T11:00:00Z', costUSD: 0.03 }),
  ].join('\n'), 'utf8');
  writeFileSync(join(root, 'projA', 's2.jsonl'), [
    line({ input_tokens: 300, output_tokens: 150 }, { timestamp: '2026-06-15T09:00:00Z', costUSD: 0.05 }),
  ].join('\n'), 'utf8');

  // projB: one session, no cost field (tokens only).
  mkdirSync(join(root, 'projB'), { recursive: true });
  writeFileSync(join(root, 'projB', 's3.jsonl'), [
    line({ input_tokens: 1000, output_tokens: 500 }, { timestamp: '2026-06-15T12:00:00Z' }),
  ].join('\n'), 'utf8');

  return root;
}

// Expected token totals:
//  projA s1 line1: 100+50+10+5 = 165 ; line2: 200+100 = 300  -> day 2026-06-10 = 465
//  projA s2:       300+150 = 450                              -> day 2026-06-15 += 450
//  projB s3:       1000+500 = 1500                            -> day 2026-06-15 += 1500
//  TOTAL tokens = 465 + 450 + 1500 = 2415
//  TOTAL usd    = 0.02 + 0.03 + 0.05 + 0 = 0.10
const TOTAL_TOKENS = 2415;
const TOTAL_USD = 0.10;

let txRoot; let vault;
before(() => {
  txRoot = makeTranscripts();
  vault = makeVault();
});
after(() => {
  rmSync(txRoot, { recursive: true, force: true });
  cleanup(vault);
});

test('usage: aggregates total tokens and cost across transcripts', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot } });
  assert.equal(res.ok, true);
  assert.equal(res.data.totalTokens, TOTAL_TOKENS);
  assert.ok(Math.abs(res.data.totalUsd - TOTAL_USD) < 1e-9, `usd=${res.data.totalUsd}`);
});

test('usage: byDay buckets by line timestamp, chronological', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot } });
  const days = res.data.byDay.map((d) => d.date);
  assert.deepEqual(days, ['2026-06-10', '2026-06-15']);
  const d10 = res.data.byDay.find((d) => d.date === '2026-06-10');
  const d15 = res.data.byDay.find((d) => d.date === '2026-06-15');
  assert.equal(d10.tokens, 465);
  assert.equal(d15.tokens, 1950); // 450 + 1500
  assert.ok(Math.abs(d10.usd - 0.05) < 1e-9);
});

test('usage: ignores cumulative cost.total_cost_usd (A1 — never summed)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mem-tx-cum-')).replace(/\\/g, '/');
  const v = makeVault();
  try {
    mkdirSync(join(dir, 'projX'), { recursive: true });
    // Linha com custo CUMULATIVO da sessão (cost.total_cost_usd) e SEM costUSD per-message:
    // deve contar os tokens mas contribuir 0 USD — somar o cumulativo superestimaria.
    const cumulative = JSON.stringify({
      type: 'assistant',
      timestamp: '2026-06-20T10:00:00Z',
      cost: { total_cost_usd: 99 },
      message: { role: 'assistant', usage: { input_tokens: 10, output_tokens: 5 } },
    });
    writeFileSync(join(dir, 'projX', 's.jsonl'), cumulative, 'utf8');
    const res = await run('usage', { root: v, opt: { dir } });
    assert.equal(res.data.totalTokens, 15);
    assert.equal(res.data.totalUsd, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    cleanup(v);
  }
});

test('usage: byProject buckets by transcripts subdir, heaviest first', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot } });
  const projects = res.data.byProject.map((p) => p.project);
  assert.deepEqual(projects, ['projB', 'projA']); // projB=1500 > projA=915
  const projA = res.data.byProject.find((p) => p.project === 'projA');
  const projB = res.data.byProject.find((p) => p.project === 'projB');
  assert.equal(projA.tokens, 915); // 465 + 450
  assert.equal(projB.tokens, 1500);
});

test('usage: ignores non-assistant lines and lines without usage', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot } });
  // If user lines leaked in, totals would differ; 2415 confirms only assistant usage counted.
  assert.equal(res.data.totalTokens, TOTAL_TOKENS);
});

test('usage: --since filters out earlier days', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot, since: '2026-06-15' } });
  const days = res.data.byDay.map((d) => d.date);
  assert.deepEqual(days, ['2026-06-15']);
  assert.equal(res.data.totalTokens, 1950); // only the 06-15 buckets
});

test('usage: --limit caps byProject and byDay', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot, limit: '1' } });
  assert.equal(res.data.byProject.length, 1);
  assert.equal(res.data.byProject[0].project, 'projB'); // heaviest kept
  assert.equal(res.data.byDay.length, 1);
  assert.equal(res.data.byDay[0].date, '2026-06-15'); // most recent kept
});

test('usage: empty directory yields zeros, exit 0', async () => {
  const empty = mkdtempSync(join(tmpdir(), 'mem-tx-empty-')).replace(/\\/g, '/');
  try {
    const res = await run('usage', { root: vault, opt: { dir: empty } });
    assert.equal(res.ok, true);
    assert.equal(res.data.totalTokens, 0);
    assert.equal(res.data.totalUsd, 0);
    assert.deepEqual(res.data.byDay, []);
    assert.deepEqual(res.data.byProject, []);
    assert.match(res.lines.join('\n'), /no \.jsonl transcripts/);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});

test('usage: nonexistent directory degrades gracefully, exit 0', async () => {
  const res = await run('usage', { root: vault, opt: { dir: join(txRoot, 'does-not-exist') } });
  assert.equal(res.ok, true);
  assert.equal(res.data.totalTokens, 0);
  assert.deepEqual(res.data.byDay, []);
  assert.match(res.lines.join('\n'), /dir not found/);
});

test('usage: --json shape', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot } });
  const { data } = res;
  assert.equal(typeof data.totalUsd, 'number');
  assert.equal(typeof data.totalTokens, 'number');
  assert.ok(Array.isArray(data.byDay));
  assert.ok(Array.isArray(data.byProject));
  assert.deepEqual(Object.keys(data.byDay[0]).sort(), ['date', 'tokens', 'usd']);
  assert.deepEqual(Object.keys(data.byProject[0]).sort(), ['project', 'tokens', 'usd']);
});

test('usage: --save persists a memory note tagged usage', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot, save: true } });
  assert.equal(res.ok, true);
  assert.ok(res.data.saved, 'expected saved metadata');
  assert.equal(res.data.saved.created, true);
  assert.equal(res.data.saved.type, 'memory');

  const file = join(vault, res.data.saved.file);
  assert.equal(existsSync(file), true);
  const text = readFileSync(file, 'utf8');
  assert.match(text, /tags: \[usage, cost, ledger\]/);
  // The body must carry the REAL ledger, not save's generic placeholder.
  assert.match(text, /by day:/);
  assert.match(text, /by project:/);
  assert.match(text, /2,415 tokens/);
  assert.match(text, /2026-06-10/);
  assert.match(text, /projB/);
  assert.doesNotMatch(text, /objective content/);
});

test('usage: falls back to file mtime when a line has no timestamp', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mem-tx-nots-')).replace(/\\/g, '/');
  try {
    mkdirSync(join(root, 'projX'), { recursive: true });
    writeFileSync(join(root, 'projX', 's.jsonl'),
      line({ input_tokens: 10, output_tokens: 5 }), 'utf8'); // no timestamp
    const res = await run('usage', { root: vault, opt: { dir: root } });
    assert.equal(res.data.totalTokens, 15);
    assert.equal(res.data.byDay.length, 1); // bucketed under the file's mtime day
    assert.match(res.data.byDay[0].date, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('usage: does NOT sum cumulative cost.total_cost_usd (A1)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mem-tx-cum-')).replace(/\\/g, '/');
  try {
    mkdirSync(join(root, 'projC'), { recursive: true });
    // Two assistant lines carrying ONLY the cumulative session cost (cost.total_cost_usd),
    // which the statusLine reports. Summing them line-by-line would overcount; usage must
    // ignore this field and report $0 cost (tokens still count).
    const cumLine = (usage, total) => JSON.stringify({
      type: 'assistant', message: { role: 'assistant', usage }, cost: { total_cost_usd: total },
    });
    writeFileSync(join(root, 'projC', 's.jsonl'), [
      cumLine({ input_tokens: 100, output_tokens: 50 }, 0.10),
      cumLine({ input_tokens: 200, output_tokens: 100 }, 0.25), // cumulative, not a delta
    ].join('\n'), 'utf8');
    const res = await run('usage', { root: vault, opt: { dir: root } });
    assert.equal(res.data.totalTokens, 450); // 150 + 300, tokens unaffected
    assert.equal(res.data.totalUsd, 0); // cumulative cost field is NOT summed
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('usage: --limit labels total as "geral" and windows the buckets (A3)', async () => {
  const res = await run('usage', { root: vault, opt: { dir: txRoot, limit: '1' } });
  // JSON total stays the full, unfiltered aggregate.
  assert.equal(res.data.totalTokens, TOTAL_TOKENS);
  const md = res.lines.join('\n');
  assert.match(md, /total geral: 2,415 tokens/); // total is the whole, not the listed row
  assert.match(md, /by day \(last 1\):/);
  assert.match(md, /by project \(top 1\):/);
});

test('usage: byProject unwraps the real ~/.claude/projects slug to a legible label (A2)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mem-tx-slug-')).replace(/\\/g, '/');
  try {
    // Mirrors a real transcript dir: cwd flattened with separators -> double dashes.
    const encoded = 'D--PROJETOS-Sistemas-AgentTeam-Memory';
    mkdirSync(join(root, encoded), { recursive: true });
    writeFileSync(join(root, encoded, 'sess.jsonl'),
      line({ input_tokens: 10, output_tokens: 5 }, { timestamp: '2026-06-15T10:00:00Z' }), 'utf8');
    const res = await run('usage', { root: vault, opt: { dir: root } });
    assert.equal(res.data.byProject.length, 1);
    assert.equal(res.data.byProject[0].project, 'AgentTeam-Memory'); // tail after the final `--`
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
