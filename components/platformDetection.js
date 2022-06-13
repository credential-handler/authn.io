/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {detect} from 'detect-browser';

const browser = detect();

// always use 1p window if browser supports Storage Access API (as it
// implies partitioned 3rd party storage) or if browser is not chrome
const _useFirstPartyMode = document.requestStorageAccess || navigator.brave ||
  !(browser && browser.name === 'chrome');

export function shouldUseFirstPartyMode() {
  return _useFirstPartyMode;
}
