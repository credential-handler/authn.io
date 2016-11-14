/*!
 * authorization.io provider page API.
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
  var expectFailure = options.expectFailure || false;
  element(by.brModel('model.email')).sendKeys(options.email);
  element(by.brModel('model.password')).sendKeys(options.passphrase);
  if(options.publicComputer) {
    element(by.model('model.publicComputer')).click();
  }
  element(by.buttonText('Login')).click();
  // FIXME: Find some way to not use sleep
  if(expectFailure) {
    browser.driver.sleep(1000);
  } else {
    // key generation can take some time
    browser.driver.sleep(6000);
  }
  bedrock.waitForAngular();

  // if errors exist, fail
  element(by.css('.br-alert-area-fixed-show')).isPresent()
    .then(function(present) {
      if(expectFailure && present) {
        return api;
      } else if(expectFailure && !present) {
        throw('Expected login to fail');
      } else if(!expectFailure && present) {
        throw('Expected login to succeed');
      }
    });

  return api;
};

api.logout = function() {
  browser.driver.manage().deleteCookie('session');
};
