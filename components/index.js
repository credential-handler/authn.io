/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as brVue from 'bedrock-vue';
import Vue from 'vue';
import VueRouter from 'vue-router';
import * as WrmWebRequestMediator from 'vue-web-request-mediator';

import './main.less';
import 'bedrock-fontawesome';

// install all plugins
Vue.use(brVue);
Vue.use(WrmWebRequestMediator);

brVue.setRootVue(async () => {
  const router = new VueRouter({
    mode: 'history',
    routes: [{
      path: '/',
      component: () => import(
        /* webpackChunkName: "Home" */
        './Home.vue'),
      meta: {
        title: 'authn.io'
      }
    }, {
      path: '/mediator',
      component: () => import(
        /* webpackChunkName: "Mediator" */
        './Mediator.vue'),
      meta: {
        title: 'Credential Mediator'
      }
    }, {
      path: '/hint-chooser',
      component: () => import(
        /* webpackChunkName: "HintChooser" */
        './HintChooser.vue'),
      meta: {
        title: 'Credential Hint Chooser'
      }
    }, {
      path: '/allow-wallet-access',
      component: () => import(
        /* webpackChunkName: "AllowWalletAccess" */
        './AllowWalletAccess.vue'),
      meta: {
        title: 'Allow Wallet Access'
      }
    }]
  });

  const BrApp = Vue.component('br-app');
  return new BrApp({
    router
  });
});
