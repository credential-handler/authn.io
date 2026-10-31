/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
export function getOriginName({origin, manifest} = {}) {
  const {host} = new URL(origin);
  if(!manifest) {
    return host;
  }
  const {name, short_name} = manifest;
  return name || short_name || host;
}
