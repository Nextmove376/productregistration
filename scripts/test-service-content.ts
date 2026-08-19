/**
 * Regression tests for the service-content merge rule.
 *
 * `resolveServiceContent()` decides what a live service page renders. It is worth
 * pinning down because the failure mode is severe and silent: if "empty admin
 * value" ever started winning over built-in content, all six hand-authored
 * service pages would render blank sections at once, and nothing in the type
 * system would object. Every one of those pages ships with a `services` row whose
 * `body` is NULL, so that is the *default* state, not an edge case.
 *
 *   npx tsx --test scripts/test-service-content.ts
 *
 * Pure functions only, so no database and no fixtures beyond the objects below.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_SERVICE_BODY,
  parseServiceBody,
  resolveServiceContent,
  serviceBodySchema,
  type ResolvableServiceData,
} from '../lib/service-content';

/** Stands in for one of the six hand-authored pages. */
const BUILT_IN: ResolvableServiceData = {
  tag: 'Regulatory',
  subtitle: 'Built-in subtitle',
  heroDescription: 'Built-in hero description',
  trustBadge: 'Built-in badge',
  overview: 'Built-in overview',
  whatIs: 'Built-in what is',
  whyImportant: 'Built-in why important',
  whoShouldUse: 'Built-in who should use',
  process: [
    { step: 1, title: 'Built-in step one', description: 'desc one', timeline: '1 day' },
    { step: 2, title: 'Built-in step two', description: 'desc two', timeline: '2 days' },
  ],
  included: ['Built-in included A', 'Built-in included B'],
  documents: [{ text: 'Built-in trade licence', required: true }],
  pricing: [{ service: 'Built-in service', timeline: '5 days', price: 'From AED 4,500' }],
  differentiators: [{ icon: 'Award', title: 'Built-in differentiator', description: 'desc' }],
  caseStudy: {
    title: 'Built-in case study',
    problem: 'problem',
    solution: 'solution',
    result: 'result',
  },
  faq: [{ question: 'Built-in question?', answer: 'Built-in answer.' }],
  relatedServices: [
    { slug: 'built-in-slug', title: 'Built-in related', summary: 'summary', tag: 'tag' },
  ],
};

/** A body as the admin would save it, with only the named keys filled in. */
const bodyWith = (partial: Record<string, unknown>) => serviceBodySchema.parse(partial);

/* ------------------------------------------------------------------ *
 * The invariant that protects the live site
 * ------------------------------------------------------------------ */

test('an empty body changes nothing at all', () => {
  const merged = resolveServiceContent(BUILT_IN, EMPTY_SERVICE_BODY);

  // Deep-equal rather than field-by-field: this must catch a *newly added* key
  // that forgets its fallback, which per-field assertions would silently miss.
  assert.deepEqual(merged, BUILT_IN);
});

test('a NULL body column changes nothing at all', () => {
  // The real starting state of all six live pages.
  assert.deepEqual(resolveServiceContent(BUILT_IN, parseServiceBody(null)), BUILT_IN);
});

test('a body of explicitly-blank strings and empty lists changes nothing', () => {
  const blank = bodyWith({
    tag: '',
    subtitle: '',
    heroDescription: '',
    trustBadge: '',
    prose: { overview: '', whatIs: '', whyImportant: '', whoShouldUse: '' },
    sections: [],
    process: [],
    documents: [],
    pricing: [],
    differentiators: [],
    relatedServices: [],
    faq: [],
    caseStudy: { title: '' },
  });

  assert.deepEqual(resolveServiceContent(BUILT_IN, blank), BUILT_IN);
});

test('a malformed body degrades to built-in content instead of throwing', () => {
  const merged = resolveServiceContent(BUILT_IN, parseServiceBody('{not json'));
  assert.deepEqual(merged, BUILT_IN);
});

/* ------------------------------------------------------------------ *
 * Admin content winning when it is actually filled in
 * ------------------------------------------------------------------ */

test('a filled-in text field overrides the built-in one', () => {
  const merged = resolveServiceContent(BUILT_IN, bodyWith({ subtitle: 'Edited subtitle' }));

  assert.equal(merged.subtitle, 'Edited subtitle');
  // Untouched neighbours must not be collateral damage.
  assert.equal(merged.tag, 'Regulatory');
  assert.equal(merged.heroDescription, 'Built-in hero description');
});

test('prose fields map onto the page\'s own long-form keys', () => {
  const merged = resolveServiceContent(
    BUILT_IN,
    bodyWith({ prose: { whatIs: 'Edited what is', whoShouldUse: 'Edited who' } })
  );

  assert.equal(merged.whatIs, 'Edited what is');
  assert.equal(merged.whoShouldUse, 'Edited who');
  assert.equal(merged.whyImportant, 'Built-in why important');
  assert.equal(merged.overview, 'Built-in overview');
});

test('"What\'s included" is fed by body.sections', () => {
  // This is the bug the audit found: `sections` was saved by the admin and then
  // never rendered on any of the six live pages.
  const merged = resolveServiceContent(BUILT_IN, bodyWith({ sections: ['Edited A', 'Edited B'] }));
  assert.deepEqual(merged.included, ['Edited A', 'Edited B']);
});

test('the FAQ is fed by body.faq, translated from {q,a} to {question,answer}', () => {
  // Also previously saved-but-never-rendered. The key names differ on purpose:
  // {q,a} predates this content model and rows in the wild still use it.
  const merged = resolveServiceContent(
    BUILT_IN,
    bodyWith({ faq: [{ q: 'Edited question?', a: 'Edited answer.' }] })
  );

  assert.deepEqual(merged.faq, [{ question: 'Edited question?', answer: 'Edited answer.' }]);
});

