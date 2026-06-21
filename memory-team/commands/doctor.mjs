// doctor — F15: read-only health check da instalação do memory-team.
// Roda uma série de CHECKS independentes; cada um vira uma linha `✓/✗/⚠ nome — detalhe`.
// Não corrige nada (diagnóstico puro) — só reporta e, quando útil, sugere o fix.
// Exit 1 se houver ao menos um `✗` (fail); warnings (⚠) NÃO derrubam o exit code.

import { existsSync, statSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { partition, ensurePartition, stripBom } from '../lib.mjs';
import validate from './validate.mjs';

const ICON = { ok: '✓', warn: '⚠', fail: '✗' };

// Os scripts de hook que o install.mjs registra (event → arquivo em hooks/). doctor
// confere que cada um está registrado no settings.json E existe no disco.
const HOOK_SCRIPTS = { TaskCompleted: 'task-completed.mjs', TeammateIdle: 'teammate-idle.mjs' };
const HOOKS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks');

/** Lê e parseia o settings.json UMA vez; o resultado é compartilhado pelos checks. */
function loadSettings(settingsFile) {
  if (!existsSync(settingsFile)) return { state: 'missing', cfg: null, error: null };
  try {
    return { state: 'ok', cfg: JSON.parse(stripBom(readFileSync(settingsFile, 'utf8'))), error: null };
  } catch (e) {
    return { state: 'invalid', cfg: null, error: e.message };
  }
}

/** Extrai o caminho do script de um `command` de hook/statusLine (`node "<path>"`). */
function scriptOf(command) {
  if (typeof command !== 'string') return null;
  const m = /"([^"]+)"|(\S+\.mjs)/.exec(command);
  return m ? (m[1] || m[2]) : null;
}

// ── Checks individuais: cada um retorna `{ name, status, detail }` ─────────────────

// 1. Vault acessível e gravável: stat do ROOT + um write/delete de sonda.
function checkVault(ROOT) {
  const name = 'vault';
  if (!existsSync(ROOT)) {
    return { name, status: 'fail', detail: `não existe: ${ROOT} (rode qualquer 'save' para criá-lo)` };
  }
  try {
    if (!statSync(ROOT).isDirectory()) return { name, status: 'fail', detail: `não é diretório: ${ROOT}` };
  } catch (e) {
    return { name, status: 'fail', detail: `stat falhou: ${e.message}` };
  }
  // Sonda de escrita: confirma que o vault é realmente gravável. unlink em finally
  // para não deixar lixo se algo entre o write e o delete lançar.
  const probe = join(ROOT, '.doctor-probe');
  try {
    writeFileSync(probe, 'probe');
  } catch (e) {
    return { name, status: 'fail', detail: `não gravável: ${e.message}` };
  } finally {
    try { unlinkSync(probe); } catch { /* sonda já removida ou nunca criada */ }
  }
  return { name, status: 'ok', detail: ROOT };
}

// 2. config.json do vault: parseável SE existir; ausente é só skip (⚠), não erro.
function checkConfig(ROOT) {
  const name = 'config.json';
  const f = join(ROOT, 'config.json');
  if (!existsSync(f)) return { name, status: 'warn', detail: 'ausente (usando defaults embutidos)' };
  try {
    JSON.parse(stripBom(readFileSync(f, 'utf8')));
    return { name, status: 'ok', detail: f };
  } catch (e) {
    return { name, status: 'fail', detail: `inválido: ${e.message}` };
  }
}

// 3. Partição do projeto: ensure-able (cria as subpastas se faltarem) e existente.
function checkPartition(ROOT, PROJECT) {
  const name = 'partition';
  try {
    ensurePartition(ROOT, PROJECT);
    const p = partition(ROOT, PROJECT);
    if (!existsSync(p.base)) return { name, status: 'fail', detail: `partição ausente: ${p.base}` };
    return { name, status: 'ok', detail: `projects/${PROJECT}` };
  } catch (e) {
    return { name, status: 'fail', detail: `não criável: ${e.message}` };
  }
}

