#!/usr/bin/env node
// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// statusline.mjs — F11: statusLine do memory-team para o Claude Code.
//
// O Claude Code chama este script a cada atualização de tela, entregando um JSON de
// status via STDIN, e renderiza no rodapé a ÚNICA linha que escrevemos em stdout.
// Mostramos, em tempo real e sem `/usage` manual:
//   plan │ ctx │ $ │ modelo │ mem
//   - plan: uso do PLANO (rate_limits.five_hour/seven_day.used_percentage) — a dor-estrela.
//   - ctx : uso da janela de contexto (context_window.used_percentage) com barra + alertas.
//   - $   : custo da sessão (cost.total_cost_usd).
//   - mem : projeto detectado, flag enabled e nº de notas (via lib.mjs).
//
// É um ENTRYPOINT STANDALONE (fora do registry de commands/) de propósito:
//   1. roda em altíssima frequência (debounce 300ms) → não pode carregar todo o registry;
//   2. precisa de STDIN, que o `ctx` do dispatcher não fornece;
//   3. o contrato de saída é "1 linha", não `{ lines, data }`.
// Invariantes: zero-dependency e NUNCA lança para o Claude Code — qualquer falha degrada
// para um fallback curto e sai 0, para jamais derrubar a render.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { vaultRoot, projectName, isEnabled, partition, globalPart, walk } from './lib.mjs';
import { SIGIL } from './watermark.mjs';

const SELF = fileURLToPath(import.meta.url);

// ── Cores ANSI (degradam para texto puro com NO_COLOR ou TERM=dumb) ──────────────
const useColor = () => !process.env.NO_COLOR && process.env.TERM !== 'dumb';
const c = (code, s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const dim = (s) => c('2', s);
const green = (s) => c('32', s);
const yellow = (s) => c('33', s);
const red = (s) => c('31', s);
const cyan = (s) => c('36', s);
const SEP = dim(' │ ');

// ── Config: defaults embutidos; F16 (`config`) grava em <vault>/config.json e este
//    script só LÊ — assim os limiares ficam ajustáveis sem tocar no código. ────────
const DEFAULTS = { 'statusline.warn': 70, 'statusline.danger': 90, 'statusline.barWidth': 10 };
export function loadConfig(root) {
  try {
    const f = join(root, 'config.json');
    if (existsSync(f)) return { ...DEFAULTS, ...JSON.parse(readFileSync(f, 'utf8')) };
  } catch { /* config quebrada → defaults */ }
  return { ...DEFAULTS };
}

export const sevOf = (pct, cfg) =>
  pct >= cfg['statusline.danger'] ? 'danger' : pct >= cfg['statusline.warn'] ? 'warn' : 'ok';
const paint = (s, level) => (level === 'danger' ? red(s) : level === 'warn' ? yellow(s) : green(s));

export function bar(pct, width = 10) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const filled = Math.round((p / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(width - filled)}]`;
}

// ── Limite da janela. CUIDADO: `context_window_size` do payload vem 200000 mesmo em
//    janela estendida (bug conhecido do Claude Code #36725) → o sufixo [1m] no model.id
//    TEM PRECEDÊNCIA para inferir 1M; só caímos no size quando não há sinal de [1m].
export function windowLimit(payload) {
  const id = String(payload?.model?.id || payload?.model?.display_name || '');
  if (/\[1m\]|(^|[^0-9])1m($|[^0-9])/i.test(id)) return 1_000_000;
  const size = payload?.context_window?.context_window_size;
  if (Number.isFinite(size) && size > 0) return size;
  return payload?.exceeds_200k_tokens ? 1_000_000 : 200_000;
}

const usageTokens = (u) =>
  (u?.input_tokens || 0) + (u?.cache_read_input_tokens || 0) + (u?.cache_creation_input_tokens || 0);

// ── Uso de contexto (0–100). Preferimos RECALCULAR a partir dos tokens absolutos
//    (current_usage) sobre o limite correto — assim não herdamos o used_percentage
//    pré-calculado pelo payload, que pode usar a base 200k errada numa janela 1M.
//    Só então usamos used_percentage; e por fim o transcript (versões < 2.1.132).
//    Em TODOS os ramos o resultado é clampado a [0,100] (rede final: nada vaza para a
//    barra/severidade) — o ramo used_percentage também reescala quando o limite inferido
//    diverge do context_window_size do payload (sinal do bug #36725 em janela estendida).
export function contextPct(payload, limit = windowLimit(payload)) {
  const cw = payload?.context_window;
  let pct;
  if (cw?.current_usage && usageTokens(cw.current_usage) > 0) {
    pct = (usageTokens(cw.current_usage) / limit) * 100;
  } else if (cw && Number.isFinite(cw.used_percentage)) {
    const size = cw.context_window_size;
    // used_percentage vem calculado sobre `size`; se inferimos um limite maior (#36725),
    // o % está numa base menor → reescala para o limite real (150% de 200k = 30% de 1M).
    pct = (Number.isFinite(size) && size > 0 && size !== limit)
      ? cw.used_percentage * (size / limit)
      : cw.used_percentage;
  } else {
    const t = contextFromTranscript(payload?.transcript_path, limit);
    if (t == null) return null;
    pct = t;
  }
  return Math.max(0, Math.min(100, pct));
}

// Fallback B: lê o transcript e pega a última mensagem do assistant com `usage`.
// Só roda quando o payload não traz context_window (versões antigas do Claude Code).
export function contextFromTranscript(path, limit) {
  try {
    if (!path || !existsSync(path)) return null;
    const lines = readFileSync(path, 'utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const ln = lines[i].trim();
      if (!ln) continue;
      let o;
      try { o = JSON.parse(ln); } catch { continue; }
      const msg = o.message || o;                 // formato {type,message:{...}} OU plano
      const role = msg.role || o.role;
      const usage = msg.usage || o.usage;
      if (role === 'assistant' && usage) {
        return (usageTokens(usage) / limit) * 100;
      }
    }
  } catch { /* transcript ilegível → sem contexto */ }
  return null;
}

function resetIn(epoch) {
  if (!Number.isFinite(epoch)) return '';
  const secs = epoch - Math.floor(Date.now() / 1000);
  if (secs <= 0) return 'agora';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m}m`;
}

