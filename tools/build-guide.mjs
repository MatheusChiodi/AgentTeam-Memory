#!/usr/bin/env node
// build-guide.mjs — generates docs/system-guide.excalidraw, a complete visual walkthrough
// of the memory-team system (user flow + internal logic). Run: node tools/build-guide.mjs
// Plain node script (Math.random/Date allowed here). No dependencies.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const OUT = join(ROOT, 'docs', 'system-guide.excalidraw');

const rnd = () => Math.floor(Math.random() * 2 ** 31);
const now = () => Date.now();
let idc = 0;
const els = [];

function base(type, x, y, w, h, extra = {}) {
  return {
    id: `el-${idc++}`, type, x, y, width: w, height: h, angle: 0,
    strokeColor: '#1e1e1e', backgroundColor: 'transparent', fillStyle: 'solid',
    strokeWidth: 2, strokeStyle: 'solid', roughness: 1, opacity: 100, groupIds: [],
    frameId: null, roundness: type === 'rectangle' ? { type: 3 } : null,
    seed: rnd(), version: 1, versionNonce: rnd(), isDeleted: false,
    boundElements: [], updatedAt: now(), link: null, locked: false, ...extra,
  };
}

function rect(x, y, w, h, stroke, bg, o = {}) {
  els.push(base('rectangle', x, y, w, h, { strokeColor: stroke, backgroundColor: bg, ...o }));
}
function diamond(x, y, w, h, stroke, bg) {
  els.push(base('diamond', x, y, w, h, { strokeColor: stroke, backgroundColor: bg }));
}
function text(x, y, str, size = 16, color = '#1e1e1e', family = 2, align = 'left') {
  const lines = str.split('\n');
  const w = Math.max(...lines.map((l) => l.length)) * size * 0.58 + 6;
  const h = lines.length * size * 1.25 + 4;
  els.push(base('text', x, y, w, h, {
    text: str, fontSize: size, fontFamily: family, textAlign: align, verticalAlign: 'top',
    baseline: Math.round(size * 0.9), containerId: null, originalText: str,
    lineHeight: 1.25, autoResize: true, strokeColor: color,
  }));
  return h;
}
function arrow(x1, y1, x2, y2, color = '#1e1e1e', endHead = 'arrow', startHead = null, dashed = false) {
  const w = x2 - x1; const h = y2 - y1;
  els.push(base('arrow', x1, y1, Math.abs(w) || 1, Math.abs(h) || 1, {
    strokeColor: color, points: [[0, 0], [w, h]], lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: startHead, endArrowhead: endHead,
    strokeStyle: dashed ? 'dashed' : 'solid',
  }));
}
// labeled box: rectangle + bold title + body, color palette
function box(x, y, w, h, title, body, stroke, bg) {
  rect(x, y, w, h, stroke, bg);
  text(x + 14, y + 12, title, 17, stroke, 2);
  if (body) text(x + 14, y + 40, body, 13, '#1e1e1e', 2);
}
function section(x, y, w, h, label, color) {
  rect(x, y, w, h, color, 'transparent', { strokeStyle: 'dashed', strokeWidth: 1.5, backgroundColor: 'transparent' });
  text(x + 16, y + 12, label, 22, color, 3);
}

// palettes
const BLUE = '#1971c2'; const BLUEB = '#a5d8ff';
const GREEN = '#2f9e44'; const GREENB = '#b2f2bb';
const VIO = '#6741d9'; const VIOB = '#d0bfff';
const ORA = '#e8590c'; const ORAB = '#ffd8a8';
const RED = '#e03131'; const REDB = '#ffc9c9';
const TEAL = '#0c8599'; const TEALB = '#c5f6fa';
const GREY = '#495057'; const GREYB = '#e9ecef';

// ===== TITLE =====
text(60, 30, 'memory-team — Complete System Guide', 34, '#1e1e1e', 3);
text(60, 78, 'Claude Code agent teams (live peer communication) + persistent per-project memory in an Obsidian vault.', 16, GREY, 2);

let Y = 130;

// ===== SECTION 1: SETUP =====
section(40, Y, 1760, 230, '1 · SETUP  (once per machine — makes it universal)', BLUE);
const s1y = Y + 60;
box(70, s1y, 300, 120, 'git clone + cd', 'Download the project on ANY PC.\n\n$ git clone …/AgentTeam-Memory\n$ cd AgentTeam-Memory', BLUE, BLUEB);
box(430, s1y, 300, 120, 'open Claude Code', 'Run claude inside the folder.\n\n$ claude', BLUE, BLUEB);
box(790, s1y, 320, 120, 'run /setup', 'Type  /setup  (or !node install.mjs)\nor in a terminal: node install.mjs\n[--vault <dir>]', BLUE, BLUEB);
box(1170, s1y, 600, 120, 'install.mjs promotes to USER scope (~/.claude)', '• settings.json MERGED (+ .bak backup): agent teams ON, MEMORY_VAULT, in-process, 2 hooks\n• copies 4 agents -> ~/.claude/agents  (replaces {{MEM}} with the real path)\n• copies runtime -> ~/.claude/memory-team (lib.mjs, memory.mjs, hooks)\n• injects Memory Protocol into ~/.claude/CLAUDE.md\n• creates the central vault (default ~/.claude/memory-vault)', BLUE, BLUEB);
arrow(370, s1y + 60, 430, s1y + 60, BLUE);
arrow(730, s1y + 60, 790, s1y + 60, BLUE);
arrow(1110, s1y + 60, 1170, s1y + 60, BLUE);
Y += 270;

