<template>
  <span>
    <i
      v-if="iconType === 'default'"
      style="vertical-align: middle"
      :style="{'font-size': iconPixelSize}"
      :class="defaultIcon" />
    <img
      v-else
      crossorigin="anonymous"
      style="vertical-align: middle"
      :src="icon"
      :style="{
        width: iconPixelSize,
        'min-width': iconPixelSize,
        'max-height': iconPixelSize
      }"
      @error="imageError">
  </span>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {computed, ref, toRef, watch} from 'vue';
import {getWebAppManifestIcon} from '../mediator/manifest.js';

export default {
  name: 'WrmOriginIcon',
  props: {
    defaultIcon: {
      type: String,
      default: 'fas fa-globe'
    },
    iconSize: {
      type: Number,
      required: true
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
  },
  setup(props) {
    const iconType = ref('manifest');
    const iconSize = toRef(props, 'iconSize');
    const origin = toRef(props, 'origin');
    const manifest = toRef(props, 'manifest');

    const icon = ref('');
    const favicon = computed(() => `${origin.value}/favicon.ico`);
    const iconPixelSize = computed(() => `${iconSize.value}px`);

    const imageError = event => {
      // if the error was with loading the `favicon`, then fallback to the
      // the default icon; otherwise the error was with the manifest icon,
      // so fallback to using the `favicon`
      iconType.value = event.target.src === favicon.value ?
        'default' : 'favicon';
    };

    const updateIcon = manifestValue => {
      const bestIcon = getWebAppManifestIcon({
        manifest: manifestValue,
        origin: origin.value,
        size: iconSize.value
      });
      if(bestIcon) {
        iconType.value = 'manifest';
        icon.value = bestIcon.src;
      } else {
        // fallback to favicon icon instead
        iconType.value = 'favicon';
        icon.value = favicon.value;
      }
    };

    // initialize icon using manifest value if available
    updateIcon(manifest.value);

    // watch manifest for changes and update icon type and icon to use
    watch(manifest, updateIcon);

    return {icon, iconPixelSize, iconType, imageError};
  }
};
</script>

<style>
</style>
