/*!
* Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
*/
import {getDeferredCredentialOperation} from './mediatorPolyfill.js';
import {
  createJitHints, createHintOptions, createWebShareData,
  webShareHasFileSupport
} from './helpers.js';

export const hintChooserMixin = {
  data() {
    return {
      credential: null,
      credentialRequestOptions: null,
      display: null,
      hintOptions: [],
      hintRemovalText: 'Hiding...',
      loading: false,
      relyingDomain: null,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null,
      showHintChooser: false
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
  methods: {
    async cancel() {
      if(this.selectedHint) {
        await this.cancelSelection();
      }
      this.reset();
      const deferredCredentialOperation = getDeferredCredentialOperation();
      if(deferredCredentialOperation) {
        deferredCredentialOperation.resolve(null);
      }
      await navigator.credentialMediator.hide();
    },
    async cancelSelection() {
      await navigator.credentialMediator.ui.cancelSelectCredentialHint();
    },
    async loadHints() {
      let hintOptions;
      let recommendedHandlerOrigins;
      if(this.credentialRequestOptions) {
        // get matching hints from request options
        hintOptions = await navigator.credentialMediator.ui
          .matchCredentialRequest(this.credentialRequestOptions);
        ({web: {recommendedHandlerOrigins = []}} =
          this.credentialRequestOptions);
      } else if(this.credential) {
        // get hints that match credential
        const {credential} = this;
        hintOptions = await navigator.credentialMediator.ui
          .matchCredential(credential);
        ({options: {recommendedHandlerOrigins = []} = {}} = credential);
      }

      if(!(this.credentialRequestOptions || this.credential)) {
        // hints loaded asynchronously during a reset; return early
        return;
      }

      const {
        credential, credentialRequestOptions,
        relyingOrigin: credentialRequestOrigin
      } = this;

      // get unique credential handlers
      const handlers = [...new Set(hintOptions.map(
        ({credentialHandler}) => credentialHandler))];
      const hintOptionsPromise = createHintOptions({handlers});

      // add any recommended options
      let jitHints = [];
      if(Array.isArray(recommendedHandlerOrigins)) {
        // filter out any handlers that are already in `hintOptions`
        recommendedHandlerOrigins = recommendedHandlerOrigins.filter(
          // if credential handler URL starts with a recommended
          // handler origin, skip it
          url => !handlers.some(h => h.startsWith(url)));
        if(recommendedHandlerOrigins.length > 0) {
          // get relevant types to match against handler
          let types = [];
          if(credentialRequestOptions) {
            // types are all capitalized `{web: {Type1, Type2, ..., TypeN}}`
            types = Object.keys(credentialRequestOptions.web)
              .filter(k => k[0] === k.toUpperCase()[0]);
          } else {
            types.push(credential.dataType);
          }

          // use a maximum of 3 recommended handlers
          recommendedHandlerOrigins = recommendedHandlerOrigins.slice(0, 3);
          const {
            relyingOriginName, relyingOrigin, relyingOriginManifest,
            relyingDomain
          } = this;
          jitHints = (await createJitHints({
            recommendedHandlerOrigins, types, relyingOriginName, relyingOrigin,
            relyingOriginManifest, relyingDomain
          })).filter(e => !!e);
        }
      }

      hintOptions = await hintOptionsPromise;
      hintOptions.push(...jitHints);

      // see if native web share support is available
      /*if(credential) {
        const {data} = createWebShareData(
          {credential, credentialRequestOrigin});
        if(canWebShare({data})) {
          this._webShareData = data;
          // FIXME: add hint option that will call navigator.share when it
          // is selected; remove primary "Share with Native App" button
        }
      }*/

      this.hintOptions = hintOptions;
    },
    async removeHint(event) {
      const {hint} = event;
      const idx = this.hintOptions.indexOf(hint);
      this.hintOptions.splice(idx, 1);
      if(this.hintOptions.length === 0) {
        this.loading = true;
      }
      try {
        await navigator.credentialMediator.ui.unregisterCredentialHandler(
          hint.hintOption.credentialHandler);
        if(this.hintOptions.length === 0) {
          // load hints again to use recommended handler origins if present
          // and include a slight delay to avoid flash of content
          await new Promise(r => setTimeout(r, 1000));
          await this.loadHints();
        }
      } catch(e) {
        console.error(e);
      } finally {
        this.loading = false;
      }
    },
    reset() {
      this.credentialRequestOptions = this.credential = null;
      this.display = null;
      this.hintOptions = [];
      this.loading = false;
      this.selectedHint = null;
      this.showHintChooser = false;
    },
    async webShare() {
      const {credential, relyingOrigin: credentialRequestOrigin} = this;
      const {data} = createWebShareData({
        credential, credentialRequestOrigin
      });

      // Check if WebShare API with files is supported
      await webShareHasFileSupport({data});

      return false;
    }
  }
};
