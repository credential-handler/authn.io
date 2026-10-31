<template>
  <div class="wrm-flex-row">
    <WrmOriginIcon
      :icon-size="iconSize"
      :origin="origin"
      :manifest="manifest"
      style="padding-right: 10px" />
    <div class="wrm-flex-item-grow wrm-ellipsis">
      <WrmOriginName
        v-if="manifest"
        :origin="origin"
        :manifest="manifest"
        class="wrm-flex-item-grow"
        style="padding-bottom: 2px; font-size: 14px">
        <template #task>
          <slot name="task" />
        </template>
      </WrmOriginName>
      <WrmOrigin :origin="origin" />
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import WrmOrigin from './WrmOrigin.vue';
import WrmOriginIcon from './WrmOriginIcon.vue';
import WrmOriginName from './WrmOriginName.vue';

export default {
  name: 'WrmOriginCard',
  components: {WrmOrigin, WrmOriginIcon, WrmOriginName},
  props: {
    iconSize: {
      type: Number,
      required: false,
      default: () => 48
    },
    origin: {
      type: String,
      required: true
    },
    manifest: {
      type: Object,
      required: false,
      default: null
    }
  }
};
</script>

<style>
</style>
