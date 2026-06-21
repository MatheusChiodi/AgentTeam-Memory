#!/usr/bin/env node
// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// install.mjs — promote the memory-team system to the USER scope (~/.claude) so it works
// in every project, and create the central vault. Idempotent. Non-destructive merge.
//
// Usage:
//   node install.mjs                       # install into os.homedir() + default vault
//   node install.mjs --home <dir>          # override home (useful for sandbox testing)
//   node install.mjs --vault <dir>         # override central vault path
//   node install.mjs --enforce-global      # hooks enforce in EVERY project (no per-project marker)
//
// What it does:
//   - copies lib.mjs/memory.mjs/hooks -> <home>/.claude/memory-team/
//   - copies agents (with {{MEM}} resolved) -> <home>/.claude/agents/
//   - merges <home>/.claude/settings.json (env flag + MEMORY_VAULT + teammateMode + 2 hooks), with backup
//   - injects the Memory Protocol into <home>/.claude/CLAUDE.md (between markers)
//   - scaffolds the central vault and writes a bootstrap note + master index

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, 'memory-team');
// Universal default: next to the Claude Code config. Override with --vault <dir>.
const DEFAULT_VAULT = join(homedir(), '.claude', 'memory-vault');

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const fwd = (p) => p.replace(/\\/g, '/').replace(/\/+$/, '');
const ts = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const HOME = fwd(arg('home', homedir()));
const VAULT = fwd(arg('vault', DEFAULT_VAULT));
const ENFORCE_GLOBAL = process.argv.includes('--enforce-global');
const CLAUDE = join(HOME, '.claude');
const DEST = join(CLAUDE, 'memory-team');
const AGENTS = join(CLAUDE, 'agents');
const MEM = fwd(join(DEST, 'memory.mjs'));
const log = (s) => console.log(s);

mkdirSync(DEST, { recursive: true });
mkdirSync(join(DEST, 'hooks'), { recursive: true });
mkdirSync(AGENTS, { recursive: true });

// 1) copy runtime — every top-level .mjs (lib, data layer, cli, render/statusline/analyze helpers)
//    plus commands/ and hooks/. Dynamic scan so new root modules ship without editing this list.
const rootModules = readdirSync(SRC).filter((f) => f.endsWith('.mjs'));
for (const m of rootModules) copyFileSync(join(SRC, m), join(DEST, m));
mkdirSync(join(DEST, 'commands'), { recursive: true });
for (const c of readdirSync(join(SRC, 'commands'))) copyFileSync(join(SRC, 'commands', c), join(DEST, 'commands', c));
for (const h of readdirSync(join(SRC, 'hooks'))) copyFileSync(join(SRC, 'hooks', h), join(DEST, 'hooks', h));
log(`✓ runtime -> ${fwd(DEST)} (${rootModules.length} modules + commands + hooks)`);

// 1b) optional: GLOBAL enforcement marker — hooks enforce in every project, no per-project marker.
const enforceMarker = join(DEST, '.enforce-global');
if (ENFORCE_GLOBAL) {
  writeFileSync(enforceMarker,
    `# memory-team GLOBAL enforcement.\n`
    + `# While this file exists, the TaskCompleted/TeammateIdle hooks enforce in EVERY project\n`
    + `# (a per-project .memory-team marker is no longer required). Delete this file to revert.\n`
    + `enabled: ${new Date().toISOString().slice(0, 10)}\n`, 'utf8');
  log(`✓ GLOBAL enforcement ON -> ${fwd(enforceMarker)}`);
} else if (existsSync(enforceMarker)) {
  log(`• GLOBAL enforcement already ON (${fwd(enforceMarker)}); pass nothing to keep, delete the file to revert.`);
}

// 2) copy agents with {{MEM}} resolved
let nAgents = 0;
for (const a of readdirSync(join(SRC, 'agents'))) {
  const body = readFileSync(join(SRC, 'agents', a), 'utf8').replaceAll('{{MEM}}', MEM);
  writeFileSync(join(AGENTS, a), body, 'utf8');
  nAgents++;
}
log(`✓ ${nAgents} agents -> ${fwd(AGENTS)}`);

