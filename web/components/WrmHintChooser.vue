<template>
  <div>
    <div
      v-if="display === 'list'"
      class="wrm-slide">
      <div
        class="wrm-heading"
        style="padding: 2px 0">
        Choose an option
      </div>
      <WrmHintList
        :hints="hints"
        :default-hint-icon="defaultHintIcon"
        :enable-remove-hint="enableRemoveHint"
        :cancel-remove-hint-timeout="cancelRemoveHintTimeout"
        :hint-removal-text="hintRemovalText"
        @remove="removeHint"
        @select="select" />
    </div>
    <div
      v-else-if="display === 'overview'"
      class="wrm-slide">
      <slot name="message" />
      <!-- confirm button ON and at least one choice-->
      <div
        v-if="confirmButton && hints.length > 0"
        @click="!confirming && (display = 'list')">
        <WrmHint
          :hint="selectedHint || hints[0]"
          :default-icon="defaultHintIcon"
          :active="confirming"
          :selected="false"
          :selectable="true"
          :disabled="false" />
      </div>
      <!-- confirm button OFF; selection integrated -->
      <div
        v-else-if="!confirmButton && hints.length > 0"
        class="wrm-flex-column-stretch">
        <WrmHintList
          :hints="hints"
          :default-hint-icon="defaultHintIcon"
          :enable-remove-hint="enableRemoveHint"
          :cancel-remove-hint-timeout="cancelRemoveHintTimeout"
          :hint-removal-text="hintRemovalText"
          activate-on-select
          @remove="removeHint"
          @select="confirm" />
      </div>
      <slot name="hint-list-footer" />
      <div
        v-if="confirmButton"
        class="wrm-button-bar"
        style="margin-top: 10px">
        <button
          type="button"
          class="wrm-button"
          :disabled="confirming"
          @click="onCancel()">
          Cancel
        </button>
        <button
          type="button"
          class="wrm-button wrm-primary"
          style="margin-left: 5px"
          :disabled="confirming || hints.length === 0"
          @click="confirm({hint: selectedHint, waitUntil: () => {}})">
          {{confirmButtonText}}
        </button>
      </div>
      <slot name="footer" />
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {onBeforeUnmount, onMounted, ref, toRef} from 'vue';
import WrmHint from './WrmHint.vue';
import WrmHintList from './WrmHintList.vue';

export default {
  name: 'WrmHintChooser',
  components: {WrmHint, WrmHintList},
  props: {
    hints: {
      type: Array,
      required: true
    },
    defaultHintIcon: {
      type: String,
      required: true
    },
    enableRemoveHint: {
      type: Boolean,
      default: false
    },
    cancelRemoveHintTimeout: {
      type: Number,
      // 5 seconds to cancel remove hint by default
      default: 5000
    },
    hintRemovalText: {
      type: String,
      default: 'Hiding...'
    },
    confirmButton: {
      type: Boolean,
      default: false
    },
    confirmButtonText: {
      type: String,
      default: 'Confirm'
    }
  },
  emits: ['cancel', 'confirm', 'remove-hint'],
  setup(props, {emit}) {
    const display = ref('overview');
    const confirming = ref(false);
    const selectedHint = ref(null);

    const hints = toRef(props, 'hints');
    const confirmButton = toRef(props, 'confirmButton');

    let _resolve;

    const onCancel = () => {
      if(confirming.value) {
        _resolve();
        confirming.value = false;
      }
      emit('cancel');
    };
    // FIXME: consider using vue-extendable-event
    const onConfirm = async hint => {
      let promise = Promise.resolve();
      emit('confirm', {
        hint,
        waitUntil: p => promise = p
      });
      return promise;
    };
    const onRemoveHint = async hint => {
      let promise = Promise.resolve();
      emit('remove-hint', {
        hint,
        waitUntil: p => promise = p
      });
      return promise;
    };

    // FIXME: methods
    const close = () => {
      if(display.value === 'list') {
        display.value = 'overview';
        return;
      }
      onCancel();
    };
    const select = event => {
      selectedHint.value = event.hint;
      display.value = 'overview';
    };
    const confirm = async event => {
      const promise = new Promise(r => _resolve = r);
      event.waitUntil(promise);

      selectedHint.value = event.hint;
      confirming.value = true;

      try {
        // wait for selection to be handled
        await onConfirm(event.hint);
      } catch(e) {
        console.error(e);
      }

      // ensure still confirming and not canceled
      if(confirming.value) {
        if(!confirmButton.value) {
          selectedHint.value = null;
        } else {
          selectedHint.value = hints.value[0] || null;
        }
        confirming.value = false;

        _resolve();
      }
    };
    const removeHint = async event => {
      const promise = new Promise(r => _resolve = r);
      event.waitUntil(promise);

      confirming.value = true;

      try {
        // wait for remove to be handled
        await onRemoveHint(event.hint);
      } catch(e) {
        console.error(e);
      }

      confirming.value = false;
      _resolve();
    };

    let listener;

    onMounted(() => {
      listener = event => {
        if(!confirming.value && event.key === 'Escape') {
          event.preventDefault();
          close();
        }
      };
      document.addEventListener('keydown', listener);
    });

    onBeforeUnmount(() => {
      document.removeEventListener('keydown', listener);
    });

    return {
      confirming, display, selectedHint,
      onCancel, confirm, removeHint, select
    };
  }
};
</script>

<style>
</style>
