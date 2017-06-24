/*!
 * Identity provider page API.
 *
 * New BSD License (3-clause)
 * Copyright (c) 2015-2016, Digital Bazaar, Inc.
 * Copyright (c) 2015-2016, Accreditrust Technologies, LLC
 * All rights reserved.
 */
var bedrock = GLOBAL.bedrock;
var by = GLOBAL.by;
var element = GLOBAL.element;
var expect = GLOBAL.expect;
var api = {};
module.exports = api;

api.navigateToRegistrationForm = function() {
  bedrock.get('/idp');
  element(by.buttonText('Register Identity')).click();
  bedrock.waitForUrl('/idp/identities');
  bedrock.waitForAngular();
};

api.checkFields = function() {
  expect(element(by.brModel('model.username'))
    .isPresent()).to.eventually.equal(true);
  expect(element(by.brModel('model.passphrase'))
    .isPresent()).to.eventually.equal(true);
  expect(element(by.brModel('model.passphraseConfirmation'))
    .isPresent()).to.eventually.equal(true);
  expect(element(by.buttonText('Register'))
    .isPresent()).to.eventually.equal(true);
};

api.testField = function(modelName, testString, expectedErrorId) {
  element(by.brModel(modelName)).sendKeys(testString);
  element(by.buttonText('Register')).click();
  bedrock.waitForAngular();
  element(by.brModel(modelName)).getAttribute('name')
    .then(function(elementName) {
      expect(element(by.attribute('br-model', modelName))
        .element(by.attribute(
          'ng-show', [
            'regForm', elementName, '$error', expectedErrorId
          ].join('.')))
        .isDisplayed()).to.eventually.equal(true);
    });
};

api.testFieldsMatch = function(
  modelNameA, modelNameB, testStringA, testStringB, expectedErrorId) {
  element(by.brModel(modelNameA)).sendKeys(testStringA);
  element(by.brModel(modelNameB)).sendKeys(testStringB);
  element(by.buttonText('Register')).click();
  bedrock.waitForAngular();
  element(by.brModel(modelNameB)).getAttribute('name')
    .then(function(elementName) {
      expect(element(by.attribute('br-model', modelNameB))
        .element(by.attribute(
          'ng-show',
          ['regForm', elementName, '$error', expectedErrorId].join('.')))
        .isDisplayed()).to.eventually.equal(true);
    });
};

api.registerDid = function(identity) {
  element(by.brModel('model.username')).sendKeys(identity.email);
  element(by.brModel('model.passphrase')).sendKeys(identity.passphrase);
  element(by.brModel('model.passphraseConfirmation'))
    .sendKeys(identity.passphrase);
  element(by.buttonText('Register')).click();
  bedrock.waitForUrl('/');
  bedrock.waitForAngular();
};
