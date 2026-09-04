/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026, Digital Bazaar, Inc.
 */
const addUrlBarHeight = navigator.userAgent.toLowerCase().includes('firefox');
const urlBarHeight = addUrlBarHeight ? 30 : 0;

export const DEFAULT_ALLOW_WALLET_POPUP_WIDTH = 500;
// tall enough for the Block/Allow footer on browsers with tall popup
// chrome (e.g. Firefox always shows a URL bar in popups)
export const DEFAULT_ALLOW_WALLET_POPUP_HEIGHT = 230 + urlBarHeight;

export const DEFAULT_HANDLER_POPUP_WIDTH = 800;
export const DEFAULT_HANDLER_POPUP_HEIGHT = 600;

/* True on a phone or tablet, where a wallet app can be installed.

Deliberately not a width breakpoint: the wallet chooser renders in a 500px
popup on the desktop, which is the same width range as a phone screen, so
width cannot tell them apart. A coarse primary pointer that cannot hover
is the property that actually separates a touch device from a mouse-driven
desktop, and it does not depend on parsing user agent strings. */
export const IS_MOBILE_DEVICE =
  window.matchMedia?.('(any-pointer: coarse) and (any-hover: none)')
    ?.matches ?? false;

/* True where a web app can claim the `web+interaction:` scheme.

`web+` schemes resolve only to a handler registered through
`navigator.registerProtocolHandler()`. Safari has never shipped that API,
so on iOS -- and in Safari on the desktop -- such a link cannot resolve at
all: rather than failing silently the way an unclaimed native scheme does,
Safari reports "the address is invalid". Offering the link there is
offering a guaranteed error, so it is hidden when the API is absent.

Feature detection rather than a platform check: this asks the exact
question that decides whether the link can work, and needs no revision if
Safari ships the API or another engine drops it. */
export const SUPPORTS_WEB_WALLET_LINK =
  typeof navigator.registerProtocolHandler === 'function';

// Schemes for handing an interaction URL to a wallet that registered the
// scheme but is not registered as a credential handler in this browser.
// A native app can only register the bare scheme; a web app must use the
// `web+` prefix, which `navigator.registerProtocolHandler()` requires.
//
// NOTE: these are a Digital Bazaar convention, not a standard -- no
// normative definition of an interaction URL scheme exists yet. Rename
// here if CCG/VCALM agreement settles on different names.
export const WALLET_LINK_SCHEME_APP = 'interaction:';
export const WALLET_LINK_SCHEME_WEB = 'web+interaction:';

export const DEFAULT_HINT_CHOOSER_POPUP_WIDTH = 500;
export const DEFAULT_HINT_CHOOSER_POPUP_HEIGHT = 400 + urlBarHeight;
/* taller hint chooser popup that fits the cross-device QR section, plus
the same-device wallet link rows above it.

The dialog does not size itself to its content, so this height is
maintained by hand and every section added to the cross-device chooser has
to be paid for here. Set it too low and the Close button scrolls out of
reach. */
export const DEFAULT_CROSS_DEVICE_HINT_CHOOSER_POPUP_HEIGHT =
  570 + urlBarHeight;
