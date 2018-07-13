<template>
  <div>
    <div v-if="display === 'permissionRequest'">
      <wrm-permission-dialog
        :origin="relyingDomain"
        :permissions="permissions"
        @deny="deny()" @allow="accept()"/>
    </div>

    <div v-else-if="display === 'credentialRequest'">
      <wrm-hint-chooser
        :hints="hintOptions"
        default-hint-icon="fa-user"
        :confirm-button="needsStorageAccess"
        @confirm="selectHint"
        @cancel="cancel()"
        @load-hints="loadHints(true)">
        <template slot="header">
          <div style="padding-right: 10px; margin-bottom: 5px">
            <strong>{{relyingDomain}}</strong> wants credentials
          </div>
          <div v-if="loading">
            Loading options... <i class="fa fa-circle-o-notch fa-spin"></i>
          </div>
          <div v-else-if="!needsStorageAccess">
            <div v-if="hintOptions.length === 0">
              <div class="wrm-heading">Warning</div>
              <div>
                You don't have the credentials requested by this website.
                Please check <strong>{{relyingDomain}}</strong> to find out
                how to obtain the credentials you need to continue.
              </div>
            </div>
            <div v-else class="wrm-heading">
              Choose an option to continue
            </div>
          </div>
        </template>
      </wrm-hint-chooser>
    </div>

    <div v-else-if="display === 'credentialStore'">
      <wrm-hint-chooser
        :hints="hintOptions"
        default-hint-icon="fa-user"
        :confirm-button="needsStorageAccess"
        @confirm="selectHint"
        @cancel="cancel()"
        @load-hints="loadHints(true)">
        <template slot="header">
          <div style="padding-right: 10px; margin-bottom: 5px">
            <strong>{{relyingDomain}}</strong> wants to store credentials
          </div>
          <div v-if="loading">
            Loading options... <i class="fa fa-circle-o-notch fa-spin"></i>
          </div>
          <div v-else-if="!needsStorageAccess">
            <div v-if="hintOptions.length === 0">
              You don't have a digital wallet to store credentials. Please
              visit a digital wallet website to install one.
            </div>
            <div v-else class="wrm-heading">
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
let resolvePermissionRequest;

export default {
  name: 'Mediator',
  async created() {
    if(window.location.ancestorOrigins &&
      window.location.ancestorOrigins.length > 0) {
      this.relyingOrigin = window.location.ancestorOrigins[0];
    } else {
      const {origin} = this.$route.query;
      this.relyingOrigin = origin;
    }

    this.relyingDomain = utils.parseUrl(this.relyingOrigin).hostname;

    if(typeof document.hasStorageAccess === 'function') {
      this.needsStorageAccess = await document.hasStorageAccess();
    } else {
      this.needsStorageAccess = false;
    }

    // TODO: is this the appropriate place to run this?
    loadPolyfill(this);
  },
  data() {
    return {
      display: null,
      hintOptions: [],
      loading: false,
      needsStorageAccess: false,
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
    async loadHints(force) {
      if(!force && this.needsStorageAccess) {
        this.hintOptions = [];
        return;
      }
      let hintOptions;
      if(this.credentialRequestOptions) {
        // get matching hints from request options
        hintOptions = await navigator.credentialMediator.ui
          .matchCredentialRequest(this.credentialRequestOptions);
      } else {
        // must be a storage request, get hints that match credential
        hintOptions = await navigator.credentialMediator.ui
          .matchCredential(this.credential);
      }
      this.hintOptions = hintOptions.map(option => ({
        name: option.credentialHint.name,
        icon: getIconDataUrl(option.credentialHint),
        origin: utils.parseUrl(option.credentialHandler).hostname,
        hintOption: option
      }));
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
    await polyfill.loadOnce({
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
  this.credentialRequestOptions = operationState.input.credentialRequestOptions;
  this.loading = true;
  const promise = new Promise((resolve, reject) => {
    deferredCredentialOperation = {resolve, reject};
  });

  // show display
  await navigator.credentialMediator.show();

  await this.loadHints();
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

  await this.loadHints();
  this.loading = false;

  return promise;
}

function updateHandlerWindow(handlerWindow) {
  const container = handlerWindow.container;
  const operation = this.display === 'credentialRequest' ? 'request' : 'store';
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