// ── Segmento PLANO: a feature-estrela. rate_limits só existe p/ Claude.ai Pro/Max e
//    após a 1ª resposta; ausente → "plan n/a" (degradação honesta, sem inventar número).
export function planSegment(rl, cfg) {
  if (!rl || typeof rl !== 'object') return dim('plan n/a');
  const parts = [];
  const win = (label, w) => {
    if (!w || !Number.isFinite(w.used_percentage)) return;
    const p = Math.round(w.used_percentage);
    parts.push(`${label} ${paint(`${p}%`, sevOf(p, cfg))}`);
  };
  win('5h', rl.five_hour);
  win('7d', rl.seven_day);
  if (!parts.length) return dim('plan n/a');
  // Reset da primeira janela presente — com só 7d, ainda mostramos o reset dele (A1).
  const reset = resetIn(rl.five_hour?.resets_at ?? rl.seven_day?.resets_at);
  return `plan ${parts.join(' ')}${reset ? ' ' + dim(`⟳${reset}`) : ''}`;
}

function contextSegment(payload, cfg) {
  const pct = contextPct(payload);
  if (pct == null) return '';
  const r = Math.round(pct);
  const lvl = sevOf(r, cfg);
  return `ctx ${paint(bar(r, cfg['statusline.barWidth']), lvl)} ${paint(`${r}%`, lvl)}`;
}

function costSegment(payload) {
  const usd = payload?.cost?.total_cost_usd;
  if (!Number.isFinite(usd)) return '';
  return dim('$') + usd.toFixed(usd < 1 ? 4 : 2);
}

// ── Segmento MEM: reusa o data layer; conta só projeto + global (não --all) p/ ser barato.
export function memSegment(payload) {
  try {
    const cwd = payload?.workspace?.current_dir || payload?.workspace?.project_dir || payload?.cwd || process.cwd();
    const root = vaultRoot();
    const project = projectName(cwd);
    const enabled = isEnabled(cwd);
    let count = 0;
    try { count += walk(partition(root, project).base).length; } catch { /* sem partição ainda */ }
    try { count += walk(globalPart(root).base).length; } catch { /* sem global ainda */ }
    return `mem ${enabled ? green('●') : dim('○')} ${cyan(project)} ${dim(`${count}n`)}`;
  } catch { return ''; }
}

