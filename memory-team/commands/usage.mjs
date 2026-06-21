// usage — F12: historical cost/token ledger over Claude Code session transcripts.
// The statusline (F11) shows only the "now"; this aggregates the .jsonl transcripts
// into a per-day / per-project history. It scans a transcripts directory recursively
// for .jsonl files, sums tokens+cost from each assistant line that carries `usage`,
// and buckets by day (from the line timestamp, falling back to the file mtime) and by
// project (the transcripts subdir name when scanning ~/.claude/projects).
//
// Testability: `--dir <path>` overrides the scan root (tests point it at a temp dir);
// default is ~/.claude/projects. A missing default isn't an error — it yields a zeroed
// aggregate and exit 0, since "no transcripts here" is a legitimate state.
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import { today } from '../lib.mjs';
import { readNote, formatNote } from '../notes.mjs';
import save from './save.mjs';

const defaultDir = () => join(homedir(), '.claude', 'projects');

/** Recursively collect every .jsonl file under `dir` (absolute paths). */
function collectTranscripts(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) out.push(...collectTranscripts(p));
    else if (name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}

// Project name for a transcript = its first path segment under the scan root.
// Real ~/.claude/projects dirs encode the whole cwd with every separator flattened to
// '-' (e.g. `D--PROJETOS-Sistemas-AgentTeam-Memory` for D:\PROJETOS\Sistemas\AgentTeam-
// Memory), which reads opaque. A 1:1 reversal is impossible — a real dash in a folder
// name is indistinguishable from an encoded separator — so we don't try. Instead, for a
// clearly-encoded slug (many '-' tokens) we surface the LAST TWO tokens as a friendly
// label (`AgentTeam-Memory`), the leaf folder that the user actually recognizes. Short
// slugs (test dirs like `projA`, or a 1-2 token name) pass through unchanged so buckets
// stay unique. This is a readability heuristic, documented as such.
function projectOf(root, file) {
  const rel = relative(root, file);
  const segs = rel.split(sep).filter(Boolean);
  const raw = segs.length > 1 ? segs[0] : 'unknown';
  const tokens = raw.split('-').filter(Boolean);
  return tokens.length > 3 ? tokens.slice(-2).join('-') : raw;
}

/** YYYY-MM-DD from an assistant line's timestamp, else the file's mtime day. */
function dayOf(obj, fileMtimeDay) {
  const ts = obj.timestamp || obj.created_at || obj.message?.timestamp;
  if (ts) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) {
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    }
  }
  return fileMtimeDay;
}

/** Tokens for one usage object: input + cache_read + cache_creation + output. */
function tokensOf(u) {
  return (u.input_tokens || 0) + (u.cache_read_input_tokens || 0)
    + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
}

// Per-message cost only. We deliberately do NOT read `obj.cost.total_cost_usd`: that
// field is the session's CUMULATIVE cost (what the statusLine shows), not a per-entry
// delta — summing it line-by-line overcounts. The transcript carries no per-entry cost,
// so a line contributes cost only via an explicit per-message field (costUSD / cost_usd /
// message.usage.cost); otherwise it contributes tokens only.
function costOf(obj, u) {
  const c = obj.costUSD ?? obj.cost_usd ?? u.cost;
  return Number.isFinite(c) ? c : 0;
}

const fileMtimeDay = (file) => {
  try {
    const d = new Date(statSync(file).mtime);
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  } catch { return today(); }
};

const bumpBucket = (map, key, tokens, usd) => {
  const b = map.get(key) || { tokens: 0, usd: 0 };
  b.tokens += tokens;
  b.usd += usd;
  map.set(key, b);
};

/**
 * Persist the ledger as a `memory` note. Delegates creation to `save` (so naming,
 * destination, dedup and frontmatter stay canonical — the same pattern digest/template
 * use), then rewrites only the body with the REAL ledger markdown via formatNote, so
 * the saved note carries the actual aggregate instead of save's generic placeholder.
 */
function persist(ctx, { since, totalTokens, totalUsd, files, body, fmtTok, fmtUsd }) {
  const { ROOT, PROJECT, opt } = ctx;
  // HH:MM in the title so two `--save` runs on the same day get distinct slugs
  // (save dedups with a `-2` suffix, but distinct titles keep the history readable).
  const now = new Date();
  const stamp = `${now.getHours()}`.padStart(2, '0') + ':' + `${now.getMinutes()}`.padStart(2, '0');
  const title = `Usage ledger ${today()} ${stamp}${since ? ` since ${since}` : ''}`;
  const summary = `Usage agregado: ${fmtTok(totalTokens)} tokens · ${fmtUsd(totalUsd)} em ${files.length} transcript(s)`
    + `${since ? ` desde ${since}` : ''}.`;

  const saved = save.run({
    ROOT,
    PROJECT,
    pos: ['memory', title],
    opt: { agent: opt.agent || 'usage', summary, tags: 'usage,cost,ledger', task: opt.task },
  });
  if (!saved.ok || !saved.data || !saved.data.file) return saved.data || null;

  // Rewrite only the body with the real ledger, preserving save's frontmatter.
  const file = join(ROOT, saved.data.file);
  const note = readNote(file, ROOT);
  writeFileSync(file, formatNote(note.fm, body.join('\n')), 'utf8');
  return { file: saved.data.file, type: 'memory', created: true };
}

