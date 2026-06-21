// statusline.test.mjs — F11/US-047. Testa a render do statusLine alimentando payloads
// sintéticos (in-process, funções puras) + e2e via subprocesso (stdin / --demo).
// NO_COLOR garante saída em texto puro, para asserts estáveis sem códigos ANSI.
process.env.NO_COLOR = '1';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { makeVault, cleanup, seedNote } from './_helpers.mjs';
import {
  render, windowLimit, contextPct, contextFromTranscript, bar, planSegment, memSegment, sevOf, loadConfig,
} from '../statusline.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATUSLINE = join(HERE, '..', 'statusline.mjs');
const CFG = { 'statusline.warn': 70, 'statusline.danger': 90, 'statusline.barWidth': 10 };

const sub = (payload, env = {}) =>
  execFileSync(process.execPath, [STATUSLINE], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', ...env },
  });

// ── plano (a feature-estrela) ────────────────────────────────────────────────────
test('plan: shows five_hour and seven_day usage from rate_limits', () => {
  const out = planSegment({ five_hour: { used_percentage: 23 }, seven_day: { used_percentage: 41 } }, CFG);
  assert.match(out, /plan 5h 23%/);
  assert.match(out, /7d 41%/);
});

test('plan: degrades to n/a when rate_limits absent (API key)', () => {
  assert.match(planSegment(undefined, CFG), /plan n\/a/);
  assert.match(planSegment({}, CFG), /plan n\/a/);
});

test('plan: degrades each window independently (5h present, 7d missing)', () => {
  const out = planSegment({ five_hour: { used_percentage: 12 } }, CFG);
  assert.match(out, /5h 12%/);
  assert.doesNotMatch(out, /7d/);
  assert.doesNotMatch(out, /undefined/);
});

test('plan: resets_at in the past clamps to "agora", never negative', () => {
  const out = planSegment({ five_hour: { used_percentage: 50, resets_at: 1 } }, CFG);
  assert.match(out, /agora/);
  assert.doesNotMatch(out, /-\d/);
});

test('plan: reset falls back to seven_day when five_hour absent (A1)', () => {
  const future = Math.floor(Date.now() / 1000) + 7200; // +2h
  const out = planSegment({ seven_day: { used_percentage: 30, resets_at: future } }, CFG);
  assert.match(out, /7d 30%/);
  assert.match(out, /⟳/); // o reset do 7d aparece, não some
});

// ── limite da janela ──────────────────────────────────────────────────────────────
test('windowLimit: context_window_size wins', () => {
  assert.equal(windowLimit({ context_window: { context_window_size: 500000 } }), 500000);
});
test('windowLimit: [1m] model id → 1M', () => {
  assert.equal(windowLimit({ model: { id: 'claude-opus-4-8[1m]' } }), 1_000_000);
});
test('windowLimit: plain model → 200k, exceeds flag → 1M', () => {
  assert.equal(windowLimit({ model: { id: 'claude-opus-4-8' } }), 200_000);
  assert.equal(windowLimit({ model: { id: 'claude-opus-4-8' }, exceeds_200k_tokens: true }), 1_000_000);
});

// ── uso de contexto ────────────────────────────────────────────────────────────────
test('contextPct: uses context_window.used_percentage directly', () => {
  assert.equal(contextPct({ context_window: { used_percentage: 53 } }), 53);
});
test('contextPct: computes from current_usage when no percentage', () => {
  const p = contextPct({
    context_window: { context_window_size: 200000, current_usage: { input_tokens: 90000, cache_read_input_tokens: 10000, cache_creation_input_tokens: 0 } },
  });
  assert.equal(Math.round(p), 50);
});
test('contextPct: null when nothing available', () => {
  assert.equal(contextPct({ model: { id: 'x' } }), null);
});
test('contextPct: [1m] window recalculates over 1M, not the buggy 200k size (#36725)', () => {
  const p = contextPct({
    model: { id: 'claude-opus-4-8[1m]' },
    context_window: { context_window_size: 200000, used_percentage: 250, current_usage: { input_tokens: 500000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } },
  });
  assert.equal(Math.round(p), 50);
});
test('contextPct: [1m] rescales used_percentage when no current_usage (#36725 B1 — reviewer PoC)', () => {
  // O ramo used_percentage SEM current_usage era o furo: 150% calculado sobre 200k vira 30% de 1M.
  const p = contextPct({
    model: { id: 'claude-opus-4-8[1m]' },
    context_window: { context_window_size: 200000, used_percentage: 150 },
  });
  assert.equal(Math.round(p), 30);
});
test('contextPct: clamps to [0,100] as a final net (never overflows the bar)', () => {
  const over = contextPct({ context_window: { used_percentage: 250 } });
  assert.equal(over, 100);
  const under = contextPct({ context_window: { used_percentage: -5 } });
  assert.equal(under, 0);
});

