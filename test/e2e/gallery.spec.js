/*!
 * New BSD License (3-clause)
 * Copyright (c) 2026, Digital Bazaar, Inc.
 */
import {expect, test} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';

/* Generates a labelled, human-viewable gallery of the first party wallet
chooser dialog across wallet counts, the cross-device QR section, themes, and
viewports — the screenshots we otherwise capture by hand for review. Output
goes to `test/e2e/gallery/<engine>/<theme>/<state>.png` plus an `index.html`
contact sheet. This is NOT a regression gate (see `wallet-chooser.spec.js` for
that); run it with `npm run gallery`. */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALLERY_DIR = path.join(__dirname, 'gallery');

const STATES = [
  {name: 'hints-0-qr', query: 'hints=0&qr=1', label: '0 wallets + QR'},
  {name: 'hints-1-qr', query: 'hints=1&qr=1', label: '1 wallet + QR'},
  {name: 'hints-5-qr', query: 'hints=5&qr=1', label: '5 wallets + QR'},
  {name: 'hints-5-noqr', query: 'hints=5&qr=0', label: '5 wallets, no QR'},
  {name: 'hints-15-qr', query: 'hints=15&qr=1', label: '15 wallets + QR'}
];
const THEMES = ['light', 'dark'];

test.describe('gallery', () => {
  for(const theme of THEMES) {
    test.describe(theme, () => {
      test.use({colorScheme: theme});

      for(const state of STATES) {
        test(`${state.label}`, async ({page}, testInfo) => {
          const engine = testInfo.project.name;
          await page.goto(`/test/wallet-chooser?${state.query}`);
          await page.locator('.wrm-modal-1p .wrm-modal-content').waitFor();

          const dir = path.join(GALLERY_DIR, engine, theme);
          await fs.mkdir(dir, {recursive: true});

          // collapsed (default) shot
          await page.screenshot({path: path.join(dir, `${state.name}.png`)});

          // for states with the expander, also capture it expanded
          const toggle = page.locator('.cross-device-toggle');
          if(await toggle.count() > 0) {
            await toggle.click();
            const qr = page.locator('img[alt*="QR"]');
            await expect(qr).toBeVisible();
            await page.screenshot(
              {path: path.join(dir, `${state.name}-expanded.png`)});

            // when the expanded QR sits below the fold (many wallets on a
            // short/phone viewport), also capture a shot scrolled to the
            // QR, so the gallery shows it is reachable
            const qrInView = await qr.evaluate(el => {
              const r = el.getBoundingClientRect();
              return r.bottom <= window.innerHeight && r.top >= 0;
            });
            if(!qrInView) {
              await qr.scrollIntoViewIfNeeded();
              await expect(qr).toBeInViewport();
              await page.screenshot(
                {path: path.join(dir, `${state.name}-expanded-scrolled.png`)});
            }
          }
        });
      }
    });
  }
});
