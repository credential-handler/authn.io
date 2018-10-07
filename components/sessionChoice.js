/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
'use strict';

export function setSessionChoice({credentialHandler}) {
  // store hint as *the* choice for the current session
  try {
    sessionStorage.setItem('credentialHandlerChoice', credentialHandler);
  } catch(e) {
    // ignore errors
  }
}

export function getSessionChoice({hintOptions}) {
  try {
    const credentialHandler = sessionStorage.getItem('credentialHandlerChoice');
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
