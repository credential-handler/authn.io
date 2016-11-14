/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
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
