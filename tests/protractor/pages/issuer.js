/*!
 * Credential issuer page API.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
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
  var issueButton = element(by.buttonText('Issue Passport Credential'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(issueButton), 5000);
  issueButton.click();
  // FIXME: Find some way to not use sleep
  browser.driver.sleep(2000);
  bedrock.waitForAngular();

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
  // FIXME: Find some way to not use sleep
  browser.driver.sleep(2000);
  bedrock.waitForAngular();

  // wait for acknowledgement
  bedrock.waitForUrl('/issuer/acknowledgements');
  bedrock.waitForAngular();

  return api;
};
