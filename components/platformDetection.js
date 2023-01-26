/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {detect} from 'detect-browser';

const browser = detect();

let hasLocalStorage;
try {
  hasLocalStorage = !!localStorage;
} catch(e) {
  hasLocalStorage = false;
}

// specifically, branded Google Chrome, not just chromium
let isChrome;
try {
  isChrome = browser && browser.name === 'chrome' &&
    navigator.userAgentData &&
    navigator.userAgentData.brands.some(({brand}) => brand === 'Google Chrome');
} catch(e) {
  isChrome = false;
}

// always use 1p window if browser:
// 1. is Brave
// 2. is not Google Chrome
// 3. has no local storage
const _useFirstPartyMode = !!(navigator.brave || !isChrome || !hasLocalStorage);

export function shouldUseFirstPartyMode() {
  return _useFirstPartyMode;
}
