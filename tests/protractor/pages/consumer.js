/*
 * Credential consumer page API.
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

api.navigateToConsumer = function() {
  bedrock.get('/consumer/requestor');

  // wait for the Get Passport Credential button to appear
  var gpcButton = element(by.buttonText('Get Passport Credential'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(gpcButton), 5000);

  return api;
};

api.getCredential = function() {
  // expect to already be on the credential consumer page
  bedrock.waitForAngular();
  element(by.buttonText('Get Passport Credential')).isPresent();

  // initiate the credential consumption process
  element(by.buttonText('Get Passport Credential')).click();
  // FIXME: Find some way to not use sleep
  browser.driver.sleep(1000);
  bedrock.waitForAngular();
};

api.retrieveCredential = function() {
  // wait for the compose button and click it
  bedrock.waitForUrl(function(url) {
    return url.indexOf('/idp/credentials?') !== -1;
  });
  bedrock.waitForAngular();

  // wait for the Get Passport Credential button to appear
  var emailButton = element(by.buttonText('email'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(emailButton), 5000);
  emailButton.click();
  bedrock.waitForAngular();
  var credential = element.all(by.css('.br-selectable')).get(0);
  credential.click();
  bedrock.waitForAngular();
  var doneButton = element(by.buttonText('Done'));
  doneButton.click();
  browser.sleep(1000);

  // send credential to be consumed
  var sendButton = element(by.buttonText('Send Credentials'));
  browser.wait(
    protractor.ExpectedConditions.elementToBeClickable(sendButton), 5000);
  sendButton.click();
  bedrock.waitForAngular();

  // wait for acknowledgement of credential receipt
  bedrock.waitForUrl('/consumer/credentials');
  bedrock.waitForAngular();

  return api;
};
