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
import {computed, toRef} from 'vue';
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
  emits: ['back', 'cancel'],
  setup(props, {emit}) {
    const hint = toRef(props, 'hint');
    const wallet = computed(() => {
      return {
        name: _getName(hint.value),
        origin: hint.value.origin,
        manifest: hint.value.manifest
      };
    });
    const back = () => emit('back');
    const cancel = () => emit('cancel');
    return {wallet, back, cancel};
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
