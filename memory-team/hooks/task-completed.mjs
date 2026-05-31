#!/usr/bin/env node
// TaskCompleted hook (global): a task may only close if a matching memory note exists
// in the central vault, for the CURRENT project. Blocks with exit 2 + stderr feedback.
// OPT-IN: only enforces when the project has a `.memory-team` marker (else fail-open).
// FAIL-OPEN on any error / unknown schema — never deadlock the team on a hook bug.

import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  vaultRoot, projectName, isEnabled, partition, walk, slug, getp, stripBom,
} from '../lib.mjs';

const HOOKDIR = dirname(fileURLToPath(import.meta.url));
const MEM = join(HOOKDIR, '..', 'memory.mjs');

const raw = (() => { try { return readFileSync(0, 'utf8'); } catch { return ''; } })();
try { writeFileSync(join(HOOKDIR, '.last-task-completed.json'), raw || '(empty)', 'utf8'); } catch { /* noop */ }

let data = {};
try { data = JSON.parse(stripBom(raw).trim() || '{}'); } catch { process.exit(0); }

const cwd = getp(data, ['cwd', 'project_dir', 'projectDir']) || process.cwd();
if (!isEnabled(cwd)) process.exit(0); // project not opted in

const ROOT = vaultRoot();
const project = projectName(cwd);
const taskId = getp(data, ['task_id', 'taskId', 'task.id', 'id']);
const taskTitle = getp(data, ['task_title', 'taskTitle', 'task.title', 'title']);
if (!taskId && !taskTitle) process.exit(0);

const needles = [taskId, taskTitle].filter(Boolean).map((s) => String(s).toLowerCase());
const titleSlug = taskTitle ? slug(taskTitle) : null;
const p = partition(ROOT, project);

let found = false;
for (const f of [...walk(p.memory), ...walk(p.board)]) {
  const low = readFileSync(f, 'utf8').toLowerCase();
  if (needles.some((n) => low.includes(n))) { found = true; break; }
  if (titleSlug && f.toLowerCase().includes(titleSlug)) { found = true; break; }
}
if (found) process.exit(0);

process.stderr.write(
  `Task "${taskTitle || taskId}" cannot be completed: the matching memory note is missing for project "${project}".\n`
  + `Create the atomic note BEFORE closing the task, for example:\n`
  + `  node "${MEM}" save memory "${taskTitle || 'task result'}" `
  + `--agent <your-name> --task ${taskId || '<id>'} --summary "<1 sentence>" --tags "<domain>"\n`
  + `The note must contain the task identifier (${taskId || taskTitle}) so the gate can recognize it.\n`,
);
process.exit(2);
