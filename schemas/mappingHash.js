/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var bedrock = require('bedrock');

var hashLength = 'urn:sha256:'.length + 64;

var schema = {
  required: true,
  title: 'Decentralized Identifier Mapping Hash',
  description: 'A hash used to identify a mapping.',
  type: 'string',
  pattern: '^urn\\:sha256\\:[a-f0-9]*$',
  minLength: hashLength,
  maxLength: hashLength,
  errors: {
    invalid: 'The hash must be composed of a "urn:sha256:" prefix and ' +
      'and a lower case hexadecimal suffix of length 64.',
    missing: 'Please enter a hash.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
