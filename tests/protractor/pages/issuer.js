/*
 * Credential issuer page API.
 *
 * Copyright (c) 2015 The Open Payments Foundation. All rights reserved.
 */
var bedrock = GLOBAL.bedrock;
var browser = GLOBAL.browser;
var by = GLOBAL.by;
var element = GLOBAL.element;
var protractor = GLOBAL.protractor;

var api = {};
module.exports = api;

api.navigateToIssuer = function() {
  bedrock.get('/issuer/dashboard');
  bedrock.waitForAngular();

  element(by.buttonText('Issue Passport Credential')).isPresent();

  return api;
};

api.issueAndStoreCredential = function() {
  // expect to already be on the issue credential page
  element(by.buttonText('Issue Passport Credential')).isPresent();
  bedrock.waitForAngular();

  element(by.buttonText('Issue Passport Credential')).click();

  // wait for the store button and click it
  var storeButton = element(by.buttonText('Store Credential'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(storeButton), 5000);
  storeButton.click();
  bedrock.waitForUrl(function(url) {
    return url.indexOf('/credentials?') !== -1;
  });
  bedrock.waitForAngular();

  // send verification of stored credentials
  var sendButton = element(by.buttonText('Send Credentials'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(sendButton), 5000);
  sendButton.click();

  // wait for acknowledgement
  bedrock.waitForUrl('/issuer/acknowledgements');
  bedrock.waitForAngular();

  return api;
}
