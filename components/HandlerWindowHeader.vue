<template>
  <div
    class="wrm-panel wrm-handler-header wrm-flex-row"
    style="user-select: none">
    <wrm-header-back-button
      class="wrm-flex-item"
      @click.native="back()" />
    <div class="wrm-flex-item-grow wrm-flex-column-stretch">
      <!-- div style="font-size: 14px; padding-bottom: 5px">
        {{header}}
      </div -->
      <wrm-origin-card
        style="padding-left: 10px"
        :origin="fields.wallet.origin"
        :manifest="fields.wallet.manifest" />
    </div>
    <wrm-header-close-button
      class="wrm-flex-item"
      @click.native="cancel()" />
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2021, Digital Bazaar, Inc.
 * All rights reserved.
 */
export default {
  name: 'HandlerWindowHeader',
  props: {
    origin: {
      type: String,
      required: true
    },
    relyingDomain: {
      type: String,
      required: true
    },
    relyingOrigin: {
      type: String,
      required: true
    },
    relyingOriginManifest: {
      type: Object,
      required: true
    },
    operation: {
      type: String,
      required: true
    },
    hint: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      iconSize: 32
    };
  },
  computed: {
    header() {
      return this.operation === 'request' ?
        'Sharing credentials from:' : 'Storing credentials in:';
    },
    repositoryLabel() {
      return this.operation === 'request' ?
        'Provider' : 'Storage Provider';
    },
    fields() {
      const relyingParty = {
        name: _getName({
          manifest: this.relyingOriginManfest,
          domain: this.relyingDomain
        }),
        domain: this.relyingDomain,
        origin: this.relyingOrigin,
        manifest: this.relyingOriginManifest
      };
      const wallet = {
        name: _getName({
          manifest: this.hint.manifest,
          domain: this.hint.host
        }),
        domain: this.hint.host,
        origin: this.hint.origin,
        manifest: this.hint.manifest
      };
      if(this.operation === 'request') {
        return {left: wallet, right: relyingParty, wallet, relyingParty};
      }
      return {left: relyingParty, right: wallet, wallet, relyingParty};
    }
  },
  methods: {
    back() {
      this.$emit('back');
    },
    cancel() {
      this.$emit('cancel');
    }
  }
};

function _getName({manifest, domain}) {
  if(!manifest) {
    return domain;
  }
  const {name, short_name} = manifest;
  return name || short_name || domain;
}

</script>

<style>
</style>
