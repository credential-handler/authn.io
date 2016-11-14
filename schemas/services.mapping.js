/*!
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var bedrock = require('bedrock');
var constants = bedrock.config.constants;
var schemas = require('bedrock-validation').schemas;
var accessControl = require('./accessControl');
var did = require('./did');
var mappingHash = require('./mappingHash');

var getMappingQuery = {
  title: 'Get Decentralized Identifier Mapping Query',
  type: 'object',
  properties: {
    hash: mappingHash()
  },
  additionalProperties: false
};

var createMapping = {
  title: 'Create Decentralized Identifier Mapping',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.IDENTITY_CONTEXT_V1_URL),
    id: mappingHash(),
    // currently, only DID-based URLs are supported
    url: did(),
    accessControl: accessControl(),
    signature: schemas.linkedDataSignature()
  },
  additionalProperties: false
};

module.exports.getMappingQuery = function() {
  return getMappingQuery;
};
module.exports.createMapping = function() {
  return createMapping;
};
