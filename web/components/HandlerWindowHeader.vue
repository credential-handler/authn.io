<template>
  <div
    class="wrm-panel wrm-handler-header wrm-flex-row"
    style="user-select: none">
    <WrmHeaderBackButton
      class="wrm-flex-item"
      @click="back()" />
    <div class="wrm-flex-item-grow wrm-flex-column-stretch">
      <WrmOriginCard
        style="padding-left: 10px"
        :origin="wallet.origin"
        :manifest="wallet.manifest" />
    </div>
    <WrmHeaderCloseButton
      class="wrm-flex-item"
      @click="cancel()" />
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {
  WrmHeaderBackButton,
  WrmHeaderCloseButton,
  WrmOriginCard
} from 'vue-web-request-mediator';

export default {
  name: 'HandlerWindowHeader',
  components: {WrmHeaderBackButton, WrmHeaderCloseButton, WrmOriginCard},
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
