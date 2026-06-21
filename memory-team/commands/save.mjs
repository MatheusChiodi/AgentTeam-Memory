// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// save — write an atomic note, auto-filed under the current project (or --global).
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  TYPES, slug, today, partition, globalPart, ensure, ensurePartition,
} from '../lib.mjs';
import { relOf } from '../notes.mjs';

function destDir(ROOT, PROJECT, type, opt) {
  const useGlobal = opt.global === true;
  const part = useGlobal ? globalPart(ROOT) : partition(ROOT, PROJECT);
  ensurePartition(ROOT, PROJECT); // also ensures global dirs exist
  if (type === 'state') return partition(ROOT, PROJECT).agents; // state is always per-project
  if (type === 'communication') return part.board;
  return part.memory;
}

export default {
  name: 'save',
  summary: 'Write an atomic note (memory|decision|learning|communication|state)',
  usage: 'save <type> "<title>" [--agent n --summary "..." --tags "a,b" --task id --from n --to n --global]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const type = ctx.pos[0];
    const title = (ctx.pos.slice(1).join(' ') || opt.title || '').trim();
    if (!type || !TYPES.includes(type)) return { ok: false, code: 1, lines: [`invalid type. use: ${TYPES.join(' | ')}`] };
    if (!title) return { ok: false, code: 1, lines: ['usage: save <type> "<title>" [options]'] };

    const agent = opt.agent || opt.from || 'unknown';
    const date = today();
    const dir = destDir(ROOT, PROJECT, type, opt);
    ensure(dir);

    let file;
    if (type === 'state') file = join(dir, `${slug(title)}.md`);
    else if (type === 'communication') file = join(dir, `${date}-${slug(opt.from || agent)}-to-${slug(opt.to || 'all')}.md`);
    else file = join(dir, `${date}-${slug(title)}.md`);

    if (existsSync(file) && type === 'state') {
      return { ok: true, lines: [`already exists: ${relOf(ROOT, file)} — edit it to update the state.`], data: { file: relOf(ROOT, file), created: false } };
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
    return { ok: true, lines: [relOf(ROOT, final)], data: { file: relOf(ROOT, final), type, created: true } };
  },
};
