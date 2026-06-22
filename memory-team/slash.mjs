// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// slash.mjs — generate Claude Code slash-command (.md) wrappers for every memory CLI command, so the
// whole 56-command surface is usable as /memory:<cmd> in ANY project after a global install. Derived
// from the registry (a new command in commands/ automatically ships a slash command); curated .md
// prompts under .claude/commands/ win over the generated wrapper.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadCommands } from './commands/registry.mjs';

const fwd = (p) => String(p).replace(/\\/g, '/');
// YAML double-quoted scalar that survives `:` `|` `#` inside summaries/usages.
const yq = (s) => JSON.stringify(String(s ?? ''));
// argument-hint = the usage string minus its leading command-name token.
const hintOf = (cmd) => {
  const u = (cmd.usage || '').trim();
  if (!u) return '';
  return u.startsWith(cmd.name) ? u.slice(cmd.name.length).trim() : u;
};

// Thin wrapper that shells out to the GLOBAL memory.mjs at `mem` (absolute, forward-slashed).
export function renderSlash(cmd, mem) {
  const m = fwd(mem);
  const hint = hintOf(cmd);
  const fm = [
    '---',
    `description: ${yq(cmd.summary || cmd.name)}`,
    hint ? `argument-hint: ${yq(hint)}` : null,
    'allowed-tools: Bash(node:*)',
    '---',
  ].filter(Boolean).join('\n');
  return `${fm}\nRun: \`node "${m}" ${cmd.name} $ARGUMENTS\`\n\n${cmd.summary || ''}\nReply with just the command output (it already carries the forensic watermark).\n`;
}

// Curated .md (richer orchestration prompts) rewritten to call the absolute global MEM path.
export const adaptCurated = (raw, mem) => raw.replaceAll('node memory-team/memory.mjs', `node "${fwd(mem)}"`);

// Build [{ name, content }] for every registry command. `curatedDir` (optional) supplies richer
// hand-written prompts that win over the generated wrapper when a <name>.md exists there.
export async function buildSlashCommands(mem, curatedDir) {
  const cmds = await loadCommands();
  const out = [];
  for (const cmd of [...cmds.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const curated = curatedDir ? join(curatedDir, `${cmd.name}.md`) : null;
    const content = curated && existsSync(curated)
      ? adaptCurated(readFileSync(curated, 'utf8'), mem)
      : renderSlash(cmd, mem);
    out.push({ name: cmd.name, content });
  }
  return out;
}
