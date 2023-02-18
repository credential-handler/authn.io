/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
const KEY = 'storedCredentialHandlerChoices';

export function setSiteChoice({credentialRequestOrigin, credentialHandler}) {
  // store hint as *the* choice for current site (credential request origin)
  try {
    const choices = _getChoices();
    if(credentialHandler) {
      choices[credentialRequestOrigin] = credentialHandler;
    } else {
      delete choices[credentialRequestOrigin];
    }
    localStorage.setItem(KEY, JSON.stringify(choices));
  } catch(e) {
    // ignore errors
  }
}

export function getSiteChoice({credentialRequestOrigin, hintOptions}) {
  try {
    const choices = _getChoices();
    const credentialHandler = choices[credentialRequestOrigin];
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

export function hasSiteChoice({credentialRequestOrigin}) {
  try {
    const choices = _getChoices();
    const credentialHandler = choices[credentialRequestOrigin];
    if(credentialHandler) {
      return true;
    }
  } catch(e) {
    // ignore
  }
  return false;
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
