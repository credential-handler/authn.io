<template>
  <div
    :class="buttonClass"
    @click="!disabled && clicked()">
    <div>
      <svg :class="anyDisabled ? 'wrm-disabled' : ''">
        <circle
          cx="14"
          cy="14"
          r="14" />
        <text
          x="7"
          y="19">{{icon}}</text>
      </svg>
    </div>
    <div style="float: none; font-size: 10px; text-align: center">
      {{iconText}}
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2021-2026 Digital Bazaar, Inc.
 */
import {computed, ref, toRef} from 'vue';

export default {
  name: 'WrmRemoveButton',
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
    cancelTimeout: {
      type: Number,
      // 5 seconds to cancel `remove` by default
      default: 5000
    },
    removeText: {
      type: String,
      default: ''
    },
    undoText: {
      type: String,
      default: 'Undo'
    }
  },
  emits: ['cancel', 'confirm', 'remove'],
  setup(props, {emit}) {
    // FIXME: consider using vue-extendable-event instead
    const onConfirm = async () => {
      let promise = Promise.resolve();
      emit('confirm', {waitUntil: p => promise = p});
      return promise;
    };
    const onCancel = async () => {
      let promise = Promise.resolve();
      emit('cancel', {waitUntil: p => promise = p});
      return promise;
    };
    const onRemove = async () => {
      let promise = Promise.resolve();
      emit('remove', {waitUntil: p => promise = p});
      return promise;
    };

    const canceling = ref(false);
    const cancelTimeout = toRef(props, 'cancelTimeout');
    const removing = ref(false);
    let timeoutId = null;
    let resolveRemove = null;

    const clicked = async () => {
      // already removing, cancel
      if(removing.value) {
        removing.value = false;
        clearTimeout(timeoutId);
        resolveRemove();

        canceling.value = true;
        try {
          await onCancel();
        } catch(e) {
          console.error(e);
        } finally {
          removing.value = false;
          canceling.value = false;
        }
        return;
      }

      removing.value = true;

      // indicate confirmation period as started
      try {
        await onConfirm();
      } catch(e) {
        console.error(e);
        // return early, remove confirmation event failed
        removing.value = false;
        return;
      }

      await new Promise(resolve => {
        resolveRemove = resolve;
        timeoutId = setTimeout(resolve, cancelTimeout.value);
      });

      // if not canceled during waiting period, proceed
      if(removing.value) {
        try {
          await onRemove();
        } catch(e) {
          console.error(e);
        } finally {
          removing.value = false;
        }
      }
    };

    const disabled = toRef(props, 'disabled');
    const anyDisabled = computed(() => disabled.value || canceling.value);

    const buttonClass = computed(() => {
      const classes = ['wrm-remove-button'];
      if(anyDisabled.value) {
        classes.push('wrm-disabled');
      }
      return classes.join(' ');
    });

    const undoText = toRef(props, 'undoText');
    const removeText = toRef(props, 'removeText');
    const icon = computed(() => {
      // f0e2 == fa-undo
      // f056 == fa-minus-circle
      return removing.value ? '\uf0e2' : '\uf056';
    });
    const iconText = computed(
      () => removing.value ? undoText.value : removeText.value);

    return {anyDisabled, clicked, buttonClass, icon, iconText};
  }
};
</script>

<style>
</style>
