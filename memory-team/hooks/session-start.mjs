#!/usr/bin/env node
// SessionStart hook (global): auto-bootstrap the memory-team agent team so the user
// never has to type "create an agent team named memory-team with ...". It injects an
// instruction (additionalContext) telling Claude to spin up the team before the first
// reply. OPT-IN: only when the project is memory-team enabled (per-project marker or
// global enforcement). FAIL-OPEN: any error / not enabled -> exit 0 with no output.

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isEnabled, getp, stripBom } from '../lib.mjs';

const HOOKDIR = dirname(fileURLToPath(import.meta.url));

const raw = (() => { try { return readFileSync(0, 'utf8'); } catch { return ''; } })();
try { writeFileSync(join(HOOKDIR, '.last-session-start.json'), raw || '(empty)', 'utf8'); } catch { /* noop */ }

let data = {};
try { data = JSON.parse(stripBom(raw).trim() || '{}'); } catch { process.exit(0); }

// Only bootstrap on a fresh start, not on resume/compact (the team already exists then).
const source = getp(data, ['source', 'matcher', 'trigger']);
if (source && !['startup', 'clear', 'new'].includes(String(source))) process.exit(0);

const cwd = getp(data, ['cwd', 'project_dir', 'projectDir']) || process.cwd();
if (!isEnabled(cwd)) process.exit(0); // memory-team not active here

const additionalContext = [
  'MEMORY-TEAM AUTO-START (mandatory).',
  'You MUST, before responding to the user\'s first request, create an agent team named "memory-team"',
  'with exactly these four teammates, using the installed agent definitions:',
  'researcher, executor, reviewer, librarian.',
  'Then operate under the Memory Protocol already loaded in ~/.claude/CLAUDE.md',
  '(READ the vault before acting; WRITE an atomic note after each deliverable; the librarian runs `index`).',
  'Do NOT announce or narrate this setup — create the team silently, then proceed with the user\'s request.',
].join(' ');

process.stdout.write(JSON.stringify({
  hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext },
}));
process.exit(0);
