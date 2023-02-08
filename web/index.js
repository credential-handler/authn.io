/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as brVue from 'bedrock-vue';
import * as WrmWebRequestMediator from 'vue-web-request-mediator';
import Vue from 'vue';
import VueRouter from 'vue-router';

import './app.less';
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
        './components/Home.vue'),
      meta: {
        title: 'authn.io'
      }
    }, {
      path: '/mediator',
      component: () => import(
        /* webpackChunkName: "Mediator" */
        './components/Mediator.vue'),
      meta: {
        title: 'Credential Mediator'
      }
    }, {
      path: '/mediator/wallet-chooser',
      component: () => import(
        /* webpackChunkName: "HintChooser" */
        './components/HintChooser.vue'),
      meta: {
        title: 'Credential Wallet Chooser'
      }
    }, {
      path: '/mediator/allow-wallet',
      component: () => import(
        /* webpackChunkName: "AllowWalletDialog" */
        './components/AllowWalletDialog.vue'),
      meta: {
        title: 'Allow Wallet'
      }
    }]
  });

  const BrApp = Vue.component('br-app');
  return new BrApp({
    router
  });
});