// ===== SECTION 2: BRING UP A TEAM =====
section(40, Y, 1760, 250, '2 · BRING UP A TEAM  (in ANY project, every time)', GREEN);
const s2y = Y + 60;
box(70, s2y, 300, 130, 'claude in a project', 'Open a terminal in the project,\nrun claude. Agent teams + memory\nare already active (global install).', GREEN, GREENB);
box(430, s2y, 360, 130, 'prompt the LEAD (natural language)', '"Create an agent team named memory-team\nwith researcher, executor, reviewer,\nlibrarian. Read the vault first, talk via\nSendMessage, log decisions, librarian\nindexes at the end."', GREEN, GREENB);
box(850, s2y, 360, 130, 'LEAD orchestrates', '• spawns teammates from the\n  reusable role definitions\n• creates + assigns tasks on the\n  SHARED TASK LIST\n• Shift+Down cycles teammates', GREEN, GREENB);
box(1270, s2y, 500, 130, 'why not plain subagents?', 'Subagents only report back to the lead and\nCANNOT talk to each other. Agent teams are\nPEERS with a mailbox (SendMessage) + a shared\ntask list — that is what enables real collaboration.', GREEN, GREENB);
arrow(370, s2y + 65, 430, s2y + 65, GREEN);
arrow(790, s2y + 65, 850, s2y + 65, GREEN);
Y += 290;

// ===== SECTION 3: THE TEAM (communication) =====
section(40, Y, 1760, 320, '3 · THE TEAM  (peers communicating live)', VIO);
const lx = 800; const ly = Y + 70;
box(lx, ly, 200, 70, 'LEAD', 'orchestrator', VIO, VIOB);
const tw = 230; const th = 90; const ty = ly + 150;
box(120, ty, tw, th, 'researcher', 'explores, gathers,\ngrounds with sources', VIO, VIOB);
box(560, ty, tw, th, 'executor', 'implements concrete\ndeliverables', VIO, VIOB);
box(1000, ty, tw, th, 'reviewer', 'adversarial — tries\nto refute', VIO, VIOB);
box(1440, ty, tw, th, 'librarian', 'curates + indexes\nthe memory', VIO, VIOB);
// lead -> teammates
arrow(lx + 40, ly + 70, 235, ty, VIO, 'arrow', null, true);
arrow(lx + 80, ly + 70, 675, ty, VIO, 'arrow', null, true);
arrow(lx + 120, ly + 70, 1115, ty, VIO, 'arrow', null, true);
arrow(lx + 160, ly + 70, 1555, ty, VIO, 'arrow', null, true);
// peer <-> peer SendMessage (double-headed)
arrow(350, ty + 45, 560, ty + 45, '#0b7285', 'arrow', 'arrow');
arrow(790, ty + 45, 1000, ty + 45, '#0b7285', 'arrow', 'arrow');
arrow(1230, ty + 45, 1440, ty + 45, '#0b7285', 'arrow', 'arrow');
text(360, ty + 10, 'SendMessage (peer ↔ peer mailbox)', 13, '#0b7285', 3);
box(120, ty + 130, 700, 60, 'SHARED TASK LIST  (~/.claude/tasks/<team>)', 'pending → in-progress → completed · file-locked · dependency-aware · managed by Claude Code', GREY, GREYB);
Y += 360;

// ===== SECTION 4: MEMORY LOOP =====
section(40, Y, 1760, 250, '4 · MEMORY LOOP  (every teammate: READ before, WRITE after)', VIO);
const m = Y + 70; const bw = 360; const bh = 120;
box(70, m, bw, bh, 'READ before acting', 'node memory.mjs search <term>\n+ read the project _index.md\n+ read your own state note.\nNever start without consulting memory.', VIO, VIOB);
box(530, m, bw, bh, 'ACT', 'Do the task (code, research,\nreview). Collaborate via\nSendMessage + log on the board.', VIO, VIOB);
box(990, m, bw, bh, 'WRITE after (atomic note)', 'node memory.mjs save <type> "title"\n--agent <you> --task <id> --summary …\nOne note = one fact/decision/learning.', VIO, VIOB);
box(1450, m, 320, bh, 'librarian: INDEX', 'node memory.mjs index\nregenerates _index.md (MOC)\n+ fixes wikilinks/tags.', VIO, VIOB);
arrow(430, m + 60, 530, m + 60, VIO);
arrow(890, m + 60, 990, m + 60, VIO);
arrow(1350, m + 60, 1450, m + 60, VIO);
arrow(1610, m + bh, 1610, m + bh + 30, VIO); // down
arrow(1610, m + bh + 30, 250, m + bh + 30, VIO); // back-left
arrow(250, m + bh + 30, 250, m + bh, VIO); // up into READ (loop)
text(700, m + bh + 8, 'loop each task — the vault is the only thing that survives a teammate ending', 13, VIO, 3);
Y += 290;

