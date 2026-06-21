// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// template — scaffold a note from a named template (built-in or vault `_templates/`).
// `template list` enumerates templates; `template <name> "<title>"` creates a note whose
// body is the template skeleton with placeholders filled, reusing save's canonical
// naming/archiving/frontmatter. We delegate the file creation to `save` (so the path,
// dedup and frontmatter stay in one place), then rewrite only the body via formatNote —
// preserving the frontmatter save just wrote.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TYPES, today } from '../lib.mjs';
import { readNote, formatNote, relOf } from '../notes.mjs';
import { fail } from './_ctx.mjs';
import save from './save.mjs';

// Built-in templates. `type` defaults the note type when not overridden by save's
// positional. Bodies use {{title}}/{{date}}/{{project}}/{{agent}} placeholders.
const BUILTIN = {
  decision: {
    type: 'decision',
    body: [
      '# {{title}}',
      '',
      '## Context',
      '(what forced a choice — the situation on {{date}})',
      '',
      '## Options',
      '- Option A — ',
      '- Option B — ',
      '',
      '## Decision',
      '(what was chosen and by whom — {{agent}})',
      '',
      '## Consequences',
      '(trade-offs, follow-ups, what this rules out)',
    ].join('\n'),
  },
  learning: {
    type: 'learning',
    body: [
      '# {{title}}',
      '',
      '## What I learned',
      '(the insight, stated atomically)',
      '',
      '## Evidence',
      '(what proved it — error, benchmark, doc, link)',
      '',
      '## How to apply',
      '(the next time this comes up, do X — for {{project}})',
    ].join('\n'),
  },
  meeting: {
    type: 'communication',
    body: [
      '# {{title}}',
      '',
      '**Date:** {{date}}',
      '',
      '## Participants',
      '- {{agent}}',
      '',
      '## Points',
      '- ',
      '',
      '## Actions',
      '- [ ] ',
    ].join('\n'),
  },
};

// Fill {{title}}/{{date}}/{{project}}/{{agent}} placeholders in a template body.
// Contract: only these four keys are substituted; any other {{token}} is left
// LITERAL (a vault template may use {{...}} for content the author fills by hand).
function fillPlaceholders(body, vars) {
  return String(body).replace(/\{\{\s*(title|date|project|agent)\s*\}\}/g, (_, k) => vars[k] ?? '');
}

/**
 * Parse a vault template file (`_templates/<name>.md`). An optional leading frontmatter
 * may declare `type:`; the rest is the body skeleton. Returns { type, body }.
 */
function parseVaultTemplate(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { type: null, body: raw };
  const typeMatch = /^type:\s*(.+)$/m.exec(m[1]);
  const type = typeMatch ? typeMatch[1].trim() : null;
  return { type: TYPES.includes(type) ? type : null, body: m[2] };
}

/** Collect all templates: built-ins overlaid by vault `_templates/*.md`. */
function collectTemplates(ROOT) {
  const out = new Map();
  for (const [name, t] of Object.entries(BUILTIN)) out.set(name, { name, type: t.type, body: t.body, source: 'builtin' });
  const dir = join(ROOT, '_templates');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const name = f.slice(0, -3);
      let raw;
      try { raw = readFileSync(join(dir, f), 'utf8'); } catch { continue; }
      const { type, body } = parseVaultTemplate(raw);
      out.set(name, { name, type, body, source: 'vault' });
    }
  }
  return out;
}

export default {
  name: 'template',
  summary: 'Scaffold a note from a template (built-in or vault _templates/)',
  usage: 'template list | template <name> "<title>" [--agent n --tags "a,b" --task id --global]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const templates = collectTemplates(ROOT);
    const sub = ctx.pos[0];

    if (!sub || sub === 'list') {
      const items = [...templates.values()].sort((a, b) => a.name.localeCompare(b.name));
      const lines = ['# templates', ...items.map((t) => `- ${t.name} (${t.type || 'memory'}) · ${t.source}`)];
      return { ok: true, lines, data: { templates: items.map((t) => ({ name: t.name, type: t.type || 'memory', source: t.source })) } };
    }

    const tpl = templates.get(sub);
    if (!tpl) {
      const valid = [...templates.keys()].sort().join(', ');
      return fail(`unknown template "${sub}". valid: ${valid}`);
    }

    const title = (ctx.pos.slice(1).join(' ') || opt.title || '').trim();
    if (!title) return fail('usage: template <name> "<title>" [options]');

    const agent = opt.agent || opt.from || 'teammate';
    const type = tpl.type || 'memory';

    // Delegate creation to `save` so naming/destination/dedup/frontmatter stay canonical.
    const saved = save.run({
      ROOT,
      PROJECT,
      pos: [type, title],
      opt: {
        agent,
        summary: opt.summary || title,
        tags: opt.tags,
        related: opt.related,
        task: opt.task,
        global: opt.global,
      },
    });
    if (!saved.ok || !saved.data || !saved.data.file) return saved;
    // Honor save's idempotency: if the note already existed (created:false), never
    // rewrite its body — pass save's own result straight through.
    if (saved.data.created === false) return saved;

    // Rewrite only the body with the filled template skeleton, keeping save's frontmatter.
    const file = join(ROOT, saved.data.file);
    const note = readNote(file, ROOT);
    const vars = { title, date: today(), project: opt.global === true ? 'global' : PROJECT, agent };
    const body = fillPlaceholders(tpl.body, vars);
    writeFileSync(file, formatNote(note.fm, body), 'utf8');

    const rel = relOf(ROOT, file);
    return {
      ok: true,
      lines: [rel],
      data: { file: rel, type, template: sub, created: true },
    };
  },
};