test('contextFromTranscript: reads last assistant usage', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mem-trans-'));
  const f = join(dir, 't.jsonl');
  try {
    writeFileSync(f, [
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'hi' } }),
      JSON.stringify({ type: 'assistant', message: { role: 'assistant', usage: { input_tokens: 40000, cache_read_input_tokens: 60000, cache_creation_input_tokens: 0, output_tokens: 500 } } }),
      '',
    ].join('\n'));
    assert.equal(Math.round(contextFromTranscript(f, 200000)), 50);
    assert.equal(contextFromTranscript('/nope/none.jsonl', 200000), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── barra + severidade ──────────────────────────────────────────────────────────────
test('bar: renders proportional fill and clamps', () => {
  assert.equal(bar(50, 10), '[█████░░░░░]');
  assert.equal(bar(0, 10), '[░░░░░░░░░░]');
  assert.equal(bar(150, 10), '[██████████]');
});
test('sevOf: thresholds map to ok/warn/danger', () => {
  assert.equal(sevOf(10, CFG), 'ok');
  assert.equal(sevOf(75, CFG), 'warn');
  assert.equal(sevOf(95, CFG), 'danger');
});

// ── segmento mem (reusa o data layer) ───────────────────────────────────────────────
test('memSegment: shows project and counts seeded notes', () => {
  const root = makeVault();
  try {
    for (let i = 1; i <= 3; i++) {
      seedNote(root, 'testproj', 'memory', `2026-01-0${i}-n${i}.md`,
        { type: 'memory', project: 'testproj', agent: 'x', summary: `s${i}`, created: `2026-01-0${i}` }, `b${i}`);
    }
    const prevV = process.env.MEMORY_VAULT;
    const prevP = process.env.MEMORY_PROJECT;
    process.env.MEMORY_VAULT = root;
    process.env.MEMORY_PROJECT = 'testproj';
    try {
      const out = memSegment({ workspace: { current_dir: '/whatever/testproj' } });
      assert.match(out, /testproj/);
      assert.match(out, /3n/);
    } finally {
      if (prevV === undefined) delete process.env.MEMORY_VAULT; else process.env.MEMORY_VAULT = prevV;
      if (prevP === undefined) delete process.env.MEMORY_PROJECT; else process.env.MEMORY_PROJECT = prevP;
    }
  } finally {
    cleanup(root);
  }
});

// ── render completa ─────────────────────────────────────────────────────────────────
test('render: assembles plan · ctx · cost · model', () => {
  const line = render({
    model: { id: 'claude-opus-4-8[1m]', display_name: 'Opus 4.8' },
    cost: { total_cost_usd: 0.4213 },
    context_window: { used_percentage: 53, context_window_size: 1_000_000 },
    rate_limits: { five_hour: { used_percentage: 23 }, seven_day: { used_percentage: 41 } },
  }, CFG);
  assert.match(line, /plan 5h 23% 7d 41%/);
  assert.match(line, /ctx \[.*\] 53%/);
  assert.match(line, /\$0\.4213/);
  assert.match(line, /Opus 4\.8/);
});

test('render: never throws on empty/garbage payload', () => {
  assert.doesNotThrow(() => render({}, CFG));
  assert.doesNotThrow(() => render({ rate_limits: null, cost: null }, CFG));
});

// ── e2e via subprocesso ─────────────────────────────────────────────────────────────
test('e2e: --demo prints a populated line, exit 0', () => {
  const out = execFileSync(process.execPath, [STATUSLINE, '--demo'], { encoding: 'utf8', env: { ...process.env, NO_COLOR: '1' } });
  assert.match(out, /plan 5h 23%/);
  assert.match(out, /ctx \[/);
});

test('e2e: valid stdin payload renders plan', () => {
  const out = sub({ model: { display_name: 'M' }, rate_limits: { five_hour: { used_percentage: 10 } } });
  assert.match(out, /plan 5h 10%/);
});

test('e2e: invalid stdin degrades gracefully, exit 0', () => {
  const out = sub('not json at all');
  assert.match(out, /sem dados de status/);
});

test('loadConfig: returns defaults when no config.json', () => {
  const root = makeVault();
  try {
    const cfg = loadConfig(root);
    assert.equal(cfg['statusline.warn'], 70);
    assert.equal(cfg['statusline.danger'], 90);
  } finally {
    cleanup(root);
  }
});
