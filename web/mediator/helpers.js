/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {utils} from 'web-request-rpc';

export function getOriginName({origin, manifest} = {}) {
  // FIXME: use WHATWG URL parser
  const {host} = utils.parseUrl(origin);
  if(!manifest) {
    return host;
  }
  const {name, short_name} = manifest;
  return name || short_name || host;
}

export async function autoRegisterHint({hint}) {
  const {
    hintOption: {credentialHandler},
    manifest: {credential_handler: {enabledTypes}},
    name
  } = hint;
  await navigator.credentialMediator.ui.registerCredentialHandler(
    credentialHandler, {name, enabledTypes, icons: []});
}
