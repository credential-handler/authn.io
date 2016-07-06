/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');

var schema = {
  required: true,
  title: 'Decentralized Identifier',
  description: 'A decentralized identifier.',
  type: 'string',
  pattern: "^did\\:.*$",
  errors: {
    invalid: 'The decentralized identifier is invalid.',
    missing: 'Please enter a decentralized identifier.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
