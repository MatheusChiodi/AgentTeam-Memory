// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// render.mjs — pure presentation primitives shared by the Fase 3 visual tools.
// No console, no process.exit, no filesystem: every function is pure and unit-testable
// in isolation (mirrors lib.mjs/notes.mjs). Colors degrade to plain text under
// NO_COLOR / TERM=dumb, exactly like statusline.mjs. Zero external dependencies. ESM.

// ── ANSI colors ──────────────────────────────────────────────────────────────────
export const useColor = () => !process.env.NO_COLOR && process.env.TERM !== 'dumb';
export const c = (code, s) => (useColor() ? `\x1b[${code}m${s}\x1b[0m` : String(s));
export const dim = (s) => c('2', s);
export const bold = (s) => c('1', s);
export const green = (s) => c('32', s);
export const yellow = (s) => c('33', s);
export const red = (s) => c('31', s);
export const cyan = (s) => c('36', s);
export const gray = (s) => c('90', s);

// Visible length: ANSI escape sequences do not occupy columns, so strip them before
// measuring. Box/tree alignment depends on this — counting colored bytes misaligns borders.
const ANSI_RE = /\x1b\[[0-9;]*m/g;
export const visibleLen = (s) => String(s).replace(ANSI_RE, '').length;

// Severity painter shared with dashboards/progress (same thresholds spirit as statusline).
export const paintPct = (s, pct, warn = 70, danger = 90) =>
  (pct >= danger ? red(s) : pct >= warn ? yellow(s) : green(s));

// ── Bar / sparkline ────────────────────────────────────────────────────────────────
export function bar(pct, width = 10) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const filled = Math.round((p / 100) * width);
  return `[${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}]`;
}

const SPARK = '▁▂▃▄▅▆▇█';
/** Series of numbers → unicode sparkline normalized to the max. Empty max → flat ▁. */
export function sparkline(values) {
  const nums = (values || []).map((v) => Number(v) || 0);
  if (!nums.length) return '';
  const max = Math.max(...nums);
  if (max <= 0) return SPARK[0].repeat(nums.length);
  return nums.map((v) => SPARK[Math.max(0, Math.min(7, Math.round((v / max) * 7)))]).join('');
}

// ── Heatmap intensity (quartile-based, deterministic) ────────────────────────────────
const HEAT = [' ', '·', '▪', '▩', '█'];
export const heatGlyph = (level) => HEAT[Math.max(0, Math.min(HEAT.length - 1, level | 0))];

/**
 * Map each count to an intensity level 0..n. Level 0 = zero; positive counts are bucketed
 * by quantiles of the *non-zero* values (not fixed thresholds), so the scale adapts to the
 * period. All-zero → all level 0; all-equal-positive → all level 1.
 */
export function heatLevels(counts, n = 4) {
  const arr = (counts || []).map((x) => Number(x) || 0);
  const pos = arr.filter((x) => x > 0).sort((a, b) => a - b);
  if (!pos.length) return arr.map(() => 0);
  const q = (p) => pos[Math.min(pos.length - 1, Math.floor(p * (pos.length - 1) + 1e-9))];
  const th = [];
  for (let k = 1; k < n; k++) th.push(q(k / n));
  return arr.map((x) => {
    if (x <= 0) return 0;
    let lvl = 1;
    for (const t of th) if (x > t) lvl++;
    return Math.min(lvl, n);
  });
}

// ── Box ──────────────────────────────────────────────────────────────────────────
/** Render a bordered box. Returns an array of lines. Title (optional) gets a divider. */
export function box(title, lines = []) {
  const body = lines.map((l) => (l == null ? '' : String(l)));
  const w = Math.max(visibleLen(title || ''), ...body.map(visibleLen), 0);
  const pad = (l) => l + ' '.repeat(Math.max(0, w - visibleLen(l)));
  const out = [`┌─${'─'.repeat(w)}─┐`];
  if (title) {
    out.push(`│ ${pad(bold(title))} │`);
    out.push(`├─${'─'.repeat(w)}─┤`);
  }
  for (const l of body) out.push(`│ ${pad(l)} │`);
  out.push(`└─${'─'.repeat(w)}─┘`);
  return out;
}

// ── Tree ───────────────────────────────────────────────────────────────────────────
/** Nested nodes ({ label, children? }) → lines with ├─/└─/│ connectors. */
export function treeLines(nodes, prefix = '') {
  const out = [];
  const list = nodes || [];
  list.forEach((node, i) => {
    const last = i === list.length - 1;
    out.push(`${prefix}${last ? '└─' : '├─'} ${node.label}`);
    if (node.children && node.children.length) {
      out.push(...treeLines(node.children, `${prefix}${last ? '   ' : '│  '}`));
    }
  });
  return out;
}

// ── Text ─────────────────────────────────────────────────────────────────────────
/** Truncate with an ellipsis, never exceeding n visible chars. */
export function truncate(s, n = 60) {
  const str = String(s ?? '');
  if (str.length <= n) return str;
  return `${str.slice(0, Math.max(0, n - 1)).trimEnd()}…`;
}

// ── Mermaid sanitization ─────────────────────────────────────────────────────────
// A label containing " [ ] { } ( ) | ` < > # ; or a newline silently breaks the Mermaid
// parser. We neutralize the whole class once, here, so diagram/mindmap can never emit
// a broken block regardless of note titles.
export function mermaidEscape(s) {
  return String(s ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/"/g, "'")
    .replace(/[[\]{}()|`<>#;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Stable, collision-resistant Mermaid node id (alnum/underscore only). */
export function mermaidId(s) {
  const str = String(s ?? '');
  const base = str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'n';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return `n_${base}_${h.toString(36)}`;
}
