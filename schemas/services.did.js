/*
 * Copyright (c) 2016 Digital Bazaar, Inc. All rights reserved.
 */
var bedrock = require('bedrock');
var constants = bedrock.config.constants;
var schemas = require('bedrock-validation').schemas;
var did = require('./did');
var webdhtUpdateCounter = require('./webdhtUpdateCounter');

var createDidObject = {
  title: 'Create DID Object',
  type: 'object',
  properties: {
    '@context': schemas.jsonldContext(constants.IDENTITY_CONTEXT_V1_URL),
    id: did(),
    idp: schemas.identifier(),
    url: schemas.identifier({required: false}),
    accessControl: {
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
    },
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
