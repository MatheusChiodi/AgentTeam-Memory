import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  tokenize, estimateTokens, splitSentences, extractiveSummary,
  scoreByQuery, extractCheckboxes, budgetFill, STOPWORDS,
} from '../analyze.mjs';

test('tokenize: drops stopwords and short tokens, lowercases', () => {
  const t = tokenize('The quick brown FOX de um e a');
  assert.ok(t.includes('quick'));
  assert.ok(t.includes('brown'));
  assert.ok(t.includes('fox'));
  assert.ok(!t.includes('the')); // stopword
  assert.ok(!t.includes('de')); // PT stopword
  assert.ok(STOPWORDS.has('the'));
});

test('estimateTokens: deterministic, monotonic, zero for empty', () => {
  assert.equal(estimateTokens(''), 0);
  assert.equal(estimateTokens('   '), 0);
  const a = estimateTokens('hello world');
  assert.equal(a, estimateTokens('hello world')); // deterministic
  // monotonic: appending text never lowers the estimate
  assert.ok(estimateTokens('hello world more text here') >= a);
  assert.ok(estimateTokens('x'.repeat(400)) >= estimateTokens('x'.repeat(40)));
});

test('splitSentences: splits on . ! ? and trims', () => {
  const s = splitSentences('First idea. Second one! Third? ');
  assert.deepEqual(s, ['First idea.', 'Second one!', 'Third?']);
  assert.deepEqual(splitSentences(''), []);
});

test('extractiveSummary: returns top-N sentences in original order', () => {
  const text = 'The cache layer stores tokens. Unrelated filler about weather today. '
    + 'The cache layer also evicts old tokens to save memory.';
  const sum = extractiveSummary(text, 2, 'cache tokens');
  assert.ok(sum.includes('cache'));
  // length capped at requested sentence count (joined by spaces)
  assert.ok(splitSentences(sum).length <= 2);
  // empty body → empty string (caller falls back to frontmatter summary)
  assert.equal(extractiveSummary('', 3), '');
});

test('scoreByQuery: tags weigh more than summary, empty query scores 0', () => {
  const tagged = { tags: ['cache'], fm: { summary: 'x' }, name: 'n', body: '' };
  const summd = { tags: [], fm: { summary: 'cache layer' }, name: 'n', body: '' };
  const none = { tags: [], fm: { summary: 'weather' }, name: 'n', body: '' };
  assert.ok(scoreByQuery(tagged, 'cache') > scoreByQuery(summd, 'cache'));
  assert.ok(scoreByQuery(summd, 'cache') > 0);
  assert.equal(scoreByQuery(none, 'cache'), 0);
  assert.equal(scoreByQuery(tagged, ''), 0); // empty query
});

test('extractCheckboxes: parses open/done items and ignores prose', () => {
  const body = '## Plan\n- [ ] write code\n- [x] read spec\n* [X] ship it\nplain line\n- not a box';
  const items = extractCheckboxes(body);
  assert.equal(items.length, 3);
  assert.deepEqual(items.map((i) => i.checked), [false, true, true]);
  assert.equal(items[0].text, 'write code');
  assert.deepEqual(extractCheckboxes(''), []);
});

test('budgetFill: never exceeds budget and stops at the first non-fitting item', () => {
  const items = ['a', 'bb', 'ccc', 'd'];
  const cost = (s) => s.length; // a=1, bb=2, ccc=3, d=1
  const r = budgetFill(items, cost, 3); // a(1)+bb(2)=3 fits; ccc(3) would make 6 → stop
  assert.equal(r.used, 3);
  assert.ok(r.used <= 3);
  assert.deepEqual(r.included.map((x) => x.item), ['a', 'bb']);
  assert.deepEqual(r.dropped, ['ccc', 'd']); // the rest are dropped whole
});

test('budgetFill: an oversized first item yields empty include, all dropped', () => {
  const r = budgetFill(['huge'], () => 1000, 10);
  assert.deepEqual(r.included, []);
  assert.deepEqual(r.dropped, ['huge']);
  assert.equal(r.used, 0);
});