export default {
  name: 'usage',
  summary: 'Historical cost/token ledger over session transcripts, by day and project',
  usage: 'usage [--dir <path>] [--since YYYY-MM-DD] [--limit n] [--save] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const dir = typeof opt.dir === 'string' ? opt.dir : defaultDir();
    const since = typeof opt.since === 'string' ? opt.since : null;
    const limit = Number.isFinite(Number(opt.limit)) && opt.limit !== true
      ? Math.max(0, parseInt(opt.limit, 10)) : null;

    const files = collectTranscripts(dir);
    const byDayMap = new Map();
    const byProjectMap = new Map();
    let totalTokens = 0;
    let totalUsd = 0;

    for (const file of files) {
      const mDay = fileMtimeDay(file);
      const project = projectOf(dir, file);
      let text;
      try { text = readFileSync(file, 'utf8'); } catch { continue; }
      for (const raw of text.split('\n')) {
        const ln = raw.trim();
        if (!ln) continue;
        let obj;
        try { obj = JSON.parse(ln); } catch { continue; }
        const msg = obj.message || obj;
        const role = msg.role || obj.role;
        const u = msg.usage || obj.usage;
        if (role !== 'assistant' || !u) continue;

        const day = dayOf(obj, mDay);
        if (since && day < since) continue;

        const tokens = tokensOf(u);
        const usd = costOf(obj, u);
        totalTokens += tokens;
        totalUsd += usd;
        bumpBucket(byDayMap, day, tokens, usd);
        bumpBucket(byProjectMap, project, tokens, usd);
      }
    }

    // byDay: chronological; byProject: heaviest first. `--limit` caps each list.
    let byDay = [...byDayMap.entries()]
      .map(([date, b]) => ({ date, tokens: b.tokens, usd: b.usd }))
      .sort((a, b) => a.date.localeCompare(b.date));
    let byProject = [...byProjectMap.entries()]
      .map(([project, b]) => ({ project, tokens: b.tokens, usd: b.usd }))
      .sort((a, b) => b.tokens - a.tokens || a.project.localeCompare(b.project));
    if (limit != null) {
      byDay = byDay.slice(-limit);
      byProject = byProject.slice(0, limit);
    }

    const data = {
      totalUsd, totalTokens, byDay, byProject,
    };

    const fmtUsd = (n) => `$${n.toFixed(n < 1 ? 4 : 2)}`;
    const fmtTok = (n) => n.toLocaleString('en-US');

    // The ledger body (no H1) is shared by the terminal output and the saved note,
    // so `--save` persists the SAME real aggregate the user sees — not a placeholder.
    const body = [];
    if (!files.length) {
      body.push(existsSync(dir)
        ? `no .jsonl transcripts under ${dir}`
        : `transcripts dir not found: ${dir}`);
      body.push('total: 0 tokens · $0.0000');
    } else if (!totalTokens && !byDay.length) {
      body.push('no assistant usage in the scanned transcripts.');
      body.push('total: 0 tokens · $0.0000');
    } else {
      // `total` stays the FULL aggregate (totalTokens/totalUsd in --json are unfiltered).
      // Under --limit the listed buckets are a truncated view (recent days / heaviest
      // projects), so we label the total "geral" to make clear it isn't the sum of the
      // rows shown — the rows are a window, the total is the whole.
      const totalLabel = limit != null ? 'total geral' : 'total';
      body.push(`${totalLabel}: ${fmtTok(totalTokens)} tokens · ${fmtUsd(totalUsd)}`, '');
      body.push(limit != null ? `by day (last ${limit}):` : 'by day:');
      for (const d of byDay) body.push(`    ${d.date}: ${fmtTok(d.tokens)} tokens · ${fmtUsd(d.usd)}`);
      body.push('', limit != null ? `by project (top ${limit}):` : 'by project:');
      for (const p of byProject) body.push(`    ${p.project}: ${fmtTok(p.tokens)} tokens · ${fmtUsd(p.usd)}`);
    }

    const header = `# usage — ${files.length} transcript(s)${since ? ` since ${since}` : ''}`;
    const lines = [header, ...body];

    if (opt.save === true) {
      data.saved = persist(ctx, { since, totalTokens, totalUsd, files, body, fmtTok, fmtUsd });
      if (data.saved && data.saved.file) lines.push('', `saved: ${data.saved.file}`);
    }

    return { ok: true, lines, data };
  },
};
