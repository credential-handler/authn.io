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
  bedrock.waitForUrl('/create-identity');
  bedrock.waitForAngular();
  element(by.brModel('model.username')).sendKeys(identity.email);
  element(by.brModel('model.password')).sendKeys(identity.password);
  element(by.brModel('model.passwordConfirmation')).sendKeys(identity.password);
  element(by.buttonText('Submit')).click();
  bedrock.waitForUrl('/');
  bedrock.waitForAngular();
};