// 4. Integridade do vault: REUSA `validate` (mesma fonte de verdade do CLI), em vez de
//    reimplementar um lint próprio — assim doctor e validate nunca divergem.
function checkNotes(ROOT, PROJECT) {
  const name = 'notes';
  let res;
  try {
    res = validate.run({ ROOT, PROJECT, opt: {} });
  } catch (e) {
    return { name, status: 'fail', detail: `validate falhou: ${e.message}` };
  }
  const { checked = 0, issues = [] } = res.data || {};
  if (res.ok) return { name, status: 'ok', detail: `${checked} notas válidas` };
  return { name, status: 'warn', detail: `${checked} notas, ${issues.length} com problema (rode 'validate')` };
}

// 5. statusLine: confere se há um bloco statusLine no settings apontando para um script
//    que de fato existe no disco. Reusa o settings já parseado.
function checkStatusLine(settings) {
  const name = 'statusline';
  if (settings.state === 'missing') {
    return { name, status: 'warn', detail: 'não configurado (sem settings.json — rode: statusline.mjs --install)' };
  }
  if (settings.state === 'invalid') {
    return { name, status: 'warn', detail: 'settings.json inválido (ver check settings.json)' };
  }
  const sl = settings.cfg.statusLine;
  if (!sl || typeof sl.command !== 'string' || !sl.command.trim()) {
    return { name, status: 'warn', detail: 'bloco statusLine ausente (rode: statusline.mjs --install)' };
  }
  // Suposição: command no formato `node "<path>"` (aspas duplas) ou termina em `.mjs`.
  // Wrappers fora desse padrão não têm o path validado (apenas reportados como ok).
  const script = scriptOf(sl.command);
  if (script && !existsSync(script)) {
    return { name, status: 'fail', detail: `script inexistente: ${script}` };
  }
  return { name, status: 'ok', detail: script || sl.command };
}

// 6. settings.json parseável: check de primeira classe (parse já feito por loadSettings).
function checkSettings(settings) {
  const name = 'settings.json';
  if (settings.state === 'missing') {
    return { name, status: 'warn', detail: 'ausente (rode install.mjs / statusline.mjs --install)' };
  }
  if (settings.state === 'invalid') return { name, status: 'fail', detail: `inválido: ${settings.error}` };
  return { name, status: 'ok', detail: 'parseável' };
}

// 7. Hooks TaskCompleted/TeammateIdle registrados no settings E presentes no disco.
//    Hooks ausentes é a "instalação meio-quebrada" que o doctor existe pra pegar → fail
//    (US-040). Só vira warn quando nem dá pra checar (settings ausente/inválido).
function checkHooks(settings) {
  const name = 'hooks';
  if (settings.state !== 'ok') {
    return { name, status: 'warn', detail: 'sem settings.json parseável (não dá pra checar hooks)' };
  }
  const hooks = settings.cfg.hooks || {};
  const problems = [];
  for (const [event, file] of Object.entries(HOOK_SCRIPTS)) {
    const groups = Array.isArray(hooks[event]) ? hooks[event] : [];
    const cmds = groups.flatMap((g) => (Array.isArray(g.hooks) ? g.hooks : [])).map((h) => h.command);
    const registered = cmds.some((c) => typeof c === 'string' && c.includes(file));
    if (!registered) { problems.push(`${event} não registrado`); continue; }
    if (!existsSync(join(HOOKS_DIR, file))) problems.push(`${event} → ${file} ausente no disco`);
  }
  if (!problems.length) return { name, status: 'ok', detail: 'TaskCompleted + TeammateIdle registrados' };
  return { name, status: 'fail', detail: `${problems.join('; ')} (rode install.mjs)` };
}

export default {
  name: 'doctor',
  summary: 'Health check read-only da instalação (vault, settings, hooks, statusline, integridade)',
  usage: 'doctor [--settings <path>] [--json]',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const opt = ctx.opt || {};
    const settingsFile = typeof opt.settings === 'string'
      ? opt.settings
      : join(homedir(), '.claude', 'settings.json');
    const settings = loadSettings(settingsFile);

    const checks = [
      checkVault(ROOT),
      checkSettings(settings),
      checkConfig(ROOT),
      checkPartition(ROOT, PROJECT),
      checkNotes(ROOT, PROJECT),
      checkHooks(settings),
      checkStatusLine(settings),
    ];

    const ok = !checks.some((c) => c.status === 'fail');
    const lines = checks.map((c) => `${ICON[c.status]} ${c.name} — ${c.detail}`);
    return { ok, code: ok ? 0 : 1, lines, data: { ok, checks } };
  },
};
