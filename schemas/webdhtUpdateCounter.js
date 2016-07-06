/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');

var schema = {
  required: true,
  title: 'WebDHT Update Counter',
  description: 'An update counter for WebDHT objects.',
  type: 'string',
  pattern: "^[0-9]*$",
  errors: {
    invalid: 'The update counter is invalid.',
    missing: 'Please enter an update counter.'
  }
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
