<template>
  <Suspense>
    <FirstPartyMediatorWizard />
  </Suspense>
</template>

<script>
/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import FirstPartyMediatorWizard from
  '../components/FirstPartyMediatorWizard.vue';

export default {
  name: 'FirstPartyMediatorPage',
  components: {FirstPartyMediatorWizard}
};
</script>

<style>
</style>
