<template>
  <div style="user-select: none">
    <div v-if="!credentialRequestOrigin">
      Loading... <i class="fas fa-cog fa-spin" />
    </div>
    <div else>
      <div style="font-size: 14px; padding-top: 10px">
        The following website {{websiteDesire}}
      </div>
      <WrmOriginCard
        style="padding: 20px 0 10px 0"
        :icon-size="iconSize"
        :origin="credentialRequestOrigin"
        :manifest="credentialRequestOriginManifest" />
    </div>
  </div>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2019-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import {computed, toRef} from 'vue';
import {WrmOriginCard} from 'vue-web-request-mediator';

export default {
  name: 'MediatorGreeting',
  components: {WrmOriginCard},
  props: {
    iconSize: {
      type: Number,
      required: false,
      default: () => 48
    },
    credentialRequestOrigin: {
      type: String,
      required: true
    },
    credentialRequestOriginManifest: {
      type: Object,
      required: false,
      default: () => null
    },
    requestType: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const requestType = toRef(props, 'requestType');
    const websiteDesire = computed(() => {
      if(requestType.value === 'credentialRequest') {
        return 'has a credential request or offer for you:';
      }
      if(requestType.value === 'credentialStore') {
        return 'has credentials for you to store:';
      }
      return 'wants to manage credentials for you:';
    });
    return {websiteDesire};
  }
};
</script>

<style>
</style>
