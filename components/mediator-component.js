/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017, Digital Bazaar, Inc.
 * All rights reserved.
 */
/* global navigator */
'use strict';

import * as polyfill from 'credential-mediator-polyfill';
import {utils} from 'web-request-rpc';

export default {
  controller: Ctrl,
  templateUrl: 'authio/mediator-component.html'
};

/* @ngInject */
function Ctrl($compile, $location, $scope) {
  const self = this;
  self.hintOptions = [];
  self.permissions = [{
    name: 'Manage credentials',
    icon: 'fa fa-id-card-o'
  }];

  if(window.location.ancestorOrigins &&
    window.location.ancestorOrigins.length > 0) {
    self.relyingOrigin = window.location.ancestorOrigins[0];
  } else {
    const query = $location.search();
    self.relyingOrigin = query.origin;
  }

  self.relyingDomain = utils.parseUrl(self.relyingOrigin).hostname;

  self.accept = async () => {
    self.permissionRequest('granted');
    self.display = null;
    await navigator.credentialMediator.hide();
  };

  self.deny = async () => {
    self.permissionRequest('denied');
    self.display = null;
    await navigator.credentialMediator.hide();
  };

  self.selectHint = async (selection) => {
    if(!selection) {
      self.display = null;
      self.credentialOperationPromise.resolve(null);
      return await navigator.credentialMediator.hide();
    }

    let response;
    try {
      response = await navigator.credentialMediator.ui.selectCredentialHint(
        selection.hintOption);
      console.log('response', response);
    } catch(e) {
      console.error(e);
      self.credentialOperationPromise.reject(e);
    }
    if(response) {
      self.credentialOperationPromise.resolve(response);
    }

    self.display = null;
    await navigator.credentialMediator.hide();
    $scope.$apply();
  };

  (async () => {
    try {
      await polyfill.load({
        relyingOrigin: self.relyingOrigin,
        requestPermission,
        getCredential,
        storeCredential,
        customizeHandlerWindow({webAppWindow}) {
          updateHandlerWindow(webAppWindow);
        }
      });
      console.log('authorization.io loaded mediator polyfill');
    } catch(e) {
      console.error('authorization.io failed to load mediator polyfill');
      console.error(e);
    }
  })();

  async function requestPermission(permissionDesc) {
    // prep display
    self.display = 'permissionRequest';
    const promise = new Promise(resolve => {
      self.permissionRequest = state => resolve({state: state});
    });
    $scope.$apply();

    // show display and return promise
    await navigator.credentialMediator.show();
    return promise;
  }

  async function getCredential(operationState) {
    // prep display
    self.display = 'credentialRequest';
    self.credentialRequestOptions =
      operationState.input.credentialRequestOptions;
    self.loading = true;
    const promise = new Promise((resolve, reject) => {
      self.credentialOperationPromise = {resolve, reject};
    });
    $scope.$apply();

    // show display
    await navigator.credentialMediator.show();

    // get matching hints
    const hintOptions = await navigator.credentialMediator.ui
      .matchCredential(operationState.credential);
    self.hintOptions = hintOptions.map(option => ({
      name: option.credentialHint.name,
      icon: getIconDataUrl(option.credentialHint),
      origin: utils.parseUrl(option.credentialHandler).hostname,
      hintOption: option
    }));
    self.loading = false;
    $scope.$apply();

    console.log('hints', self.hintOptions);

    return promise;
  }

  async function storeCredential(operationState) {
    // prep display
    self.display = 'credentialStore';
    self.credential = operationState.input.credential;
    self.loading = true;
    const promise = new Promise((resolve, reject) => {
      self.credentialOperationPromise = {resolve, reject};
    });
    $scope.$apply();

    // show display
    await navigator.credentialMediator.show();

    // get matching hints
    const hintOptions = await navigator.credentialMediator.ui
      .matchCredential(operationState.credential);
    self.hintOptions = hintOptions.map(option => ({
      name: option.credentialHint.name,
      icon: getIconDataUrl(option.credentialHint),
      origin: utils.parseUrl(option.credentialHandler).hostname,
      hintOption: option
    }));
    self.loading = false;
    $scope.$apply();

    console.log('hints', self.hintOptions);

    return promise;
  }

  function updateHandlerWindow(handlerWindow) {
    const container = handlerWindow.container;
    const operation = self.credentialRequestOptions ? 'request' : 'store';
    const header = $compile(
      '<aio-handler-window-header aio-relying-domain="$ctrl.relyingDomain" ' +
      `aio-operation="${operation}">`)($scope);
    container.insertBefore(header[0], handlerWindow.iframe);
    handlerWindow.iframe.style.background = 'white';
  }
}

function getIconDataUrl(credentialHint) {
  if(credentialHint.icons.length > 0) {
    // TODO: choose appropriately sized icon
    // return icon.fetchedImage;
  }
  return null;
}
