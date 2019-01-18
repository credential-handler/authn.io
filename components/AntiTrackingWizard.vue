<template>
  <div>
    <div style="font-size: 14px">
      <p>
        It looks like you haven't authorized interacting with your credential
        wallet in a while.
      </p>

      <p v-if="firstPartyVisited">
        Please click "Finish" to view your credential wallet.
      </p>
      <p v-else="firstPartyVisited">
        Please click "Next" to open the authorization window.
      </p>

      <p v-if="awaitingAuthorization">
        Awaiting authorization... <i class="fas fa-cog fa-spin"></i>
      </p>
    </div>

    <p>
      <a @click="explainer=!explainer" class="wrm-heading"
        style="cursor: pointer">What's going on?</a>
    </p>

    <div v-if="explainer" style="font-size: 12px">
      <p>
        This browser uses anti-tracker technology to help prevent advertisers
        from tracking you online. Unfortunately, this feature can interfere
        with using your credential wallet because your browser does not yet
        have built-in support for managing credential wallets.
      </p>

      <p>
        To continue using this anti-tracking feature and enable you to interact
        with your credential wallet, you must give consent. This is done by
        opening a window to the credential wallet management website that is
        providing this feature for your browser. Note that this consent does
        not share any of the contents of your wallet; it only enables you to
        interact with your wallet to fulfill requests from other websites.
      </p>

      <p>
        Alternatively, you may use another browser that has better support for
        sharing credentials online.
      </p>

      <div style="font-size: 12px">
        <p>
          <div>
          For more information, see:
          </div>
          <a target="_blank" class="wrm-heading"
            style="cursor: pointer; text-decoration: none"
            href="https://webkit.org/blog/8311/intelligent-tracking-prevention-2-0/"
            >https://webkit.org/blog/8311/intelligent-tracking-prevention-2-0/</a>
        </p>
      </div>
    </div>

    <div class="wrm-button-bar" style="margin-top: 10px">
      <button type="button" class="wrm-button"
        @click="onCancel()">
        Cancel
      </button>
      <button type="button" class="wrm-button wrm-primary"
        style="margin-left: 5px"
        @click="onNext($event)">
        <span v-if="!firstPartyVisited">Next</span>
        <span v-else>Finish</span>
      </button>
    </div>

  </div>
</template>
<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019, Digital Bazaar, Inc.
 * All rights reserved.
 */
'use strict';

export default {
  name: 'AntiTrackingWizard',
  data() {
    return {
      awaitingAuthorization: false,
      firstPartyVisited: false,
      explainer: false
    };
  },
  methods: {
    onCancel() {
      this.$emit('cancel');
    },
    onNext(event) {
      if(this.firstPartyVisited) {
        this.$emit('finish');
      } else {
        this.openFirstPartyWindow(event);
      }
    },
    async openFirstPartyWindow(event) {
      this.awaitingAuthorization = true;
      const url = `${window.location.origin}/allow-wallet-access`;
      const width = 500;
      const height = 120;
      const left = event.screenX - (width / 2);
      const top = event.screenY - (height / 2);
      const features =
        'menubar=no,location=no,resizable=no,scrollbars=no,status=no,' +
        `width=${width},height=${height},left=${left},top=${top}`;
      const handle = window.open(url, 'allow-wallet-access', features);
      handle.addEventListener('load', () => {
        handle.addEventListener('unload', () => {
          this.firstPartyVisited = true;
          this.awaitingAuthorization = false;
        });
      });
    }
  }
};
</script>
<style>
</style>
