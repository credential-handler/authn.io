<template>
  <div class="wrm-flex-column-stretch wrm-flex-item-grow wrm-hint-list">
    <div
      v-for="hint in nonJitHints"
      :key="hint.hintOption.credentialHandler"
      class="wrm-flex-row wrm-flex-item">
      <WrmHint
        class="wrm-flex-item-grow"
        :hint="hint"
        :default-icon="defaultHintIcon"
        :active="!!(
          ((confirmingRemove || removingHint) && removeHint === hint) ||
          (activateOnSelect && selectedHint === hint))"
        :selected="selectedHint === hint"
        :selectable="true"
        :disabled="!!(removingHint || confirmingRemove ||
          (selectedHint && selectedHint !== hint))"
        @click="!confirmingRemove && !removingHint &&
          !selectedHint && select(hint)" />
      <WrmRemoveButton
        v-if="enableRemoveHint"
        class="wrm-flex-item"
        :cancel-timeout="cancelRemoveHintTimeout"
        :disabled="!!(removingHint || selectedHint ||
          (removeHint && removeHint !== hint))"
        :remove-text="'Hide'"
        @cancel="cancelRemove(hint)"
        @confirm="confirmRemove(hint)"
        @remove="remove(hint)" />
    </div>
    <div
      v-if="hasMixedHints"
      class="wrm-flex-row wrm-flex-item wrm-separator" />
    <div
      v-for="hint in jitHints"
      :key="hint.hintOption.credentialHandler"
      class="wrm-flex-row wrm-flex-item">
      <WrmHint
        class="wrm-flex-item-grow"
        :hint="hint"
        :default-icon="defaultHintIcon"
        :active="!!(
          ((confirmingRemove || removingHint) && removeHint === hint) ||
          (activateOnSelect && selectedHint === hint))"
        :selected="selectedHint === hint"
        :selectable="true"
        :disabled="!!(removingHint || confirmingRemove ||
          (selectedHint && selectedHint !== hint))"
        @click="!confirmingRemove && !removingHint &&
          !selectedHint && select(hint)" />
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2018-2026 Digital Bazaar, Inc.
 */
import {computed, ref, toRef} from 'vue';
import WrmHint from './WrmHint.vue';
import WrmRemoveButton from './WrmRemoveButton.vue';

export default {
  name: 'WrmHintList',
  components: {WrmHint, WrmRemoveButton},
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
    activateOnSelect: Boolean
  },
  emits: ['remove', 'select'],
  setup(props, {emit}) {
    const hints = toRef(props, 'hints');
    const hintRemovalText = toRef(props, 'hintRemovalText');

    const selectedHint = ref(null);
    const confirmingRemove = ref(false);
    const removeHint = ref(null);
    const removingHint = ref(false);
    let removeHintName = '';

    const jitHints = computed(() => hints.value.filter(h => h.jit));
    const nonJitHints = computed(() => hints.value.filter(h => !h.jit));
    const hasMixedHints = computed(
      () => jitHints.value.length > 0 && nonJitHints.value.length > 0);

    // FIXME: consider using vue-extendable-event
    const onRemove = async hint => {
      let promise = Promise.resolve();
      emit('remove', {
        hint,
        waitUntil: p => promise = p
      });
      return promise;
    };
    const onSelect = async hint => {
      let promise = Promise.resolve();
      emit('select', {
        hint,
        waitUntil: p => promise = p
      });
      return promise;
    };

    const cancelRemove = hint => {
      confirmingRemove.value = false;
      removeHint.value = null;
      hint.name = removeHintName;
    };
    const confirmRemove = hint => {
      removeHint.value = hint;
      removeHintName = hint.name;
      confirmingRemove.value = true;
      hint.name = `${hintRemovalText.value} ${removeHintName}`;
    };
    const remove = async hint => {
      removingHint.value = true;
      try {
        // wait for hint to be removed
        await onRemove(hint);
      } catch(e) {
        console.error(e);
      } finally {
        hint.name = removeHintName;
        removingHint.value = false;
        removeHint.value = null;
        confirmingRemove.value = false;
      }
    };
    const select = async hint => {
      selectedHint.value = hint;
      try {
        // wait for selection to be handled
        await onSelect(hint);
      } catch(e) {
        console.error(e);
      }
      selectedHint.value = null;
    };

    return {
      selectedHint, confirmingRemove, removeHint, removingHint,
      jitHints, nonJitHints, hasMixedHints,
      cancelRemove, confirmRemove, remove, select
    };
  }
};
</script>

<style>
</style>