/** Monta a linha completa do statusLine a partir do payload. Função PURA (testável). */
export function render(payload, cfg = loadConfig(vaultRoot())) {
  const segs = [
    planSegment(payload?.rate_limits, cfg),       // estrela: uso do plano
    contextSegment(payload, cfg),                 // janela de contexto + barra
    costSegment(payload),                         // custo da sessão
    payload?.model?.display_name ? dim(payload.model.display_name) : '',
    memSegment(payload),                          // projeto · enabled · nº notas
  ];
  return segs.filter(Boolean).join(SEP);
}

// ── Modos de gestão (argv) ───────────────────────────────────────────────────────
const settingsPath = () => join(homedir(), '.claude', 'settings.json');

function install() {
  const p = settingsPath();
  let cfg = {};
  if (existsSync(p)) {
    try { cfg = JSON.parse(readFileSync(p, 'utf8')); }
    catch { process.stderr.write(`settings.json inválido em ${p} — abortado, nada sobrescrito.\n`); process.exitCode = 1; return; }
  }
  cfg.statusLine = { type: 'command', command: `node "${SELF}"`, padding: 0 };
  writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`);
  process.stdout.write(`statusLine do memory-team instalada em ${p}\n`);
}

function uninstall() {
  const p = settingsPath();
  if (!existsSync(p)) { process.stdout.write('nada a remover (sem settings.json).\n'); return; }
  let cfg;
  try { cfg = JSON.parse(readFileSync(p, 'utf8')); }
  catch { process.stderr.write('settings.json inválido — não toquei.\n'); process.exitCode = 1; return; }
  const cmd = cfg.statusLine?.command;
  if (typeof cmd === 'string' && cmd.includes('statusline.mjs')) {
    delete cfg.statusLine;
    writeFileSync(p, `${JSON.stringify(cfg, null, 2)}\n`);
    process.stdout.write('statusLine do memory-team removida.\n');
  } else {
    process.stdout.write('statusLine atual não é do memory-team — deixei intacta.\n');
  }
}

// Payload sintético para `--demo` (testa a render sem o Claude Code rodando).
const DEMO = {
  model: { id: 'claude-opus-4-8[1m]', display_name: 'Opus 4.8' },
  cost: { total_cost_usd: 0.4213 },
  workspace: { current_dir: process.cwd() },
  context_window: { used_percentage: 53, context_window_size: 1_000_000 },
  rate_limits: {
    five_hour: { used_percentage: 23, resets_at: Math.floor(Date.now() / 1000) + 8000 },
    seven_day: { used_percentage: 41, resets_at: Math.floor(Date.now() / 1000) + 400000 },
  },
  exceeds_200k_tokens: true,
};

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--install')) return install();
  if (argv.includes('--uninstall')) return uninstall();

  let payload = null;
  if (argv.includes('--demo')) {
    payload = DEMO;
  } else {
    let raw = '';
    try { raw = readFileSync(0, 'utf8'); } catch { /* sem stdin */ }
    try { payload = JSON.parse(raw); } catch { payload = null; }
  }

  if (!payload || typeof payload !== 'object') {
    process.stdout.write(`${dim('memory-team · sem dados de status')}\n`);
    return;
  }
  try {
    // SIGIL (zero-width) é anexado DEPOIS de toda formatação e medição de largura: não
    // afeta `render.visibleLen` (que só strip-a ANSI) nem o alinhamento de box/bar. O
    // wrap em try garante que a assinatura jamais derruba a render.
    let line = render(payload);
    try { line += SIGIL; } catch { /* assinatura é best-effort, nunca falha a statusline */ }
    process.stdout.write(`${line}\n`);
  } catch {
    // Fail-safe absoluto: nunca derruba a render do Claude Code.
    process.stdout.write(`${dim(`memory-team · ${payload?.model?.display_name || ''}`)}\n`);
  }
}

// Só executa quando rodado direto (não quando importado por um teste).
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
