/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2018, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as brVue from 'bedrock-vue';
import Home from './Home.vue';
import Mediator from './Mediator.vue';
import Vue from 'vue';
import VueRouter from 'vue-router';
import * as WrmWebRequestMediator from 'vue-web-request-mediator';

// install all plugins
Vue.use(brVue);
Vue.use(WrmWebRequestMediator);

brVue.setRootVue(() => {
  const router = new VueRouter({
    mode: 'history',
    routes: [{
      path: '/',
      component: Home,
      meta: {
        title: 'authorization.io'
      }
    }, {
      path: '/mediator',
      component: Mediator,
      meta: {
        title: 'Credential Mediator'
      }
    }]
  });

  return new Vue({
    router
  });
});
