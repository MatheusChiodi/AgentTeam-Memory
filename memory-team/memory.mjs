#!/usr/bin/env node
// memory.mjs — memory CLI for the memory-team system (central, per-project vault).
// No external dependencies. ESM. Self-locating.
//
// Usage (run from your PROJECT folder — the project is auto-detected from the cwd):
//   node memory.mjs where
//   node memory.mjs enable                       # opt-in: hooks will enforce memory here
//   node memory.mjs search <term|tag> [--all]    # current project + global; --all = every project
//   node memory.mjs save <type> "<title>" [--agent n] [--summary "..."] [--tags "a,b"]
//                        [--related "[[x]]"] [--task id] [--from n --to n] [--global]
//   node memory.mjs index [--all]                # reindex current project (+ master); --all = every project
//
// types: memory | decision | learning | communication | state

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, relative, basename } from 'node:path';
import {
  TYPES, slug, today, vaultRoot, projectName, projectDir, isEnabled,
  partition, globalPart, ensure, ensurePartition, parseFM, walk, listProjects,
} from './lib.mjs';

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      opt[a.slice(2)] = next != null && !next.startsWith('--') ? argv[++i] : true;
    } else pos.push(a);
  }
  return { pos, opt };
}

const ROOT = vaultRoot();
const PROJECT = projectName();
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

function cmdWhere() {
  const p = partition(ROOT, PROJECT);
  const notes = existsSync(p.base) ? walk(p.base).length : 0;
  console.log(`vault root : ${ROOT}`);
  console.log(`project    : ${PROJECT}`);
  console.log(`project dir: ${projectDir()}`);
  console.log(`enabled    : ${isEnabled() ? 'yes (hooks enforce)' : 'no (hooks fail-open — run: enable)'}`);
  console.log(`notes      : ${notes} in projects/${PROJECT}`);
  console.log(`projects   : ${listProjects(ROOT).join(', ') || '(none yet)'}`);
}

function cmdEnable() {
  const cwd = projectDir();
  const marker = join(cwd, '.memory-team');
  ensurePartition(ROOT, PROJECT);
  if (!existsSync(marker)) {
    writeFileSync(marker, `project: ${PROJECT}\nvault: ${ROOT}\nenabled: ${today()}\n`
      + '# Marks this project as memory-team enabled (TaskCompleted/TeammateIdle hooks enforce here).\n', 'utf8');
  }
  console.log(`enabled "${PROJECT}" -> partition projects/${PROJECT} ready; marker .memory-team written.`);
}

function destDir(type, opt) {
  const useGlobal = opt.global === true;
  const part = useGlobal ? globalPart(ROOT) : partition(ROOT, PROJECT);
  ensurePartition(ROOT, PROJECT); // also ensures global dirs exist
  if (type === 'state') return partition(ROOT, PROJECT).agents; // state is always per-project
  if (type === 'communication') return part.board;
  return part.memory;
}

function cmdSave(type, title, opt) {
  if (!type || !TYPES.includes(type)) { console.error(`invalid type. use: ${TYPES.join(' | ')}`); process.exit(1); }
  if (!title) { console.error('usage: save <type> "<title>" [options]'); process.exit(1); }
  const agent = opt.agent || opt.from || 'unknown';
  const date = today();
  const dir = destDir(type, opt);
  ensure(dir);

  let file;
  if (type === 'state') file = join(dir, `${slug(title)}.md`);
  else if (type === 'communication') file = join(dir, `${date}-${slug(opt.from || agent)}-to-${slug(opt.to || 'all')}.md`);
  else file = join(dir, `${date}-${slug(title)}.md`);

  if (existsSync(file) && type === 'state') {
    console.log(`already exists: ${rel(file)} — edit it to update the state.`);
    return;
  }
  let final = file;
  if (type !== 'state') { let n = 2; while (existsSync(final)) { final = file.replace(/\.md$/, `-${n}.md`); n++; } }

  const tags = opt.tags ? String(opt.tags).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const related = opt.related ? String(opt.related).split(',').map((s) => s.trim()).filter(Boolean) : [];
  const relFmt = related.map((r) => (r.startsWith('[[') ? `"${r}"` : `"[[${r}]]"`)).join(', ');
  const scope = opt.global === true ? 'global' : PROJECT;

  const body = type === 'communication'
    ? `**From:** ${opt.from || agent} → **To:** ${opt.to || 'all'}\n\n> (message logged for audit — mirror here the gist of the SendMessage)`
    : type === 'state'
      ? '**State summary.** Always update before going idle.\n\n- **Done:** \n- **In progress:** \n- **Next step:** \n- **Decisions/open items:** \n- **Related notes:** [[ ]]'
      : '(objective content — use [[wikilinks]] to connect and Mermaid when helpful)';

  const lines = [
    '---',
    `type: ${type}`,
    `project: ${scope}`,
    `agent: ${agent}`,
    `summary: "${(opt.summary || title).replace(/"/g, '\\"')}"`,
    `tags: [${tags.join(', ')}]`,
    `related: [${relFmt}]`,
    opt.task ? `task: ${opt.task}` : null,
    `created: ${date}`,
    '---', '', `# ${title}`, '', body, '',
  ].filter((x) => x !== null).join('\n');

  writeFileSync(final, lines, 'utf8');
  console.log(rel(final));
}

