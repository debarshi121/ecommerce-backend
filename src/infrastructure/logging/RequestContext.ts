// src/infrastructure/logging/RequestContext.ts

import { AsyncLocalStorage } from "async_hooks";

/** Per-request values propagated implicitly down the async call tree. */
export interface RequestContextStore {
  requestId: string;
}

class RequestContext {
  private readonly asyncLocalStorage =
    new AsyncLocalStorage<RequestContextStore>();

  run(context: RequestContextStore, callback: () => void): void {
    this.asyncLocalStorage.run(context, callback);
  }

  get<K extends keyof RequestContextStore>(
    key: K,
  ): RequestContextStore[K] | null {
    const store = this.asyncLocalStorage.getStore();

    if (!store) {
      return null;
    }

    return store[key];
  }

  getStore(): RequestContextStore | undefined {
    return this.asyncLocalStorage.getStore();
  }
}

export const requestContext = new RequestContext();
