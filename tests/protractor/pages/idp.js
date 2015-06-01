/*
 * Identity provider page API.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = GLOBAL.bedrock;
var browser = GLOBAL.browser;
var by = GLOBAL.by;
var element = GLOBAL.element;
var expect = GLOBAL.expect;

var api = {};
module.exports = api;

api.registerDid = function(identity) {
  bedrock.get('/idp');
  element(by.buttonText('Create Identity')).click();
  bedrock.waitForUrl('/idp/identities');
  bedrock.waitForAngular();
  element(by.brModel('model.username')).sendKeys(identity.email);
  element(by.brModel('model.passphrase')).sendKeys(identity.passphrase);
  element(by.brModel('model.passphraseConfirmation')).sendKeys(identity.passphrase);
  element(by.buttonText('Submit')).click();
  bedrock.waitForUrl('/idp');
  bedrock.waitForAngular();
};
