// Browser stub for node:async_hooks. Single-threaded JS doesn't need
// real per-context storage, but we do need to keep the store set across
// awaits inside run() — SQLiteDB.execTransaction deadlocks otherwise.

export class AsyncLocalStorage<T = unknown> {
  private _store: T | undefined;
  public run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
    // Hold _store for the whole returned promise; resetting in `finally`
    // before the promise settles makes _inTransaction read false
    // mid-transaction.
    const prev = this._store;
    this._store = store;
    try {
      const ret: any = callback(...args);
      if (ret && typeof ret.then === 'function') {
        return ret.finally(() => { this._store = prev; });
      }
      this._store = prev;
      return ret;
    } catch (e) {
      this._store = prev;
      throw e;
    }
  }
  public getStore(): T | undefined { return this._store; }
  public exit<R>(callback: (...args: any[]) => R, ...args: any[]): R {
    const prev = this._store;
    this._store = undefined;
    try { return callback(...args); }
    finally { this._store = prev; }
  }
  public disable(): void { this._store = undefined; }
  public enterWith(store: T): void { this._store = store; }
}

export class AsyncResource {
  constructor(_type: string, _opts?: unknown) {}
  public runInAsyncScope<R>(fn: (...args: any[]) => R, _self?: unknown, ...args: any[]): R {
    return fn(...args);
  }
}

export function executionAsyncId(): number { return 0; }
export function triggerAsyncId(): number { return 0; }

export default { AsyncLocalStorage, AsyncResource, executionAsyncId, triggerAsyncId };
