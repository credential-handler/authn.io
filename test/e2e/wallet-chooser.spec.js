/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 */
import {expect, test} from '@playwright/test';

/* Geometric-invariant tests for the first party wallet chooser dialog,
exercised via the dev-only `/test/wallet-chooser` harness route. These assert
structural properties (no horizontal scroll, header pinned, panel fills the
popup) rather than pixels, so they catch the layout regressions seen in the
7.4.x series without screenshot-diff noise. */

// the states the dialog must handle, keyed for readable test titles
const STATES = [
  {name: '0 wallets + QR', query: 'hints=0&qr=1', hints: 0, qr: true},
  {name: '1 wallet + QR', query: 'hints=1&qr=1', hints: 1, qr: true},
  {name: '5 wallets + QR', query: 'hints=5&qr=1', hints: 5, qr: true},
  {name: '5 wallets, no QR', query: 'hints=5&qr=0', hints: 5, qr: false},
  {name: '15 wallets + QR', query: 'hints=15&qr=1', hints: 15, qr: true}
];

async function gotoChooser(page, query) {
  await page.goto(`/test/wallet-chooser?${query}`);
  // wait for the dialog content to render
  await page.locator('.wrm-modal-1p .wrm-modal-content').waitFor();
}

for(const state of STATES) {
  test.describe(state.name, () => {
    test.beforeEach(async ({page}) => gotoChooser(page, state.query));

    test('renders the expected number of wallet hints', async ({page}) => {
      await expect(page.locator('.wrm-hint-list .wrm-selectable'))
        .toHaveCount(state.hints);
    });

    test('shows no horizontal scrollbar', async ({page}) => {
      // the 7.4.1 regression produced a horizontal scrollbar on the 1p
      // content. Assert the document does not scroll horizontally.
      const scrolls = await page.evaluate(() =>
        document.documentElement.scrollWidth > window.innerWidth);
      expect(scrolls).toBe(false);
    });

    // Stricter than the scrollbar check: detects the horizontal OVERFLOW
    // condition itself (an element whose content is wider than its box),
    // not just the resulting scrollbar — so the `overflow-x: hidden`
    // band-aid in the 1p dialog CSS cannot make it a false pass.
    //
    // KNOWN FAILING: this fails today because the dialog still relies on
    // that band-aid to hide a real overflow (the headers and separators
    // bleed their border edge-to-edge with a negative side margin that
    // overhangs the border-box flex layout). It is left active, not
    // skipped, so it shows up as a red test when the suite is run locally
    // — a standing reminder of the deferred CSS work. The fix comes after
    // the components we use are pulled out of `vue-web-request-mediator`
    // and that dependency is removed; this test then turns green and
    // proves the band-aid can be removed. (CI does not run this suite
    // yet, so this failure does not gate anything.)
    test('has no horizontal overflow', async ({page}) => {
      const offenders = await page.evaluate(() => {
        const out = [];
        for(const el of document.querySelectorAll('.wrm-modal-1p *')) {
          // only inspect elements with a real content box. Inline
          // elements (e.g. <span>, <strong>) report `clientWidth: 0` but
          // a nonzero `scrollWidth`, which Firefox surfaces and Chromium
          // does not; that difference is not overflow, so skip them.
          const cs = getComputedStyle(el);
          if(cs.display === 'inline' || el.clientWidth === 0) {
            continue;
          }
          if(el.scrollWidth - el.clientWidth > 1) {
            out.push(`${el.className || el.tagName} ` +
              `(scrollW ${el.scrollWidth} > clientW ${el.clientWidth})`);
          }
        }
        return out;
      });
      expect(offenders, offenders.join('; ')).toEqual([]);
    });

    test('does not scroll the popup window', async ({page}) => {
      // only an inner region may scroll; the window itself must not (that
      // scrolled the header/Close button away and stacked scrollbars)
      const windowScrolls = await page.evaluate(() =>
        document.documentElement.scrollHeight > window.innerHeight + 1);
      expect(windowScrolls).toBe(false);
    });

    test('keeps the header pinned while the list scrolls', async ({page}) => {
      const header = page.locator('.wrm-modal-1p .wrm-modal-content-header')
        .first();
      const before = await header.boundingBox();
      // scroll the wallet list to its end, if it scrolls at all
      await page.evaluate(() => {
        const list = document.querySelector('.wrm-hint-list');
        if(list) {
          list.scrollTop = list.scrollHeight;
        }
      });
      const after = await header.boundingBox();
      expect(after.y).toBeCloseTo(before.y, 0);
    });

    test('panel fills the popup width (no background bleed)',
      async ({page}) => {
        // the content panel must span the full popup width; gaps showed the
        // page background as dark bands
        const fills = await page.evaluate(() => {
          const panel = document.querySelector(
            '.wrm-modal-1p .wrm-modal-content');
          return Math.abs(panel.getBoundingClientRect().width -
            window.innerWidth) <= 1;
        });
        expect(fills).toBe(true);
      });

    test('header border bleeds edge to edge', async ({page}) => {
      // the dialog header ("Choose a Wallet") is full-bleed by design: its
      // bottom border spans the popup edge to edge, distinguishing it from
      // an inset in-page separator. This guards that bleed directly, so a
      // future CSS rework cannot silently shrink the border to the padded
      // content width (a change the geometric-overflow checks would miss,
      // since shrinking it removes no overflow). The header is the panel's
      // direct-child header, not the empty separator div the body reuses
      // the class for.
      const flush = await page.evaluate(() => {
        const header = document.querySelector(
          '.wrm-modal-1p .wrm-modal-content > .wrm-modal-content-header');
        const panel = document.querySelector(
          '.wrm-modal-1p .wrm-modal-content');
        const h = header.getBoundingClientRect();
        const p = panel.getBoundingClientRect();
        return Math.abs(h.left - p.left) <= 1 &&
          Math.abs(h.right - p.right) <= 1;
      });
      expect(flush).toBe(true);
    });

    if(state.qr && state.hints > 0) {
      test('shows the cross-device expander, collapsed', async ({page}) => {
        await expect(page.locator('.cross-device-toggle')).toBeVisible();
        await expect(page.locator('img[alt*="QR"]')).toHaveCount(0);
      });

      test('expands the QR code when the prompt is clicked', async ({page}) => {
        await page.locator('.cross-device-toggle').click();
        await expect(page.locator('img[alt*="QR"]')).toBeVisible();
      });
    }

    if(state.qr && state.hints === 0) {
      test('shows the QR code immediately, no expander', async ({page}) => {
        await expect(page.locator('.cross-device-toggle')).toHaveCount(0);
        await expect(page.locator('img[alt*="QR"]')).toBeVisible();
      });
    }

    if(!state.qr) {
      test('shows no cross-device section', async ({page}) => {
        await expect(page.locator('.cross-device-toggle')).toHaveCount(0);
        await expect(page.locator('img[alt*="QR"]')).toHaveCount(0);
      });
    }
  });
}
