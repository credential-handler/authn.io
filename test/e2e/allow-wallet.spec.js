/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 */
import {expect, test} from '@playwright/test';

/* Geometric-invariant tests for the first party "Allow Wallet" permission
dialog, exercised via the dev-only `/test/wallet-chooser` harness route with
`type=permissionRequest`. The bug these guard: the popup height was a fixed
guess (230px + a Firefox-only 30px URL-bar allowance), so on any browser whose
popup chrome or content wrapping exceeded that guess, the wallet row and the
Block/Allow footer were clipped off the bottom of the window.

These assert the dialog fits — and that its interactive footer is reachable —
at the popup viewport heights the mediator actually requests, rather than
diffing pixels. */

/* Popup viewport heights to exercise. `DEFAULT_ALLOW_WALLET_POPUP_HEIGHT` is
290 (260 + a 30px chrome allowance), so the viewport the mediator actually
gets is 290 minus whatever chrome the browser adds. These bracket that range
down to the point where the content genuinely cannot fit and the popup relies
on `fitWindowToContent` growing it instead.

Playwright pins the viewport, so `resizeBy` is inert here by design: these
tests assert the CSS/content invariant at a given height. The resize logic
itself is unit-tested via `getWindowHeightAdjustment` (see
`test/unit/helpers.spec.js`). */
const HEIGHTS = [
  {name: 'requested height', height: 290},
  {name: 'chrome-reduced height', height: 260}
];

// A long origin/name exercises the text-wrapping cause of the clipping,
// independent of the popup-chrome cause.
const LONG_ORIGIN =
  'https://wallet-with-a-very-long-hostname.example-organization.test';

async function gotoAllowWallet(page, {origin} = {}) {
  const query = new URLSearchParams({
    hints: '1',
    type: 'permissionRequest',
    qr: '0'
  });
  if(origin) {
    query.set('origin', origin);
  }
  await page.goto(`/test/wallet-chooser?${query}`);
  await page.locator('.wrm-modal-1p .wrm-modal-content').waitFor();
}

for(const {name, height} of HEIGHTS) {
  test.describe(`allow-wallet dialog @ ${name} (${height}px)`, () => {
    test.use({viewport: {width: 500, height}});

    test.beforeEach(async ({page}) => gotoAllowWallet(page));

    test('shows the Block and Allow buttons', async ({page}) => {
      await expect(page.getByRole('button', {name: 'Block'})).toBeVisible();
      await expect(page.getByRole('button', {name: 'Allow'})).toBeVisible();
    });

    // The footer is pinned outside the scrolling body, so it stays in the
    // viewport at every height; this guards that pinning (a regression that
    // let it scroll away would be caught here), not the clipping bug.
    test('keeps the Block/Allow footer within the viewport',
      async ({page}) => {
        for(const label of ['Block', 'Allow']) {
          const box = await page.getByRole('button', {name: label})
            .boundingBox();
          expect(box, `${label} button has no box`).not.toBeNull();
          expect(box.y + box.height,
            `${label} button bottom (${box.y + box.height}) exceeds ` +
            `viewport height (${height})`).toBeLessThanOrEqual(height + 1);
        }
      });

    /* The real clipping condition. The 1p panel is sized to exactly fill the
    popup and its body region scrolls internally, so the *document* never
    overflows and the pinned footer is always inside the viewport — neither a
    document-level scroll check nor a footer-position check can detect this
    bug. What the user sees instead is the greeting's wallet row cut off
    mid-line inside that scrolling body. Assert the body does not need to
    scroll: the popup must be tall enough for the greeting to fit whole. */
    test('does not clip the greeting inside the scrolling body',
      async ({page}) => {
        const overflow = await page.evaluate(() => {
          const body =
            document.querySelector('.wrm-modal-content-header + div');
          return body ? body.scrollHeight - body.clientHeight : null;
        });
        expect(overflow, 'dialog body region not found').not.toBeNull();
        expect(overflow,
          `dialog body overflows its box by ${overflow}px, clipping the ` +
          'wallet row').toBeLessThanOrEqual(1);
      });

    // the greeting's origin card must be fully within the scrolling body's
    // visible box, not cut off at its bottom edge
    test('shows the whole origin card', async ({page}) => {
      const cut = await page.evaluate(() => {
        const body = document.querySelector('.wrm-modal-content-header + div');
        const card = [...document.querySelectorAll('.wrm-flex-row')]
          .find(el => !el.classList.contains('wrm-modal-content-header'));
        if(!body || !card) {
          return null;
        }
        return Math.round(card.getBoundingClientRect().bottom -
          body.getBoundingClientRect().bottom);
      });
      expect(cut, 'origin card or body not found').not.toBeNull();
      expect(cut, `origin card is cut off by ${cut}px`)
        .toBeLessThanOrEqual(1);
    });

    test('keeps the origin row on one line', async ({page}) => {
      // the origin/name must ellipsize rather than wrap; wrapping is what
      // pushed the footer out of the popup
      const wraps = await page.evaluate(() => {
        const el = document.querySelector('.wrm-ellipsis');
        if(!el) {
          return 'missing';
        }
        return el.scrollHeight > el.clientHeight + 1;
      });
      expect(wraps).toBe(false);
    });

    test('with a long origin, still fits', async ({page}) => {
      await gotoAllowWallet(page, {origin: LONG_ORIGIN});
      const box = await page.getByRole('button', {name: 'Allow'})
        .boundingBox();
      expect(box).not.toBeNull();
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    });
  });
}
