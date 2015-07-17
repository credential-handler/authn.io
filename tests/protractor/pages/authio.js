/*
 * authorization.io provider page API.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = GLOBAL.bedrock;
var browser = GLOBAL.browser;
var by = GLOBAL.by;
var element = GLOBAL.element;
var expect = GLOBAL.expect;
var protractor = GLOBAL.protractor;
var api = {};
module.exports = api;

api.navigateToLoginForm = function() {
  bedrock.get('/issuer');
  element(by.buttonText('Login')).click();
  bedrock.waitForUrl(function(url) {
    return url.indexOf('/requests?credentialCallback') !== -1;
  });
  bedrock.waitForAngular();

  return api;
};

api.login = function(options) {
  element(by.brModel('model.username')).sendKeys(options.email);
  element(by.brModel('model.password')).sendKeys(options.passphrase);
  if(options.publicComputer) {
    element(by.model('model.publicComputer')).click();
  }
  element(by.buttonText('Login')).click();

  // if errors exist, fail
  // FIXME: Check for errors
  //expect($('.br-alert-area-fixed-show').isPresent()).toBe(false);

  // wait for compose screen
  bedrock.waitForUrl(function(url) {
    return url.indexOf('/idp/credentials?') !== -1;
  });
  bedrock.waitForAngular();

  // compose and wait for send screen
  var composeButton = element(by.buttonText('Compose Credential'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(composeButton), 5000);
  composeButton.click();
  bedrock.waitForUrl(function(url) {
    return url.indexOf('/credentials?') !== -1;
  });
  bedrock.waitForAngular();

  // send credentials and wait for
  var sendButton = element(by.buttonText('Send Credentials'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(sendButton), 5000);
  sendButton.click();

  bedrock.waitForUrl('/issuer/dashboard');
  bedrock.waitForAngular();

  return api;
};

api.logout = function() {
  browser.driver.manage().deleteCookie('session');
};

