#!/usr/bin/env node
// TeammateIdle hook (global): before a teammate goes idle, require a state flush to
// the central vault: <vault>/projects/<project>/agents/<name>.md. Blocks with exit 2.
// OPT-IN: only enforces when the project has a `.memory-team` marker (else fail-open).
// Only enforces with a reliable FRIENDLY NAME (won't block on an opaque id -> no deadlock).

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  vaultRoot, projectName, isEnabled, partition, slug, getp, stripBom,
} from '../lib.mjs';

const HOOKDIR = dirname(fileURLToPath(import.meta.url));
const MEM = join(HOOKDIR, '..', 'memory.mjs');

const raw = (() => { try { return readFileSync(0, 'utf8'); } catch { return ''; } })();
try { writeFileSync(join(HOOKDIR, '.last-teammate-idle.json'), raw || '(empty)', 'utf8'); } catch { /* noop */ }

let data = {};
try { data = JSON.parse(stripBom(raw).trim() || '{}'); } catch { process.exit(0); }

const cwd = getp(data, ['cwd', 'project_dir', 'projectDir']) || process.cwd();
if (!isEnabled(cwd)) process.exit(0); // project not opted in

const name = getp(data, ['teammate_name', 'agent_name', 'name', 'teammate.name', 'agent.name']);
if (!name) process.exit(0);

const ROOT = vaultRoot();
const project = projectName(cwd);
const file = join(partition(ROOT, project).agents, `${slug(name)}.md`);
if (existsSync(file) && readFileSync(file, 'utf8').trim().length > 20) process.exit(0);

process.stderr.write(
  `Before going idle, flush your state to the vault (project "${project}").\n`
  + `Create/update your state file, for example:\n`
  + `  node "${MEM}" save state ${name} --summary "current state: what I did / next step"\n`
  + `Then edit it with your context (tasks, decisions, open items) — it is what survives the session.\n`,
);
process.exit(2);
