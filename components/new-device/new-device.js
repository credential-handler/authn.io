define([
  'angular',
  'jquery'
], function(angular) {

'use strict';

var module = angular.module('app.new-device', []);

module.controller('NewDeviceController', function($scope, DataService) {
  var self = this;
  var idpInfo = DataService.get('idpInfo');
  if(!idpInfo) {
    self.idpUrl = 'register/idp-error';
  }
  else{
    self.idpUrl = idpInfo.url;
  }
  $('#idpInfo').attr('href', self.idpUrl);

});


});