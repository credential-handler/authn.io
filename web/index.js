/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as brVue from 'bedrock-vue';
import * as WrmWebRequestMediator from 'vue-web-request-mediator';
import {createRouter} from './router.js';
import Vue from 'vue';

import 'bedrock-fontawesome';
import './app.less';

// install all plugins
Vue.use(brVue);
Vue.use(WrmWebRequestMediator);

brVue.setRootVue(async () => {
  const router = await createRouter();

  const BrApp = Vue.component('br-app');
  return new BrApp({router});
});
