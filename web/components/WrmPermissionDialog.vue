<template>
  <div class="wrm-modal">
    <div class="wrm-modal-content">
      <WrmCloseButton @click="onDeny()" />
      <div style="margin-right: 10px">
        <strong>{{origin}}</strong> wants to
      </div>
      <div style="padding-top: 15px" />
      <div
        v-for="permission in permissions"
        :key="permission.name">
        <i :class="permission.icon" /> {{permission.name}}
      </div>
      <br>
      <div
        class="wrm-button-bar"
        style="margin-top: 10px">
        <button
          type="button"
          class="wrm-button"
          @click="onDeny()">
          Block
        </button>
        <span style="margin-right: 5px" />
        <button
          type="button"
          class="wrm-button"
          @click="onAllow()">
          Allow
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {onBeforeUnmount, onMounted} from 'vue';
import WrmCloseButton from './WrmCloseButton.vue';

export default {
  name: 'WrmPermissionDialog',
  components: {WrmCloseButton},
  props: {
    origin: {
      type: String,
      required: true
    },
    permissions: {
      type: Array,
      required: true
    }
  },
  emits: ['allow', 'deny'],
  setup(props, {emit}) {
    const onAllow = () => emit('allow');
    const onDeny = () => emit('deny');

    let listener;

    onMounted(() => {
      listener = event => {
        if(event.key === 'Escape') {
          event.preventDefault();
          onDeny();
        }
      };
      document.addEventListener('keydown', listener);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', listener);
    });

    return {onAllow, onDeny};
  }
};
</script>

<style>
</style>
