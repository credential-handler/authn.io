define([
  'underscore',
  'async',
  'forge/js/forge',
  'jsonld',
  'jsonld-signatures',
  'node-uuid'
], function(_, async, forge, jsonld, jsigjs, uuid) {

'use strict';

/* @ngInject */
function factory($scope, config, $location, ipCookie) {

  var self = this;
  self.idp = {};
  self.idp.url = null;
  self.idp.query = null;
  self.display = {};
  self.display.form = true;
  self.display.identity = false;

  var _display = function(section) {
    // hide all
    _.each(self.display, function(value, key, list) {
      self.display[key] = false;
    });
    // display section
    self.display[section] = true;
  };

  if(config.data.authio && config.data.authio.identity) {
    self.identity = config.data.authio.identity;
    _display('identity');
  }

  var idpTestFormData = ipCookie('idpTestFormData');
  if(idpTestFormData) {
    self.idp.url = idpTestFormData.url;
    self.idp.query = idpTestFormData.query;
  }

  // refresh the session cookie
  // NOTE: session is currently unused in this module
  var session = ipCookie('session');
  // refresh session
  ipCookie('session', session, {
    expires: 30,
    expirationUnit: 'days'
  });

  var _saveFormData = function() {
    idpTestFormData = {};
    idpTestFormData.url = self.idp.url;
    idpTestFormData.query = self.idp.query;
    ipCookie('idpTestFormData', idpTestFormData, {
      expires: 30,
      expirationUnit: 'days'
    });
  };

  self.send = function() {
    _saveFormData();
    // NOTE: id is not presently used in the mock
    var id = uuid.v4();
    var authioCallback =
      config.data.baseUri + '/test/credentials/composed-identity?id=' + id;
    try {
      navigator.credentials.request(self.idp.query, {
        requestUrl: self.idp.url,
        credentialCallback: authioCallback
      });
    } catch(err) {
      alert(err);
    }
  };

  self.clearForm = function(field) {
    if(field) {
      self.idp[field] = null;
    } else {
      $scope.idptestform.$setPristine();
      _.each(self.idp, function(value, key, list) {
        self.idp[key] = null;
      });
    }
  };

  self.startOver = function() {
    _display('form');
  };

};

return {IdpTestController: factory};

});