// ===== SECTION 5: CENTRAL VAULT =====
section(40, Y, 870, 300, '5 · CENTRAL VAULT  (partitioned per project)', ORA);
const v = Y + 60;
box(70, v, 810, 60, '<vault>  (default ~/.claude/memory-vault, set via MEMORY_VAULT)', '_index.md = master MOC (lists all projects)', ORA, ORAB);
box(70, v + 80, 520, 150, 'projects/<project>/', '_index.md   per-project MOC (librarian)\nmemory/     YYYY-MM-DD-<slug>.md  (facts/decisions/learnings)\nboard/      YYYY-MM-DD-<from>-to-<to>.md  (communication)\nagents/     <name>.md  (teammate STATE — survives session)\ntasks/      mirror of the shared task list', ORA, ORAB);
box(610, v + 80, 270, 150, 'global/', 'cross-project knowledge\n\nmemory/\nboard/\n\nshared by every project', ORA, ORAB);
text(70, v + 240, 'Project auto-detected from the working folder (cwd) → notes file themselves under the right partition.', 13, ORA, 2);

// ===== SECTION 6: HOOKS =====
section(930, Y, 870, 300, '6 · HOOKS  (quality gates — opt-in, fail-open)', RED);
const h2 = Y + 60;
box(960, h2, 810, 56, 'opt-in:  node memory.mjs enable  → writes .memory-team marker', 'No marker → hooks ALLOW everything (fail-open). Marker present → hooks ENFORCE in this project.', RED, REDB);
// TaskCompleted gate
diamond(980, h2 + 80, 260, 110, RED, REDB);
text(1000, h2 + 110, 'TaskCompleted\nnote for --task\nexists?', 13, RED, 2, 'center');
box(1290, h2 + 70, 220, 56, 'YES → allow', 'task closes (exit 0)', GREEN, GREENB);
box(1290, h2 + 140, 220, 56, 'NO → BLOCK', 'exit 2 + feedback', RED, REDB);
arrow(1240, h2 + 120, 1290, h2 + 98, GREEN);
arrow(1240, h2 + 150, 1290, h2 + 168, RED);
// TeammateIdle gate
diamond(1540, h2 + 80, 230, 110, RED, REDB);
text(1560, h2 + 110, 'TeammateIdle\nstate note\nexists?', 13, RED, 2, 'center');
text(960, h2 + 210, 'TeammateIdle: NO state → exit 2 (keep working & flush state) · YES → exit 0. Any parse error/unknown id → fail-open (never deadlocks the team).', 12, RED, 2);
Y += 340;

// ===== SECTION 7: INTERNAL LOGIC =====
section(40, Y, 1760, 250, '7 · INTERNAL LOGIC  (how the pieces resolve)', TEAL);
const i = Y + 60;
box(70, i, 400, 160, 'lib.mjs  (shared core)', 'vaultRoot()  = env MEMORY_VAULT || ~/.claude/memory-vault\nprojectName()= env MEMORY_PROJECT || slug(basename(cwd))\nisEnabled()  = exists(cwd/.memory-team)\npartition()  = <vault>/projects/<proj>/…\n+ parseFM (BOM-safe), walk, slug, today', TEAL, TEALB);
box(510, i, 380, 160, 'memory.mjs  (CLI)', 'where  → vault, project, enabled?\nenable → marker + partition\nsearch → current project + global (--all = every)\nsave   → atomic note, auto-filed by project\nindex  → per-project _index + master MOC', TEAL, TEALB);
box(930, i, 380, 160, 'hooks  (task-completed / teammate-idle)', 'read JSON on stdin (BOM-stripped)\nresolve cwd → project; if not enabled → exit 0\ntry many field names (task_id/taskId/…)\nscan vault partition for the note\nblock (exit 2) or allow (exit 0)\nwrite .last-*.json for schema diagnostics', TEAL, TEALB);
box(1350, i, 420, 160, 'install.mjs  (promotion)', 'resolves home (os.homedir) + vault\ncopies runtime + agents (resolves {{MEM}})\nMERGES settings.json (idempotent, backup)\ninjects protocol between markers in CLAUDE.md\nscaffolds vault + master index\n--home/--vault override for any machine', TEAL, TEALB);
Y += 290;

// ===== KEY / LEGEND =====
text(60, Y + 10, 'KEY:  → flow/step    ↔ SendMessage (peer mailbox)    dashed = spawn / loop    ◇ = hook decision gate', 14, GREY, 3);
text(60, Y + 36, 'Persistence truth: agent teams have NO shared memory & NO session resume — restart, re-spawn, and teammates recover context by READING the vault.', 14, '#1e1e1e', 2);

const doc = {
  type: 'excalidraw', version: 2, source: 'memory-team build-guide.mjs',
  elements: els,
  appState: { gridSize: null, viewBackgroundColor: '#ffffff' },
  files: {},
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(doc, null, 2), 'utf8');
console.log(`wrote ${OUT} (${els.length} elements)`);
