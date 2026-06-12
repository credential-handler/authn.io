/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2026, Digital Bazaar, Inc.
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
  } catch {
    // ignore errors
  }
}

export function getSiteChoice({credentialRequestOrigin, hints}) {
  try {
    const choices = _getChoices();
    const credentialHandler = choices[credentialRequestOrigin];
    if(!credentialHandler) {
      return null;
    }
    for(const hint of hints) {
      if(hint.hintOption.credentialHandler === credentialHandler) {
        return hint;
      }
    }
  } catch {
    // ignore errors
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
  } catch {
    // ignore errors
  }
  return false;
}

function _getChoices() {
  let choices;
  try {
    choices = JSON.parse(localStorage.getItem(KEY) || {});
  } catch {
    // ignore errors
  }
  return choices || {};
}
