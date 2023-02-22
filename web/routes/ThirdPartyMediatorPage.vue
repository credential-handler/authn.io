<template>
  <Suspense>
    <ThirdPartyMediatorWizard />
  </Suspense>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import ThirdPartyMediatorWizard from
  '../components/ThirdPartyMediatorWizard.vue';

export default {
  name: 'ThirdPartyMediatorPage',
  components: {ThirdPartyMediatorWizard}
};
</script>

<style>
</style>
