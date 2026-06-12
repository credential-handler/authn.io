import nodeConfig from '@digitalbazaar/eslint-config/node-recommended';
import vue3Config from '@digitalbazaar/eslint-config/vue3-recommended';

export default [
  // not yet supported
  // 'plugin:quasar/standard',
  ...nodeConfig,
  ...vue3Config
];
