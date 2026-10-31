/*!
 * New BSD License (3-clause)
 * Copyright (c) 2017-2026 Digital Bazaar, Inc.
 */
import {WebApp} from 'web-request-rpc';

export class WebRequestMediator extends WebApp {
  constructor(relyingOrigin) {
    super(relyingOrigin);
  }

  async connect() {
    await super.connect();
    await this.ready();
    return this.injector;
  }
}
