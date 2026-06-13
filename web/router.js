/*!
 * Copyright (c) 2023 Digital Bazaar, Inc. All rights reserved.
 */
import {createRouter as _createRouter, createWebHistory} from 'vue-router';

export async function createRouter() {
  return _createRouter({
    history: createWebHistory(),
    routes: [{
      path: '/',
      component: () => import(
        /* webpackChunkName: "LandingPage" */
        './routes/LandingPage.vue'),
      meta: {title: 'authn.io'}
    }, {
      path: '/mediator',
      component: () => import(
        /* webpackChunkName: "ThirdPartyMediatorPage" */
        './routes/ThirdPartyMediatorPage.vue'),
      meta: {title: 'Credential Mediator'}
    }, {
      path: '/mediator/wallet-chooser',
      component: () => import(
        /* webpackChunkName: "FirstPartyMediatorPage" */
        './routes/FirstPartyMediatorPage.vue'),
      meta: {title: 'Credential Wallet Chooser'}
    }, {
      path: '/mediator/allow-wallet',
      component: () => import(
        /* webpackChunkName: "FirstPartyMediatorPage" */
        './routes/FirstPartyMediatorPage.vue'),
      meta: {title: 'Allow Wallet'}
    },
    // dev-only harness for exercising the wallet chooser dialog layout
    // without CHAPI; excluded from production builds
    ...(process.env.NODE_ENV !== 'production' ? [{
      path: '/test/wallet-chooser',
      component: () => import(
        /* webpackChunkName: "TestWalletChooser" */
        './routes/TestWalletChooser.vue'),
      meta: {title: 'Test Wallet Chooser'}
    }] : [])]
  });
}
