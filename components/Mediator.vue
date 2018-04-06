<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()" @allow="accept()"/>
    </div>

    <div v-if="display === 'credentialRequest'">
      <wrm-hint-chooser
        :hints="hintOptions"
        default-hint-icon="fa-user"
        @confirm="selectHint"
        @cancel="cancel()">
        <template slot="header">
          <div style="padding-right: 10px">
            <strong>{{relyingDomain}}</strong> wants credentials
          </div>
          <div v-if="loading">
            Loading options...
          </div>
          <div v-else>
            <div v-if="hintOptions.length === 0">
              You don't have any matching credentials.
            </div>
            <div class="wrm-heading" v-else>
              Choose an option to continue
            </div>
          </div>
        </template>
      </wrm-hint-chooser>
    </div>

    <div v-if="display === 'credentialStore'">
      <wrm-hint-chooser
        :hints="hintOptions"
        default-hint-icon="fa-user"
        @confirm="selectHint"
        @cancel="cancel()">
        <template slot="header">
          <div style="padding-right: 10px">
            <strong>{{relyingDomain}}</strong> wants to store
            credentials
          </div>
          <div v-if="loading">
            Loading provider options...
          </div>
          <div else>
            <div v-if="hintOptions.length === 0">
              You don't have a digital wallet to store credentials. Please
              visit a digital wallet website to install one.
            </div>
            <div class="wrm-heading" v-else>
              Choose an option to continue
            </div>
          </div>
        </template>
      </wrm-hint-chooser>
    </div>
  </div>
</template>
<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
/* global navigator */
'use strict';

import * as polyfill from 'credential-mediator-polyfill';
import {utils} from 'web-request-rpc';
import HandlerWindowHeader from './HandlerWindowHeader.vue';
import Vue from 'vue';

let deferredCredentialOperation;
let credentialRequestOptions;
let resolvePermissionRequest;

export default {
  name: 'Mediator',
  created() {
    if(window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0) {
      this.relyingOrigin = window.location.ancestorOrigins[0];
    } else {
      const {origin} = this.$route.query;
      this.relyingOrigin = origin;
    }

    this.relyingDomain = utils.parseUrl(this.relyingOrigin).hostname;

    // TODO: is this the appropriate place to run this?
    loadPolyfill(this);
  },
  data() {
    return {
      display: null,
      hintOptions: [],
      permissions: [{
        name: 'Manage credentials',
        icon: 'fa fa-id-card-o'
      }],
      relyingDomain: null,
      relyingOrigin: null
    };
  },
  methods: {
    async accept() {
      resolvePermissionRequest('granted');
      this.display = null;
      await navigator.credentialMediator.hide();
    },
    async deny() {
      resolvePermissionRequest('denied');
      this.display = null;
      await navigator.credentialMediator.hide();
    },
    async cancel() {
      this.display = null;
      deferredCredentialOperation.resolve(null);
      await navigator.credentialMediator.hide();
    },
    async selectHint(event) {
      const self = this;
      let _resolve;
      event.waitUntil(new Promise(r => _resolve = r));

      let response;
      try {
        response = await navigator.credentialMediator.ui.selectCredentialHint(
          event.hint.hintOption);
        deferredCredentialOperation.resolve(response);
      } catch(e) {
        console.error(e);
        deferredCredentialOperation.reject(e);
      }

      try {
        self.display = null;
        await navigator.credentialMediator.hide();
      } catch(e) {
        console.error(e);
      }

      _resolve();
    }
  }
};

async function loadPolyfill(component) {
  try {
    await polyfill.load({
      relyingOrigin: component.relyingOrigin,
      requestPermission: requestPermission.bind(component),
      getCredential: getCredential.bind(component),
      storeCredential: storeCredential.bind(component),
      customizeHandlerWindow({webAppWindow}) {
        updateHandlerWindow.bind(component)(webAppWindow);
      }
    });
  } catch(e) {
    console.error(e);
  }
}

async function requestPermission(permissionDesc) {
  // prep display
  this.display = 'permissionRequest';
  const promise = new Promise(resolve => {
    resolvePermissionRequest = state => resolve({state});
  });

  // show display and return promise
  await navigator.credentialMediator.show();
  return promise;
}

async function getCredential(operationState) {
  // prep display
  this.display = 'credentialRequest';
  credentialRequestOptions = operationState.input.credentialRequestOptions;
  this.loading = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  // show display
  await navigator.credentialMediator.show();

  // get matching hints
  const hintOptions = await navigator.credentialMediator.ui
    .matchCredentialRequest(operationState.input.credentialRequestOptions);
  this.hintOptions = hintOptions.map(option => ({
    name: option.credentialHint.name,
    icon: getIconDataUrl(option.credentialHint),
    origin: utils.parseUrl(option.credentialHandler).hostname,
    hintOption: option
  }));
  this.loading = false;

  return promise;
}

async function storeCredential(operationState) {
  // prep display
  this.display = 'credentialStore';
  this.credential = operationState.input.credential;
  this.loading = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  // show display
  await navigator.credentialMediator.show();

  // get matching hints
  const hintOptions = await navigator.credentialMediator.ui
    .matchCredential(operationState.input.credential);
  this.hintOptions = hintOptions.map(option => ({
    name: option.credentialHint.name,
    icon: getIconDataUrl(option.credentialHint),
    origin: utils.parseUrl(option.credentialHandler).hostname,
    hintOption: option
  }));
  this.loading = false;

  return promise;
}

function updateHandlerWindow(handlerWindow) {
  const container = handlerWindow.container;
  const operation = credentialRequestOptions ? 'request' : 'store';
  const origin = utils.parseUrl(handlerWindow.iframe.src).hostname;
  const Component = Vue.extend(HandlerWindowHeader);
  const el = document.createElement('div');
  container.insertBefore(el, handlerWindow.iframe);
  new Component({
    el,
    propsData: {
      origin,
      relyingDomain: this.relyingDomain,
      operation
    }
  });
  // TODO: should this be done?
  handlerWindow.iframe.style.background = 'white';
}

function getIconDataUrl(credentialHint) {
  if(credentialHint.icons.length > 0) {
    // TODO: choose appropriately sized icon
    // return icon.fetchedImage;
  }
  return null;
}
</script>
<style>
</style>
