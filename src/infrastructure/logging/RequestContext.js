// src/infrastructure/logging/RequestContext.js

const { AsyncLocalStorage } = require("async_hooks");

class RequestContext {
  constructor() {
    this.asyncLocalStorage = new AsyncLocalStorage();
  }

  run(context, callback) {
    this.asyncLocalStorage.run(context, callback);
  }

  get(key) {
    const store = this.asyncLocalStorage.getStore();

    if (!store) {
      return null;
    }

    return store[key];
  }

  getStore() {
    return this.asyncLocalStorage.getStore();
  }
}

module.exports = new RequestContext();
