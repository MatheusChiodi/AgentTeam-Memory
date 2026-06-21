// analyze.mjs — pure text-analysis helpers shared by the Fase 3 token/knowledge tools.
// No LLM, no console, no I/O: deterministic heuristics that run locally. This is the
// technical meaning of "more agent output, same tokens" — the heavy lifting (ranking,
// summarizing, counting, budgeting) happens here, not in the model. Zero deps. ESM.

// PT+EN stopwords (the relate/F20 list, centralized so every tool shares one vocabulary).
export const STOPWORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it',
  'of', 'on', 'or', 'the', 'to', 'with', 'que', 'de', 'da', 'do', 'em', 'um',
  'uma', 'os', 'as', 'no', 'na', 'e', 'o', 'para', 'com', 'por', 'não', 'mais',
  'se', 'são', 'foi', 'ser', 'esse', 'essa', 'isso', 'este', 'esta', 'dos', 'das',
  'um', 'ao', 'à', 'já', 'sem', 'sobre', 'entre', 'mas', 'ou', 'the', 'this', 'that',
  'are', 'was', 'were', 'will', 'can', 'has', 'have', 'not', 'but', 'you', 'your',
]);

/** Lowercased word set/list: drops stopwords and tokens shorter than 3 chars. */
export function tokenize(text) {
  const out = [];
  for (const w of String(text || '').toLowerCase().split(/[^a-z0-9áàâãéêíóôõúüç]+/i)) {
    if (w.length >= 3 && !STOPWORDS.has(w)) out.push(w);
  }
  return out;
}

/**
 * Deterministic, monotonic token estimate. `max(words, round(chars/4))`: appending text
 * never decreases either term, so longer text ⇒ tokens ≥ (the invariant brief/focus rely on
 * for stable budget fills). Empty → 0.
 */
export function estimateTokens(text) {
  const s = String(text || '');
  if (!s.trim()) return 0;
  const chars = s.length;
  const words = (s.match(/\S+/g) || []).length;
  return Math.max(words, Math.round(chars / 4));
}

/** Split into trimmed sentences on . ! ? or newlines. */
export function splitSentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * Extractive summary: the top-N sentences by term-frequency weight (length-normalized),
 * with a lead-sentence bonus and a bonus for sentences sharing terms with `hints` (the title).
 * Returned in original order. No body → '' (callers fall back to the frontmatter summary).
 */
export function extractiveSummary(text, n = 3, hints = '') {
  const sentences = splitSentences(text);
  if (!sentences.length) return '';
  const freq = new Map();
  for (const w of tokenize(text)) freq.set(w, (freq.get(w) || 0) + 1);
  const hintTerms = new Set(tokenize(hints));
  const scored = sentences.map((s, i) => {
    const words = tokenize(s);
    let score = words.reduce((a, w) => a + (freq.get(w) || 0), 0);
    if (words.length) score /= Math.sqrt(words.length);
    if (i === 0) score += 1;
    for (const w of words) if (hintTerms.has(w)) score += 2;
    return { i, s, score };
  });
  const top = [...scored].sort((a, b) => b.score - a.score || a.i - b.i).slice(0, Math.max(1, n));
  top.sort((a, b) => a.i - b.i);
  return top.map((t) => t.s).join(' ');
}

/**
 * Relevance of a note to a free-text query. Reuses the relate/F20 weighting, generalized:
 * shared tags (3) > summary terms (2) > title terms (2) > body terms (1). Empty query → 0.
 */
export function scoreByQuery(note, query) {
  const qTerms = new Set(tokenize(query));
  if (!qTerms.size) return 0;
  let score = 0;
  for (const t of (note.tags || [])) if (qTerms.has(String(t).toLowerCase())) score += 3;
  const sumTerms = new Set(tokenize(note.fm?.summary || ''));
  for (const w of qTerms) if (sumTerms.has(w)) score += 2;
  const titleTerms = new Set(tokenize(note.name || ''));
  for (const w of qTerms) if (titleTerms.has(w)) score += 2;
  const bodyTerms = new Set(tokenize(note.body || ''));
  for (const w of qTerms) if (bodyTerms.has(w)) score += 1;
  return score;
}

/**
 * Extract markdown task items from a note body. Matches `- [ ]`, `- [x]`, `* [X]`.
 * One extractor shared by todo/handoff/progress — three divergent regexes would drift.
 */
export function extractCheckboxes(body) {
  const out = [];
  String(body || '').split(/\r?\n/).forEach((line, idx) => {
    const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*\S)\s*$/.exec(line);
    if (m) out.push({ text: m[2].trim(), checked: m[1].toLowerCase() === 'x', line: idx });
  });
  return out;
}

/**
 * Greedy token-budget fill. Walks items in order, including each while it fits; STOPS at the
 * first item that would exceed `budget` and drops it (and the rest) whole — never truncates a
 * note mid-way, never exceeds the budget. Returns { included:[{item,tokens}], dropped, used }.
 */
export function budgetFill(items, getTokens, budget) {
  const included = [];
  const dropped = [];
  let used = 0;
  const list = items || [];
  for (let i = 0; i < list.length; i++) {
    const t = Math.max(0, getTokens(list[i]) || 0);
    if (used + t <= budget) {
      included.push({ item: list[i], tokens: t });
      used += t;
    } else {
      dropped.push(...list.slice(i));
      break;
    }
  }
  return { included, dropped, used };
}
