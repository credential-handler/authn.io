define(['angular'], function(angular) {

'use strict';

var module = angular.module('authio.credentials', ['bedrock.alert']);

// TODO: move to separate file, use @ngInject
module.controller('CredentialsController', function(config, $location) {
  var self = this;
  self.callback = sessionStorage.getItem($location.search().id);
  self.identity = config.data.authio.identity;

  self.transmitCredentials = function() {
    navigator.credentials.transmit(self.identity, {
      responseUrl: self.callback
    });
  };
});

});
