/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as brVue from 'bedrock-vue';
import Vue from 'vue';
import VueRouter from 'vue-router';
import * as WrmWebRequestMediator from 'vue-web-request-mediator';

// install all plugins
Vue.use(brVue);
Vue.use(WrmWebRequestMediator);

brVue.setRootVue(async () => {
  const router = new VueRouter({
    mode: 'history',
    routes: [{
      path: '/',
      component: () => import('./Home.vue'),
      meta: {
        title: 'authorization.io'
      }
    }, {
      path: '/mediator',
      component: () => import('./Mediator.vue'),
      meta: {
        title: 'Credential Mediator'
      }
    }]
  });

  const BrApp = Vue.component('br-app');
  return new BrApp({
    router
  });
});
