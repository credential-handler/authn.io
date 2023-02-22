/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2023, Digital Bazaar, Inc.
 * All rights reserved.
 */
import * as brVue from '@bedrock/vue';
import App from './components/App.vue';
import {createRouter} from './router.js';

import '@bedrock/web-fontawesome';
import './app.less';

brVue.initialize({
  async beforeMount({app}) {
    // create and install router
    const router = await createRouter();
    app.use(router);

    // return root Vue component
    return App;
  }
});