test('process step numbers are derived from order, not stored', () => {
  const merged = resolveServiceContent(
    BUILT_IN,
    bodyWith({
      process: [
        { title: 'First', description: 'a', timeline: '1d' },
        { title: 'Second', description: 'b', timeline: '2d' },
        { title: 'Third', description: 'c', timeline: '3d' },
      ],
    })
  );

  assert.deepEqual(
    merged.process.map((s) => [s.step, s.title]),
    [
      [1, 'First'],
      [2, 'Second'],
      [3, 'Third'],
    ]
  );
});

test('reordering process steps renumbers them', () => {
  const merged = resolveServiceContent(
    BUILT_IN,
    bodyWith({
      process: [
        { title: 'Was second', description: 'b', timeline: '2d' },
        { title: 'Was first', description: 'a', timeline: '1d' },
      ],
    })
  );

  assert.equal(merged.process[0].step, 1);
  assert.equal(merged.process[0].title, 'Was second');
  assert.equal(merged.process[1].step, 2);
});

test('each list section can be overridden independently', () => {
  const merged = resolveServiceContent(
    BUILT_IN,
    bodyWith({
      documents: [{ text: 'Edited doc', required: false }],
      pricing: [{ service: 'Edited svc', timeline: '9d', price: 'AED 1' }],
    })
  );

  assert.deepEqual(merged.documents, [{ text: 'Edited doc', required: false }]);
  assert.equal(merged.pricing[0].service, 'Edited svc');
  // Lists the editor did not touch stay built-in.
  assert.equal(merged.differentiators[0].title, 'Built-in differentiator');
  assert.equal(merged.relatedServices[0].title, 'Built-in related');
});

/* ------------------------------------------------------------------ *
 * The fiddly ones
 * ------------------------------------------------------------------ */

test('the case study is replaced only when it has a title', () => {
  // A case study with a body but no title is a half-filled repeater row, not an
  // intent to replace the built-in one.
  const titleless = resolveServiceContent(
    BUILT_IN,
    bodyWith({ caseStudy: { problem: 'orphaned problem text' } })
  );
  assert.equal(titleless.caseStudy?.title, 'Built-in case study');

  const titled = resolveServiceContent(
    BUILT_IN,
    bodyWith({ caseStudy: { title: 'Edited case study', problem: 'p' } })
  );
  assert.equal(titled.caseStudy?.title, 'Edited case study');
});

test('a blank trust badge is omitted rather than rendered empty', () => {
  const withoutBuiltIn: ResolvableServiceData = { ...BUILT_IN, trustBadge: undefined };
  const merged = resolveServiceContent(withoutBuiltIn, EMPTY_SERVICE_BODY);

  // Not `''` — the page tests truthiness to decide whether to render the pill.
  assert.equal(merged.trustBadge, undefined);
});

test('a filled trust badge survives the undefined round-trip', () => {
  const merged = resolveServiceContent(
    { ...BUILT_IN, trustBadge: undefined },
    bodyWith({ trustBadge: 'Edited badge' })
  );
  assert.equal(merged.trustBadge, 'Edited badge');
});

test('whitespace-only input counts as empty, not as an override', () => {
  // The schema trims, so "   " reaches the merge as '' and must not blank the page.
  const merged = resolveServiceContent(BUILT_IN, bodyWith({ subtitle: '   ' }));
  assert.equal(merged.subtitle, 'Built-in subtitle');
});

test('half-filled repeater rows are dropped before they reach the page', () => {
  const body = bodyWith({
    process: [{ title: '', description: 'orphaned description', timeline: '' }],
    documents: [{ text: '' }],
  });

  // Dropped by the schema transform, so the section falls back rather than
  // rendering a numbered step with no title.
  assert.deepEqual(body.process, []);
  assert.deepEqual(body.documents, []);

  const merged = resolveServiceContent(BUILT_IN, body);
  assert.equal(merged.process[0].title, 'Built-in step one');
  assert.equal(merged.documents[0].text, 'Built-in trade licence');
});

test('the merge does not mutate either input', () => {
  const body = bodyWith({ subtitle: 'Edited subtitle', sections: ['Edited'] });
  const builtInSnapshot = structuredClone(BUILT_IN);
  const bodySnapshot = structuredClone(body);

  resolveServiceContent(BUILT_IN, body);

  assert.deepEqual(BUILT_IN, builtInSnapshot);
  assert.deepEqual(body, bodySnapshot);
});

/* ------------------------------------------------------------------ *
 * Schema guarantees the editor and renderer both rely on
 * ------------------------------------------------------------------ */

test('an "Our Services" item always carries an alt field', () => {
  // The renderer does `alt={item.alt || item.title}`; if the schema stopped
  // defaulting this, older rows would produce `undefined` in the DOM.
  const body = bodyWith({ ourServices: { items: [{ title: 'A card' }] } });

  assert.equal(body.ourServices.items[0].alt, '');
  assert.equal(body.ourServices.items[0].title, 'A card');
});

test('oversized content is rejected rather than silently truncated', () => {
  const result = serviceBodySchema.safeParse({ subtitle: 'x'.repeat(401) });
  assert.equal(result.success, false);
});

test('over-cap lists are rejected rather than silently trimmed', () => {
  const tooMany = Array.from({ length: 21 }, (_, i) => ({
    title: `Step ${i}`,
    description: '',
    timeline: '',
  }));
  assert.equal(serviceBodySchema.safeParse({ process: tooMany }).success, false);
});
