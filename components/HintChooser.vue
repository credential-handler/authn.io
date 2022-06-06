<template>
  <div>
    <h1>
      Hint Chooser
    </h1>
    <wrm-wizard-dialog
      :loading="loading"
      :first="showGreeting"
      :has-next="showGreeting || !hasStorageAccess"
      :blocked="loading || (!showGreeting && !selectedHint)"
      @cancel="cancel()"
      @next="nextWizardStep()"
      @back="prevWizardStep()">
      <template slot="header">
        <div style="font-size: 18px; font-weight: bold; user-select: none">
          <div style="margin-left: -10px">
            <span v-if="selectedHint">Loading Wallet...
              <i class="fas fa-cog fa-spin" />
            </span>
            <span v-else>Choose a Wallet</span>
          </div>
        </div>
      </template>
      <template slot="body">
        <wrm-hint-chooser
          v-if="showHintChooser"
          style="user-select: none"
          :hints="hintOptions"
          :cancel-remove-hint-timeout="5000"
          :hint-removal-text="hintRemovalText"
          default-hint-icon="fas fa-wallet"
          enable-remove-hint
          @remove-hint="removeHint"
          @confirm="selectHint"
          @cancel="cancel()">
          <template slot="message">
            <div style="padding-top: 10px">
              <div v-if="loading">
                Loading options... <i class="fas fa-cog fa-spin" />
              </div>
              <div
                v-else-if="hintOptions.length === 0"
                style="font-size: 14px">
                <div style="font-weight: bold">
                  Warning
                </div>
                <div v-if="display === 'credentialRequest'">
                  <p>
                    You don't have the credentials requested by this website.
                    Please check <strong>{{relyingOriginName}}</strong> to find
                    out how to obtain the credentials you need to continue.
                  </p>
                  <p>
                    It may also be that your browser has unregistered your
                    credential wallet. This does not mean your credentials have
                    been removed or lost. Please simply visit your credential
                    wallet website to register again.
                  </p>
                </div>
                <div v-else>
                  <p>
                    You don't have a credential wallet to store credentials or
                    your browser has recently unregistered your wallet. This
                    does not mean your credentials have been removed or lost.
                    Please simply visit your credential wallet website to
                    register again.
                  </p>
                </div>
                <div
                  class="wrm-button-bar"
                  style="margin-top: 10px">
                  <button
                    type="button"
                    class="wrm-button wrm-primary"
                    :disabled="loading"
                    @click="cancel()">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </template>
          <template
            v-if="hintOptions.length > 0"
            slot="hint-list-footer">
            <div
              style="margin: 10px -15px 0px -15px; padding: 15px 15px 0px 15px;"
              class="wrm-separator wrm-modern">
              <wrm-checkbox
                v-model="rememberChoice"
                checkbox-class="wrm-blue"
                checkbox-style="font-size: 14px"
                label="Remember my choice for this site"
                label-class="wrm-dark-gray" />
            </div>
            <div
              class="wrm-button-bar"
              style="margin: auto; padding-top: 2em;">
              <button
                type="button"
                class="wrm-button wrm-primary"
                style="margin: auto"
                :disabled="loading"
                @click="webShare()">
                Share with Native App
              </button>
            </div>
          </template>
        </wrm-hint-chooser>
        <div
          v-else-if="selectedHint"
          style="padding-top: 15px">
          <wrm-hint
            :hint="selectedHint"
            default-icon="fas fa-wallet"
            :active="true"
            :selected="true"
            :selectable="false"
            :disabled="true" />
        </div>
      </template>
      <template
        v-if="!showGreeting"
        slot="footer">
        <div />
      </template>
    </wrm-wizard-dialog>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2022, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {getSiteChoice, hasSiteChoice, setSiteChoice} from './siteChoice.js';
import * as helpers from './helpers.js';
import {getWebAppManifest} from './manifest.js';
import {hasStorageAccess, requestStorageAccess} from 'web-request-mediator';
import * as rpc from 'web-request-rpc';

const PROXY_EVENT_TIMEOUT = 60000;

class CredentialEventProxy {
  constructor() {
    this.receivePromise = null;
  }

  createServiceDescription() {
    let serviceDescription;
    // this promise resolves once the event is received
    this.receivePromise = new Promise((resolveReceive, rejectReceive) => {
      const timeoutId = setTimeout(() => {
        rejectReceive(new Error('Timed out waiting to receive event.'));
      }, PROXY_EVENT_TIMEOUT);

      serviceDescription = {
        credentialEventProxy: {
          // called by credential handler to send event to UI window
          async send(event) {
            // event received, clear timeout
            resolveReceive(event);
            clearTimeout(timeoutId);

            // this promise resolves when the promise that the UI passes
            // to `event.respondWith` resolves
            return new Promise((resolveSend, rejectSend) => {
              event.respondWith = promise => {
                try {
                  resolveSend(promise);
                } catch(e) {
                  rejectSend(e);
                }
              };
            });
          }
        }
      };
    });

    return serviceDescription;
  }

