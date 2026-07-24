/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 */
/* Popup chrome (URL bar, title bar) is subtracted from the height passed to
`window.open`, so the usable viewport is always shorter than requested by an
amount that varies by browser, platform, and user settings. This allowance
covers the common case; it is applied unconditionally rather than only when the
user agent looks like Firefox, because Chrome and Safari also show a URL bar in
popups and UA sniffing cannot predict the real chrome height. Popups that end
up with more viewport than they need are shrunk to fit after they load (see
`fitWindowToContent`), so over-allowing here costs nothing. */
const urlBarHeight = 30;

export const DEFAULT_ALLOW_WALLET_POPUP_WIDTH = 500;
// tall enough for the greeting (48px wallet icon + name and origin lines)
// plus the Block/Allow footer
export const DEFAULT_ALLOW_WALLET_POPUP_HEIGHT = 260 + urlBarHeight;

export const DEFAULT_HANDLER_POPUP_WIDTH = 800;
export const DEFAULT_HANDLER_POPUP_HEIGHT = 600;

export const DEFAULT_HINT_CHOOSER_POPUP_WIDTH = 500;
export const DEFAULT_HINT_CHOOSER_POPUP_HEIGHT = 400 + urlBarHeight;
// taller hint chooser popup that fits the cross-device QR section
export const DEFAULT_CROSS_DEVICE_HINT_CHOOSER_POPUP_HEIGHT =
  550 + urlBarHeight;
