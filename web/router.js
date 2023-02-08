/*!
 * Copyright (c) 2023 Digital Bazaar, Inc. All rights reserved.
 */
import VueRouter from 'vue-router';

export async function createRouter() {
  // FIXME: convert to routes instead of components
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
  return router;
}
