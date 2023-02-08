<template>
  <div
    class="wrm-panel wrm-handler-header wrm-flex-row"
    style="user-select: none">
    <wrm-header-back-button
      class="wrm-flex-item"
      @click.native="back()" />
    <div class="wrm-flex-item-grow wrm-flex-column-stretch">
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
    hint: {
      type: Object,
      required: true
    }
  },
  computed: {
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
