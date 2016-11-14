/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var bedrock = require('bedrock');
var schemas = require('bedrock-validation').schemas;

var schema = {
  title: 'Identity Access Control',
  required: true,
  type: 'object',
  properties: {
    writePermission: {
      title: 'Identity Write Permission',
      required: true,
      type: 'array',
      items: {
        title: 'Identity Write Permission Entry',
        required: true,
        type: 'object',
        properties: {
          id: schemas.identifier(),
          type: {
            title: 'Identity Write Permission Entry Type',
            required: true,
            type: 'string',
            enum: ['CryptographicKey', 'Identity']
          }
        },
        additionalProperties: false
      },
      additionalItems: false
    }
  },
  additionalProperties: false
};

module.exports = function(extend) {
  if(extend) {
    return bedrock.util.extend(true, bedrock.util.clone(schema), extend);
  }
  return schema;
};