function cmdSearch(term, opt) {
  if (!term) { console.error('usage: search <term|tag> [--all]'); process.exit(1); }
  const t = term.toLowerCase();
  let bases;
  if (opt.all === true) bases = [join(ROOT, 'projects'), join(ROOT, 'global')];
  else bases = [partition(ROOT, PROJECT).base, globalPart(ROOT).base];

  const res = [];
  for (const base of bases) {
    for (const f of walk(base)) {
      const { fm, body } = parseFM(readFileSync(f, 'utf8'));
      const tags = Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []);
      let score = 0;
      if (tags.some((x) => x.toLowerCase().includes(t))) score += 5;
      if ((fm.summary || '').toLowerCase().includes(t)) score += 4;
      if (basename(f).toLowerCase().includes(t)) score += 3;
      if ((fm.type || '').toLowerCase() === t) score += 3;
      if ((fm.agent || '').toLowerCase().includes(t)) score += 2;
      if (body.toLowerCase().includes(t)) score += 1;
      if (score > 0) res.push({ f, fm, tags, score });
    }
  }
  res.sort((a, b) => b.score - a.score);
  const where = opt.all === true ? 'all projects + global' : `${PROJECT} + global`;
  if (!res.length) { console.log(`(no notes for "${term}" in ${where})`); return; }
  console.log(`# ${res.length} note(s) for "${term}" in ${where}\n`);
  for (const r of res) {
    console.log(`- [[${basename(r.f, '.md')}]]  (${r.fm.type || '?'} · ${r.fm.project || '?'} · ${r.fm.agent || '?'})`);
    if (r.fm.summary) console.log(`    summary: ${r.fm.summary}`);
    if (r.tags.length) console.log(`    tags: ${r.tags.join(', ')}`);
    console.log(`    file: ${rel(r.f)}`);
  }
}

function indexOne(project) {
  const p = partition(ROOT, project);
  if (!existsSync(p.base)) return 0;
  const notes = walk(p.base).map((f) => ({ f, ...parseFM(readFileSync(f, 'utf8')) }));
  const byType = {};
  for (const n of notes) (byType[n.fm.type || 'untyped'] ||= []).push(n);
  const order = ['decision', 'learning', 'memory', 'communication', 'state', 'untyped'];
  const titles = {
    decision: 'Decisions', learning: 'Learnings', memory: 'Memories',
    communication: 'Board / Communication', state: 'Agent state', untyped: 'Other',
  };
  const out = [
    '---', 'type: index', `project: ${project}`,
    `summary: "MOC for project ${project} (${notes.length} notes)."`,
    `created: ${today()}`, '---', '',
    `# 🧠 Memory Index — ${project}`, '',
    `> Generated by \`memory.mjs index\`. ${notes.length} note(s).`, '',
  ];
  for (const type of [...order, ...Object.keys(byType).filter((x) => !order.includes(x))]) {
    const arr = byType[type];
    if (!arr || !arr.length) continue;
    out.push(`## ${titles[type] || type}`, '');
    arr.sort((a, b) => basename(b.f).localeCompare(basename(a.f)));
    for (const n of arr) {
      const tags = Array.isArray(n.fm.tags) ? n.fm.tags : [];
      out.push(`- [[${basename(n.f, '.md')}]]`
        + (n.fm.agent ? ` · _${n.fm.agent}_` : '')
        + (n.fm.summary ? ` — ${n.fm.summary}` : '')
        + (tags.length ? `  \`${tags.join('` `')}\`` : ''));
    }
    out.push('');
  }
  ensure(p.base);
  writeFileSync(p.index, out.join('\n'), 'utf8');
  return notes.length;
}

function indexMaster() {
  const projects = listProjects(ROOT);
  const out = [
    '---', 'type: index',
    'summary: "Master MOC — all memory-team projects."',
    `created: ${today()}`, '---', '',
    '# 🧠 memory-team — Master Index', '',
    `> ${projects.length} project(s). Generated by \`memory.mjs index\`.`, '',
  ];
  for (const proj of projects.sort()) {
    const n = existsSync(partition(ROOT, proj).base) ? walk(partition(ROOT, proj).base).length : 0;
    out.push(`- [${proj}](projects/${proj}/_index.md) — ${n} note(s)`);
  }
  out.push('');
  ensure(ROOT);
  writeFileSync(join(ROOT, '_index.md'), out.join('\n'), 'utf8');
}

function cmdIndex(opt) {
  ensure(join(ROOT, 'projects')); // never auto-create a partition just for indexing
  if (opt.all === true) {
    let total = 0;
    for (const proj of listProjects(ROOT)) total += indexOne(proj);
    indexMaster();
    console.log(`indexed ${listProjects(ROOT).length} project(s), ${total} notes. Master _index.md updated.`);
  } else {
    const n = indexOne(PROJECT);
    indexMaster();
    console.log(`indexed projects/${PROJECT} (${n} notes) + master _index.md.`);
  }
}

const { pos, opt } = parseArgs(process.argv.slice(2));
switch (pos[0]) {
  case 'where': cmdWhere(); break;
  case 'enable': cmdEnable(); break;
  case 'save': cmdSave(pos[1], (pos.slice(2).join(' ') || opt.title || '').trim(), opt); break;
  case 'search': cmdSearch(pos.slice(1).join(' '), opt); break;
  case 'index': cmdIndex(opt); break;
  default:
    console.log(`usage:
  node memory.mjs where
  node memory.mjs enable
  node memory.mjs search <term|tag> [--all]
  node memory.mjs save <type> "<title>" [--agent n --summary "..." --tags "a,b" --task id --from n --to n --global]
  node memory.mjs index [--all]

types: ${TYPES.join(' | ')}   vault: ${ROOT}   project: ${PROJECT}`);
}
