define([
  'angular',
  'forge/forge'
], function(angular, forge) {
'use strict';

var module = angular.module('authio.credentials', ['bedrock.alert']);

module.controller('CredentialsController', function(config, $location) {
  self = this;
  self.credentialCallback = sessionStorage.getItem($location.search().id);
  self.identity = window.data.authio.identity;

  self.transmitCredentials = function() {
    navigator.credentials.transmit(self.identity, {
      responseUrl: self.credentialCallback
    });
  };

});

});
