define([
  'angular',
  'forge/forge'
], function(angular, forge) {

'use strict';

var module = angular.module('app.credentials-approve', ['bedrock.alert']);


module.controller('CredentialsApproveController', function(
  config, DataService) {

  console.log('config data', config.data);

  var credentials = config.data.credentials;

  var queryUrl = sessionStorage.getItem(param('id'));

  if(queryUrl == null){
    console.log("The id sent was invalid!");
  }

  var queryString = escapeHtml(JSON.stringify(credentials));
  var form = document.createElement('form');
  form.setAttribute('method', 'post');
  form.setAttribute('action', queryUrl);
  form.innerHTML = 
  '<input type="hidden" name="callerData" value="' + queryString + '" />';
  form.submit();

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function param(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
      results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }
});


});
