/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 * All rights reserved.
 */

// never grow or shrink a popup past this, so pathological content cannot
// produce a full-screen window and rounding cannot collapse one
const MAX_POPUP_HEIGHT_ADJUSTMENT = 400;
const MIN_POPUP_HEIGHT = 160;

/**
 * Computes the height adjustment a popup needs so its content fits exactly.
 *
 * This is the pure core of `fitWindowToContent`: the mediator opens popups at
 * a fixed height, but the browser subtracts its own chrome (URL bar, title
 * bar) by an amount that varies across browsers, platforms, and settings, and
 * the content itself reflows with the wallet name and origin length. Rather
 * than predicting either, the popup measures itself once loaded and corrects.
 *
 * @param {object} options - The options to use.
 * @param {number} options.contentHeight - Height the content needs (px).
 * @param {number} options.viewportHeight - Current usable viewport (px).
 * @param {number} options.outerHeight - Current total window height (px).
 * @param {number} options.availableHeight - Usable screen height (px).
 *
 * @returns {number} Pixels to grow (positive) or shrink (negative) by; `0`
 *   when the window already fits or cannot be usefully changed.
 */
export function getWindowHeightAdjustment({
  contentHeight, viewportHeight, outerHeight, availableHeight
} = {}) {
  // guard against a caller that cannot measure (e.g. a detached document)
  if(!(contentHeight > 0 && viewportHeight > 0 && outerHeight > 0)) {
    return 0;
  }

  // ignore sub-pixel noise from fractional layout metrics
  const deficit = Math.round(contentHeight - viewportHeight);
  if(Math.abs(deficit) <= 1) {
    return 0;
  }

  // the chrome is whatever the window has beyond its viewport; it stays
  // constant as the window resizes, so the largest viewport available is the
  // screen minus that chrome
  const chromeHeight = Math.max(0, outerHeight - viewportHeight);
  const maxViewport = Math.max(0, (availableHeight || 0) - chromeHeight);

  let adjustment = deficit;
  // never exceed the screen (a window taller than the display is worse than
  // a scrolling one -- its footer would be unreachable)
  if(maxViewport > 0) {
    adjustment = Math.min(adjustment, maxViewport - viewportHeight);
  }
  // keep the window usable, and bound how far a single correction can move it
  adjustment = Math.max(adjustment, MIN_POPUP_HEIGHT - viewportHeight);
  adjustment = Math.max(-MAX_POPUP_HEIGHT_ADJUSTMENT,
    Math.min(MAX_POPUP_HEIGHT_ADJUSTMENT, adjustment));

  return Math.abs(adjustment) <= 1 ? 0 : adjustment;
}

/**
 * Resizes a script-opened popup so its content fits without clipping.
 *
 * The imperative shell around `getWindowHeightAdjustment`. Safe to call in a
 * regular tab: `resizeBy` is a no-op on windows the script did not open, and
 * any failure is swallowed -- a popup that cannot be resized still works, it
 * just scrolls.
 *
 * @param {object} options - The options to use.
 * @param {Window} [options.win=window] - The window to fit.
 *
 * @returns {number} The adjustment actually applied, in px.
 */
export function fitWindowToContent({win = window} = {}) {
  try {
    const {documentElement: html, body} = win.document;
    /* The document's own `scrollHeight` is not enough. The 1p dialog is laid
    out to exactly fill the popup with one internally scrolling region, so
    content that does not fit is clipped *inside* that region and the document
    itself never overflows -- `html.scrollHeight` equals `innerHeight` no
    matter how badly the greeting is cut off. Add the largest overflow found
    among scrolling descendants so the window grows by enough to reveal it. */
    const documentHeight = Math.max(
      html.scrollHeight, body ? body.scrollHeight : 0);
    const contentHeight = documentHeight + _getMaxInnerOverflow(win);
    const adjustment = getWindowHeightAdjustment({
      contentHeight,
      viewportHeight: win.innerHeight,
      outerHeight: win.outerHeight,
      availableHeight: win.screen && win.screen.availHeight
    });
    if(adjustment !== 0) {
      win.resizeBy(0, adjustment);
    }
    return adjustment;
  } catch {
    // cross-origin, no permission to resize, or nothing to measure
    return 0;
  }
}

/* Largest vertical overflow among the document's scrollable elements.
Exported for testing only.

The wallet hint list is intentionally scrollable and can be arbitrarily long,
so it is skipped: growing the window to fit every wallet is not the goal (the
hint chooser has its own taller popup height for that). What this looks for is
a region that is clipped only because the popup is too short for its fixed
content -- the greeting and footer. */
export function _getMaxInnerOverflow(win) {
  let max = 0;
  const elements = win.document.querySelectorAll('.wrm-modal-content *');
  for(const el of elements) {
    if(el.classList.contains('wrm-hint-list')) {
      continue;
    }
    const overflow = el.scrollHeight - el.clientHeight;
    // ignore elements with no content box (inline elements report 0/0) and
    // sub-pixel noise
    if(el.clientHeight > 0 && overflow > max) {
      max = overflow;
    }
  }
  return Math.round(max);
}

export function getOriginName({origin, manifest} = {}) {
  const {host} = new URL(origin);
  if(!manifest) {
    return host;
  }
  const {name, short_name} = manifest;
  return name || short_name || host;
}
