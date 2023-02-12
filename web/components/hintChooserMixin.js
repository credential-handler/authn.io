/*!
* Copyright (c) 2022-2023 Digital Bazaar, Inc. All rights reserved.
*/
import {getDeferredCredentialOperation} from '../mediatorPolyfill.js';
import {
  createWebShareData,
  loadHints as _loadHints,
  getOriginName, webShareHasFileSupport
} from '../helpers.js';

// FIXME: move most / all of this to Mediator.js
export const hintChooserMixin = {
  data() {
    return {
      credential: null,
      credentialRequestOptions: null,
      display: null,
      hintOptions: [],
      hintRemovalText: 'Hiding...',
      loading: false,
      relyingOrigin: null,
      relyingOriginManifest: null,
      selectedHint: null,
      showHintChooser: false
    };
  },
  computed: {
    relyingOriginName() {
      const {relyingOriginManifest: manifest, relyingOrigin: origin} = this;
      return getOriginName({origin, manifest});
    }
  },
  methods: {
    // FIXME: remove
    async cancel() {
      if(this._mediator) {
        return this._mediator.cancel();
      }
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
    // FIXME: remove
    async cancelSelection() {
      if(this._mediator) {
        return this._mediator.cancelSelection();
      }
      await navigator.credentialMediator.ui.cancelSelectCredentialHint();
    },
    async loadHints() {
      const {
        credentialRequestOptions, credential,
        relyingOrigin, relyingOriginManifest
      } = this;
      const hintOptions = await _loadHints({
        credentialRequestOptions, credential,
        relyingOrigin, relyingOriginManifest
      });
      this.hintOptions = hintOptions;
    },
    // FIXME: move to Mediator.js
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
      const {
        credential,
        credentialRequestOptions,
        relyingOrigin: credentialRequestOrigin
      } = this;
      const {data} = createWebShareData({
        credential,
        credentialRequestOptions,
        credentialRequestOrigin
      });

      // Check if WebShare API with files is supported
      await webShareHasFileSupport({data});

      return false;
    }
  }
};
