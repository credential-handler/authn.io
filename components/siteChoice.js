/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2019, Digital Bazaar, Inc.
 * All rights reserved.
 */
'use strict';

const KEY = 'storedCredentialHandlerChoices';

export function setSiteChoice({relyingOrigin, credentialHandler}) {
  // store hint as *the* choice for the current site (relying origin)
  try {
    const choices = _getChoices();
    if(credentialHandler) {
      choices[relyingOrigin] = credentialHandler;
    } else {
      delete choices[relyingOrigin];
    }
    localStorage.setItem(KEY, JSON.stringify(choices));
  } catch(e) {
    // ignore errors
  }
}

export function getSiteChoice({relyingOrigin, hintOptions}) {
  try {
    const choices = _getChoices();
    const credentialHandler = choices[relyingOrigin];
    if(!credentialHandler) {
      return null;
    }
    for(const option of hintOptions) {
      if(option.hintOption.credentialHandler === credentialHandler) {
        return option;
      }
    }
  } catch(e) {
    // ignore
  }
  return null;
}

function _getChoices() {
  let choices;
  try {
    choices = JSON.parse(localStorage.getItem(KEY) || {});
  } catch(e) {
    // ignore
  }
  return choices || {};
}
