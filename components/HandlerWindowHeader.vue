<template>
  <div
    class="wrm-panel wrm-handler-header wrm-flex-row">
    <div
      v-if="!showDetails"
      class="wrm-flex-item-grow wrm-flex-column-stretch"
      @click="showDetails=!showDetails">
      <div
        style="font-size: 11px; font-weight: bold; text-align: center;
          padding-bottom: 2px">
        {{header}}
      </div>
      <div
        class="wrm-flex-row wrm-flex-item-grow"
        style="align-items: stretch">
        <div
          class="wrm-flex-item wrm-flex-column wrm-ellipsis"
          style="font-size: 11px; width: 150px">
          <wrm-origin-icon
            class="wrm-flex-item-grow"
            :icon-size="iconSize"
            :origin="fields.left.origin"
            :manifest="fields.left.manifest" />
          <wrm-origin
            :origin="fields.left.origin"
            style="max-width: 100%" />
        </div>
        <div
          class="wrm-flex-item wrm-flex-column"
          style="justify-content: center; overflow: hidden">
          <i
            class="fas fa-arrow-right"
            style="font-size: 20px; padding: 0 15px"></i>
        </div>
        <div
          class="wrm-flex-item wrm-flex-column wrm-ellipsis"
          style="font-size: 11px; width: 150px">
          <wrm-origin-icon
            class="wrm-flex-item-grow"
            :icon-size="iconSize"
            :origin="fields.right.origin"
            :manifest="fields.right.manifest" />
          <wrm-origin
            :origin="fields.right.origin"
            style="max-width: 100%" />
        </div>
      </div>
    </div>
    <div
      v-else
      class="wrm-flex-column-stretch wrm-ellipsis"
      style="width: 100%; padding-left: 5px"
      @click="showDetails=!showDetails">
      <div style="font-weight: bold">
        Credential {{repositoryLabel}}:
      </div>
      <wrm-origin
        class="wrm-flex-item-grow"
        style="margin-bottom: 10px"
        :origin="fields.wallet.origin" />
      <div style="font-weight: bold">
        Website:
      </div>
      <wrm-origin
        class="wrm-flex-item-grow"
        :origin="fields.relyingParty.origin" />
    </div>
    <wrm-header-close-button class="wrm-flex-item" @click.native="cancel()" />
  </div>
</template>
<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
'use strict';

export default {
  name: 'HandlerWindowHeader',
  data() {
    return {
      showDetails: false,
      iconSize: 48
    };
  },
  computed: {
    header() {
      return this.operation === 'request' ?
        'Send credentials?' : 'Store credentials?';
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
  methods: {
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
