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
        :origin="wallet.origin"
        :manifest="wallet.manifest" />
    </div>
    <wrm-header-close-button
      class="wrm-flex-item"
      @click.native="cancel()" />
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
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
    wallet() {
      return {
        name: _getName(this.hint),
        origin: this.hint.origin,
        manifest: this.hint.manifest
      };
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

function _getName(hint) {
  const {manifest, host} = hint;
  if(!manifest) {
    return host;
  }
  const {name, short_name} = manifest;
  return name || short_name || host;
}

</script>

<style>
</style>