// 3) merge settings.json (with backup)
const settingsPath = join(CLAUDE, 'settings.json');
let settings = {};
if (existsSync(settingsPath)) {
  const rawS = readFileSync(settingsPath, 'utf8');
  try { settings = JSON.parse(rawS.replace(/^﻿/, '')); } catch (e) {
    console.error(`! ${settingsPath} is not valid JSON (${e.message}). Aborting to avoid clobbering it.`);
    process.exit(1);
  }
  const bak = `${settingsPath}.bak-${ts()}`;
  writeFileSync(bak, rawS, 'utf8');
  log(`✓ backup -> ${fwd(bak)}`);
}
settings.env = settings.env || {};
settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS = '1';
settings.env.MEMORY_VAULT = VAULT;
if (settings.teammateMode == null) settings.teammateMode = 'in-process';
settings.hooks = settings.hooks || {};
// [event, file, matcher?] — matcher omitted = registered as a bare group (like the team hooks);
// SessionStart carries matcher 'startup' so it only fires on a fresh start (not resume/compact).
const HOOKS = [
  ['TaskCompleted', 'task-completed.mjs'],
  ['TeammateIdle', 'teammate-idle.mjs'],
  ['SessionStart', 'session-start.mjs', 'startup'],
];
for (const [event, file, matcher] of HOOKS) {
  settings.hooks[event] = settings.hooks[event] || [];
  const command = `node "${fwd(join(DEST, 'hooks', file))}"`;
  const present = settings.hooks[event].some((g) => (g.hooks || []).some((h) => h.command === command));
  if (!present) {
    const group = { hooks: [{ type: 'command', command, timeout: 30 }] };
    if (matcher != null) group.matcher = matcher;
    settings.hooks[event].push(group);
  }
}
writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
log(`✓ settings.json merged (agent teams ON, MEMORY_VAULT, in-process, 3 hooks)`);

// 4) inject protocol into ~/.claude/CLAUDE.md (between markers, idempotent)
const protocol = readFileSync(join(SRC, 'CLAUDE.md'), 'utf8').replaceAll('{{MEM}}', MEM);
const START = '<!-- memory-team:start -->';
const END = '<!-- memory-team:end -->';
const block = `${START}\n${protocol.trim()}\n${END}`;
const claudeMd = join(CLAUDE, 'CLAUDE.md');
let md = existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8') : '';
if (md.includes(START) && md.includes(END)) {
  md = md.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
} else {
  md = (md.trim() ? `${md.trim()}\n\n` : '') + block + '\n';
}
writeFileSync(claudeMd, md, 'utf8');
log(`✓ Memory Protocol injected -> ${fwd(claudeMd)}`);

// 5) scaffold central vault + bootstrap note + master index
mkdirSync(join(VAULT, 'projects'), { recursive: true });
mkdirSync(join(VAULT, 'global', 'memory'), { recursive: true });
mkdirSync(join(VAULT, 'global', 'board'), { recursive: true });
const bootstrap = join(VAULT, 'global', 'memory', 'memory-team-bootstrap.md');
if (!existsSync(bootstrap)) {
  writeFileSync(bootstrap, `---
type: decision
project: global
agent: lead
summary: "Central vault for memory-team: agent teams (live communication) + per-project Obsidian memory."
tags: [architecture, memory-team, bootstrap]
related: []
created: ${new Date().toISOString().slice(0, 10)}
---

# memory-team bootstrap

Central, per-project memory for the **memory-team** agent-team system.
Agent teams have no shared memory and no session resume; this vault is what survives.

- Per-project notes: \`projects/<project>/{memory,board,agents,tasks}\`
- Cross-project notes: \`global/{memory,board}\`
- CLI: \`node "${MEM}" <where|enable|search|save|index>\`
- Enable enforcement in a project: run \`node "${MEM}" enable\` at its root.
`, 'utf8');
}
try {
  execFileSync(process.execPath, [join(DEST, 'memory.mjs'), 'index', '--all'],
    { env: { ...process.env, MEMORY_VAULT: VAULT }, stdio: 'ignore' });
} catch { /* index is best-effort */ }
log(`✓ central vault -> ${VAULT}`);

log('\nDone. Open a NEW terminal in ANY project and run `claude` — agent teams + memory are active.');
if (ENFORCE_GLOBAL || existsSync(enforceMarker)) {
  log('Enforcement is GLOBAL: every project enforces memory in agent teams.');
  log(`Revert with:  del "${fwd(enforceMarker)}"   (or rm on *nix)`);
} else {
  log(`Enable enforcement per project with:  node "${MEM}" enable`);
  log(`Or make it global with:  node install.mjs --enforce-global`);
}
