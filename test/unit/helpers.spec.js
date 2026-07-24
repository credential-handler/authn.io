/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 */
import assert from 'node:assert/strict';
import {getWindowHeightAdjustment} from '../../web/mediator/helpers.js';
import {test} from 'node:test';

/* Unit tests for the pure core of the popup self-sizing fix. The mediator
opens the allow-wallet popup at a fixed height, but the browser subtracts its
own chrome by an unpredictable amount and the greeting reflows with the
wallet's name and origin, so the popup measures itself once loaded and
corrects. `getWindowHeightAdjustment` is that decision, isolated from the DOM:
given what the content needs and what the window has, how much should the
window grow or shrink?

Run with: node --test test/unit/ */

// a typical popup: 290px requested, ~60px of browser chrome
const TYPICAL = {
  viewportHeight: 230,
  outerHeight: 290,
  availableHeight: 1000
};

test('grows the window when content overflows', () => {
  // the shipped bug: 263px of content in a 230px viewport
  const adjustment = getWindowHeightAdjustment({
    ...TYPICAL, contentHeight: 263
  });
  assert.equal(adjustment, 33);
});

test('shrinks the window when it is taller than the content', () => {
  const adjustment = getWindowHeightAdjustment({
    ...TYPICAL, contentHeight: 180
  });
  assert.equal(adjustment, -50);
});

test('does nothing when the content already fits exactly', () => {
  const adjustment = getWindowHeightAdjustment({
    ...TYPICAL, contentHeight: 230
  });
  assert.equal(adjustment, 0);
});

test('ignores sub-pixel differences', () => {
  // fractional layout metrics must not trigger a pointless resize
  for(const contentHeight of [230.4, 229.6, 231, 229]) {
    assert.equal(getWindowHeightAdjustment({...TYPICAL, contentHeight}), 0,
      `contentHeight ${contentHeight} should not resize`);
  }
});

test('never grows the viewport beyond the available screen height', () => {
  /* 60px of chrome on a 700px screen leaves a 640px viewport, so a window
  with a 230px viewport can grow by at most 410 -- but the per-call cap of
  400 binds first. */
  const adjustment = getWindowHeightAdjustment({
    viewportHeight: 230,
    outerHeight: 290,
    availableHeight: 700,
    contentHeight: 5000
  });
  assert.equal(adjustment, 400);
});

test('respects the screen limit when it is tighter than the cap', () => {
  // 40px chrome on a 400px screen => max viewport 360, so at most +130
  const adjustment = getWindowHeightAdjustment({
    viewportHeight: 230,
    outerHeight: 270,
    availableHeight: 400,
    contentHeight: 5000
  });
  assert.equal(adjustment, 130);
});

test('never shrinks below the minimum usable height', () => {
  // content claims almost nothing; the window must stay >= 160px
  const adjustment = getWindowHeightAdjustment({
    ...TYPICAL, contentHeight: 10
  });
  assert.equal(adjustment, -70);
  assert.equal(TYPICAL.viewportHeight + adjustment, 160);
});

test('bounds a single correction to the maximum adjustment', () => {
  const adjustment = getWindowHeightAdjustment({
    viewportHeight: 800,
    outerHeight: 860,
    availableHeight: 4000,
    contentHeight: 8000
  });
  assert.equal(adjustment, 400);
});

test('returns 0 when measurements are missing or unusable', () => {
  const cases = [
    undefined,
    {},
    {contentHeight: 300, viewportHeight: 0, outerHeight: 290},
    {contentHeight: 0, viewportHeight: 230, outerHeight: 290},
    {contentHeight: 300, viewportHeight: 230, outerHeight: 0}
  ];
  for(const input of cases) {
    assert.equal(getWindowHeightAdjustment(input), 0,
      `expected 0 for ${JSON.stringify(input)}`);
  }
});

test('tolerates a missing screen height', () => {
  // `availableHeight` unknown: still grows, bounded by the per-call cap
  const adjustment = getWindowHeightAdjustment({
    contentHeight: 263, viewportHeight: 230, outerHeight: 290
  });
  assert.equal(adjustment, 33);
});

test('handles a window reporting no chrome', () => {
  // `outerHeight === innerHeight` (some embedded/headless contexts)
  const adjustment = getWindowHeightAdjustment({
    contentHeight: 300,
    viewportHeight: 230,
    outerHeight: 230,
    availableHeight: 1000
  });
  assert.equal(adjustment, 70);
});