  async receive() {
    return this.receivePromise;
  }
}

export default {
  name: 'HintChooser',
  data() {
    return {
      rememberChoice: true,
      display: null,
      event: null,
      hasStorageAccess: false,
      hideWizard: false,
      hintOptions: [],
      hintRemovalText: 'Hiding...',
      loading: false,
      permissions: [{
        name: 'Manage credentials',
        icon: 'fas fa-id-card'
      }],
      relyingDomain: null,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null,
      showHintChooser: false,
      showGreeting: false,
      showPermissionDialog: false
    };
  },
  computed: {
    relyingOriginName() {
      if(!this.relyingOriginManifest) {
        return this.relyingDomain;
      }
      const {name, short_name} = this.relyingOriginManifest;
      return name || short_name || this.relyingDomain;
    }
  },
  async created() {
    this._setup().catch(console.error);
  },
  methods: {
    async _setup() {
      this.loading = true;
      const {origin, host} = helpers.parseUrl({url: document.referrer});
      this.relyingOrigin = origin;
      this.relyingDomain = host;

      // TODO: is this the appropriate place to run this?
      const proxy = new CredentialEventProxy();
      const rpcServices = proxy.createServiceDescription();
      console.log('before loading polyfill');
      await helpers.loadPolyfill(this, rpcServices);
      // await activateHandler({mediatorOrigin: window.location.origin});

      const event = this.event = await proxy.receive();
      console.log('here too', event);
      this.credential = event.credential;
      this.credentialRequestOptions = event.credentialRequestOptions;
      this.showHintChooser = true;

      // attempt to load web app manifest icon
      const manifest = await getWebAppManifest({host: this.relyingDomain});
      this.relyingOriginManifest = manifest;

      await this.loadHints();
      // event.respondWith({choice: 'my wallet'});
      // const mustLoadHints = !this.hasStorageAccess;
      // always call `requestStorageAccess` to refresh mediator's
      // user interaction timestamp
      // this.hasStorageAccess = await requestStorageAccess();
      // if(this.hasStorageAccess) {
      //   if(mustLoadHints) {
      //   }
      //   this.useRememberedHint();
      // }
      this.showGreeting = false;
      this.loading = false;
    },
    async allow() {
      this.hasStorageAccess = await requestStorageAccess();
      if(this.hasStorageAccess) {
        const resolvePermissionRequest = helpers.getResolvePermissinoRequest();
        resolvePermissionRequest('granted');
        this.reset();
        await navigator.credentialMediator.hide();
        return;
      }

      // must go through wizard
      this.showPermissionDialog = false;
    },
    async deny() {
      await requestStorageAccess();
      const resolvePermissionRequest = helpers.getResolvePermissinoRequest();
      resolvePermissionRequest('denied');
      this.reset();
      await navigator.credentialMediator.hide();
    },
    async cancelSelection() {
      this.hideWizard = false;
      await navigator.credentialMediator.ui.cancelSelectCredentialHint();
    },
    async cancel() {
      if(this.selectedHint) {
        await this.cancelSelection();
      }
      this.reset();
      const deferredCredentialOperation =
        helpers.getDeferredCredentialOperation();
      deferredCredentialOperation.resolve(null);
      await navigator.credentialMediator.hide();
    },
    async webShare() {
      const {credential, relyingOrigin: credentialRequestOrigin} = this;
      const {data} = helpers.createWebShareData({
        credential, credentialRequestOrigin
      });

      // Check if WebShare API with files is supported
      await helpers.webShareHasFileSupport({data});

      return false;
    },
    async nextWizardStep() {
      this.loading = true;
      const mustLoadHints = !this.hasStorageAccess;
      // always call `requestStorageAccess` to refresh mediator's
      // user interaction timestamp
      this.hasStorageAccess = await requestStorageAccess();
      if(this.hasStorageAccess) {
        if(mustLoadHints) {
          await this.loadHints();
        }
        this.useRememberedHint();
      }
      this.showGreeting = false;
      this.loading = false;
      console.log(window.location.href);
    },
    async prevWizardStep() {
      this.showGreeting = true;
      if(this.selectedHint) {
        await this.cancelSelection();
      }
    },
    async finishAntiTrackingWizard() {
      this.loading = true;
      this.hasStorageAccess = await requestStorageAccess();
      if(this.display === 'permissionRequest') {
        if(this.hasStorageAccess) {
          await this.allow();
        } else {
          await this.deny();
        }
      } else {
        if(this.hasStorageAccess) {
          await this.loadHints();
          this.useRememberedHint();
        } else {
          // can't get access for some reason, show hint chooser w/no hints
          this.showHintChooser = true;
        }
      }
      this.loading = false;
    },
    async loadHints() {
      console.log('loadHints');
      let hintOptions;
      let recommendedHandlerOrigins;
      if(this.credentialRequestOptions) {
        // get matching hints from request options
        hintOptions = await navigator.credentialMediator.ui
          .matchCredentialRequest(this.credentialRequestOptions);
        ({web: {recommendedHandlerOrigins = []}} =
          this.credentialRequestOptions);
      } else {
        // must be a storage request, get hints that match credential
        hintOptions = await navigator.credentialMediator.ui
          .matchCredential(this.credential);
        ({options: {recommendedHandlerOrigins = []} = {}} = this.credential);
      }

      // no available hints, check for recommended options
      if(hintOptions.length === 0 && Array.isArray(recommendedHandlerOrigins)) {
        // get relevant types to match against handler
        let types = [];
        if(this.credentialRequestOptions) {
          // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`
          types = Object.keys(this.credentialRequestOptions.web)
            .filter(k => k[0] === k.toUpperCase()[0]);
        } else {
          types.push(this.credential.dataType);
        }

        // maximum of 3 recommended handlers
        const {
          relyingOriginName, relyingOrigin, relyingOriginManifest,
          relyingDomain
        } = this;
        recommendedHandlerOrigins = recommendedHandlerOrigins.slice(0, 3);
        const jitHints = (await helpers.createJitHints({
          recommendedHandlerOrigins, types, relyingOriginName, relyingOrigin,
          relyingOriginManifest, relyingDomain
        })).filter(e => !!e);
        this.hintOptions = jitHints;
        return;
      }

      // get unique credential handlers
      const handlers = [...new Set(hintOptions.map(
        ({credentialHandler}) => credentialHandler))];
      // create hints for each unique origin
      this.hintOptions = await helpers.createHintOptions({handlers});
    },
    useRememberedHint({hideWizard = false, showHintChooser = true} = {}) {
      // check to see if there is a reusable choice for the relying party
      const {hintOptions, relyingOrigin} = this;
      const hint = getSiteChoice({relyingOrigin, hintOptions});
      if(false) {
      // if(hint) {
        this.showGreeting = false;
        this.hideWizard = hideWizard;
        this.rememberChoice = true;
        this.selectHint({
          hint,
          waitUntil() {}
        });
      } else {
        this.showHintChooser = showHintChooser;
      }
    },
    async removeHint(event) {
      console.log('remove hint', event);
      const {hint} = event;
      const idx = this.hintOptions.indexOf(hint);
      this.hintOptions.splice(idx, 1);
      if(this.hintOptions.length === 0) {
        this.loading = true;
      }
      await navigator.credentialMediator.ui.unregisterCredentialHandler(
        hint.hintOption.credentialHandler);
      if(this.hintOptions.length === 0) {
        // load hints again to use recommended handler origins if present
        // and include a slight delay to avoid flash of content
        await new Promise(r => setTimeout(r, 1000));
        await this.loadHints();
        this.loading = false;
      }
    },
    async selectHint(e) {
      console.log('selected hint', e);
      console.log('event to respond to', this.event);
      this.event.respondWith({choice: {hint: e.hint}});
      return;
    },
    reset() {
      this.display = null;
      this.credentialRequestOptions = this.credential = null;
      this.hasStorageAccess = false;
      this.hideWizard = false;
      this.hintOptions = [];
      this.loading = false;
      this.rememberChoice = true;
      this.selectedHint = null;
      this.showHintChooser = false;
      this.showGreeting = false;
      this.showPermissionDialog = false;
    }
  }
};

class HintSelectorHandler extends rpc.WebApp {
  constructor(mediatorOrigin) {
    if(typeof mediatorOrigin !== 'string') {
      throw new TypeError('"mediatorOrigin" must be a string.');
    }
    super(mediatorOrigin);
  }

  async connect() {
    const injector = await super.connect();

    // define API that HintSelector can call on this hint selector handler
    this.server.define('hintSelectorHandler', {
      async receiveEvent({event}) {
        console.log(event);
        return;
      }
    });

    // auto-call `ready`
    await this.ready();

    return injector;
  }
}

const DEFAULT_MEDIATOR = 'https://authn.io';

/**
 * Emulates activating a service worker.
 *
 * @param {string} [mediatorOrigin=DEFAULT_MEDIATOR]
 * @returns {Promise}
 */
export async function activateHandler({mediatorOrigin = DEFAULT_MEDIATOR}) {
  const self = new HintSelectorHandler(mediatorOrigin);

  // if(typeof selectHint !== 'function') {
  //   throw new TypeError('"selectHint" must be a function.');
  // }

  // eslint-disable-next-line max-len
  // self.addEventListener('selectcredentialhint', event => listener({event, selectHint}));
  console.log({self});
  await self.connect();
}

</script>

<style>
</style>
