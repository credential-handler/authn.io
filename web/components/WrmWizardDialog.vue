<template>
  <div class="wrm-modal">
    <div class="wrm-modal-content wrm-modern">
      <div class="wrm-flex-row wrm-modal-content-header wrm-modern">
        <WrmHeaderBackButton
          v-if="!first && !hideBackButton"
          @click="onBack()" />
        <div
          class="wrm-flex-item-grow"
          style="padding: 0 15px; overflow: hidden;">
          <slot name="header" />
        </div>
        <WrmHeaderCloseButton
          v-if="!hideCancelButton"
          ref="close"
          @click="onCancel()" />
      </div>
      <div>
        <slot name="body" />
      </div>
      <slot name="footer">
        <!-- div class="wrm-separator"></div -->
        <div
          class="wrm-button-bar"
          style="margin-top: 10px">
          <button
            type="button"
            class="wrm-button"
            :disabled="loading"
            @click="onCancel()">
            Cancel
          </button>
          <button
            v-if="hasNext"
            ref="next"
            type="button"
            class="wrm-button wrm-primary"
            style="margin-left: 5px"
            :disabled="loading || blocked"
            @click="onNext()">
            Next
          </button>
          <button
            v-else
            ref="finish"
            type="button"
            class="wrm-button wrm-primary"
            style="margin-left: 5px"
            :disabled="loading || blocked"
            @click="onFinish()">
            Finish
          </button>
        </div>
      </slot>
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019-2026 Digital Bazaar, Inc.
 */
import {onBeforeUnmount, onMounted, ref} from 'vue';
import WrmHeaderBackButton from './WrmHeaderBackButton.vue';
import WrmHeaderCloseButton from './WrmHeaderCloseButton.vue';

export default {
  name: 'WrmWizardDialog',
  components: {WrmHeaderBackButton, WrmHeaderCloseButton},
  props: {
    loading: {
      type: Boolean,
      required: true
    },
    first: {
      type: Boolean,
      required: true
    },
    hasNext: {
      type: Boolean,
      required: true
    },
    hideBackButton: {
      type: Boolean,
      default: false
    },
    hideCancelButton: {
      type: Boolean,
      default: false
    },
    blocked: {
      type: Boolean,
      required: true
    }
  },
  emits: ['cancel', 'next', 'back', 'finish'],
  setup(props, {emit}) {
    const close = ref(null);
    const finish = ref(null);
    const next = ref(null);

    const onCancel = () => emit('cancel');
    const onNext = () => emit('next');
    const onBack = () => emit('back');
    const onFinish = () => emit('finish');

    let listener;

    onMounted(() => {
      listener = event => {
        if(event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      };
      document.addEventListener('keydown', listener);

      // focus on a button to allow `Escape` to function properly
      const button = next.value || finish.value || close.value;
      button?.focus?.();
    });
    onBeforeUnmount(() => {
      document.removeEventListener('keydown', listener);
    });

    return {close, finish, next, onCancel, onNext, onBack, onFinish};
  }
};
</script>

<style>
</style>
