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
var webdhtUpdateCounter = require('./webdhtUpdateCounter');

var createDidObject = {
  title: 'Create DID Object',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.IDENTITY_CONTEXT_V1_URL),
    id: did(),
    // TODO: change `idp` to `credentialRepository`
    idp: schemas.identifier(),
    url: schemas.identifier({required: false}),
    accessControl: accessControl(),
    publicKey: {
      title: 'Identity Public Key List',
      required: true,
      type: 'array',
      items: {
        title: 'Identity Public Key',
        type: 'object',
        properties: {
          '@context': schemas.jsonldContext(
            constants.IDENTITY_CONTEXT_V1_URL, {required: false}),
          id: schemas.identifier(),
          type: schemas.jsonldType('CryptographicKey'),
          label: schemas.label({required: false}),
          owner: schemas.identifier(),
          publicKeyPem: schemas.publicKeyPem()
        },
        additionalProperties: false
      },
      additionalItems: false
    },
    signature: schemas.linkedDataSignature()
  },
  additionalProperties: false
};

var updateDidObject = bedrock.util.clone(createDidObject);
updateDidObject.properties['urn:webdht:updateCounter'] = webdhtUpdateCounter();

module.exports.createDidObject = function() {
  return createDidObject;
};
module.exports.updateDidObject = function() {
  return updateDidObject;
};
