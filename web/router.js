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
        /* webpackChunkName: "LandingPage" */
        './routes/LandingPage.vue'),
      meta: {
        title: 'authn.io'
      }
    }, {
      path: '/mediator',
      component: () => import(
        /* webpackChunkName: "MediatorPage" */
        './routes/MediatorPage.vue'),
      meta: {
        title: 'Credential Mediator'
      }
    }, {
      path: '/mediator/wallet-chooser',
      component: () => import(
        /* webpackChunkName: "WalletChooserPage" */
        './routes/WalletChooserPage.vue'),
      meta: {
        title: 'Credential Wallet Chooser'
      }
    }, {
      path: '/mediator/allow-wallet',
      component: () => import(
        /* webpackChunkName: "AllowWalletPage" */
        './routes/AllowWalletPage.vue'),
      meta: {
        title: 'Allow Wallet'
      }
    }]
  });
  return router;
}
