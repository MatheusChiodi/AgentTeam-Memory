// mindmap (F40) — a Mermaid `mindmap` centered on one note (<ref>) or a tag (--tag). With a
// note: root = the note; branches = its 1st-level [[wikilinks]] plus notes sharing >=1 tag.
// With a tag: root = the tag; branches = notes carrying it. Labels go through mermaidEscape so
// a hostile title (`a]b"c|d`) can never leak `] " |` into the block. Complements `diagram`
// (F21) with a local focus. `--save` persists as a `memory` note (tag mindmap). Read-only else.
import { collectNotes, resolveNotes, wikilinksOf, saveNote } from '../notes.mjs';
import { mermaidEscape } from '../render.mjs';
import { today } from '../lib.mjs';
import { fail } from './_ctx.mjs';

/** Wrap a root + branch names into a fenced ```mermaid `mindmap` block. */
function renderMindmap(root, branches) {
  // A root that escapes to empty (e.g. a tag like "|||") would render `root(())`; fall back
  // to a safe placeholder so the mindmap block stays valid.
  const safeRoot = mermaidEscape(root) || 'root';
  const lines = ['```mermaid', 'mindmap', `  root((${safeRoot}))`];
  for (const b of branches) lines.push(`    ${mermaidEscape(b)}`);
  lines.push('```');
  return lines;
}

export default {
  name: 'mindmap',
  summary: 'Mermaid mindmap centered on a note (<ref>) or a tag (--tag)',
  usage: 'mindmap [<ref>] [--tag <t>] [--depth N] [--save] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const ref = ctx.pos.join(' ').trim();
    const tag = typeof opt.tag === 'string' ? opt.tag : null;
    // depth is parsed for forward-compat (1st level is the spec default); accepted, clamped >=1.
    const depth = Math.max(1, parseInt(opt.depth, 10) || 1);

    let root;
    let branches;

    if (ref) {
      const matches = resolveNotes(ROOT, ref, scope);
      if (!matches.length) return fail(`no note matches "${ref}"`);
      if (matches.length > 1) {
        return fail(`ambiguous "${ref}" — matches: ${matches.map((m) => m.name).join(', ')}`);
      }
      const note = matches[0];
      const notes = collectNotes(ROOT, scope);
      const byName = new Map(notes.map((n) => [n.name.toLowerCase(), n.name]));
      const noteTags = new Set(note.tags.map((t) => String(t).toLowerCase()));

      const picked = new Map(); // lower → original, de-dupes link+tag overlap, excludes self
      // 1st-level wikilinks that resolve to a real note in scope.
      for (const link of wikilinksOf(note)) {
        const real = byName.get(link.toLowerCase());
        if (real && real !== note.name) picked.set(real.toLowerCase(), real);
      }
      // Notes sharing at least one tag.
      if (noteTags.size) {
        for (const n of notes) {
          if (n.name === note.name) continue;
          if (n.tags.some((t) => noteTags.has(String(t).toLowerCase()))) {
            picked.set(n.name.toLowerCase(), n.name);
          }
        }
      }
      root = note.name;
      branches = [...picked.values()].sort((a, b) => a.localeCompare(b));
    } else if (tag) {
      const wantTag = tag.toLowerCase();
      const notes = collectNotes(ROOT, scope);
      const carriers = notes
        .filter((n) => n.tags.some((t) => String(t).toLowerCase() === wantTag))
        .map((n) => n.name)
        .sort((a, b) => a.localeCompare(b));
      root = `#${tag}`;
      branches = carriers; // tag with no notes → root-only mindmap, exit 0
    } else {
      return fail('usage: mindmap [<ref>] [--tag <t>] [--depth N] [--save] [--all] [--json]');
    }

    const block = renderMindmap(root, branches);
    const data = { root, branches };

    if (opt.save === true) {
      const { file } = saveNote(ROOT, PROJECT, {
        type: 'memory',
        title: `mindmap ${root}`,
        summary: `Mermaid mindmap centered on ${root}`,
        tags: ['mindmap'],
        agent: 'mindmap',
        body: block.join('\n'),
        created: typeof opt.today === 'string' ? opt.today : today(),
      });
      return { ok: true, lines: [`saved mindmap → ${file}`, ...block], data: { ...data, file } };
    }

    return { ok: true, lines: block, data };
  },
};
