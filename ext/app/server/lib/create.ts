import { makeSimpleCreator, ICreate } from 'app/server/lib/ICreate';
import { SqliteJsVariant } from 'app/server/lib/SqliteJs';
import { ISandboxCreationOptions, ISandbox } from 'app/server/lib/ISandbox';
import { Mutex } from 'async-mutex';

class OutsideWorkerWithBlockingStream {
  private worker: Worker;
  private pingingCb: any;
  private readingCb: any;
  private reading: any;
  private pinging: any;
  private mutex = new Mutex();

  start(fname: string) {
    this.worker = new Worker(fname);
    this._prepRead();
    this._prepPing();

    this.worker.onmessage = (e => {
      if (e.data.type === 'ping') {
        this.pingingCb(e.data);
      } else if (e.data.type === 'data') {
        this.readingCb(e.data.data);
        this._prepRead();
      } else {
        console.error('Unexpected message ignored', e.data);
      }
    });
  }

  close() {
    this.worker.terminate();
  }
  
  read() {
    return this.reading;
  }

  async call(name: string, ...args: any[]) {
    await this._waitPing();
    const unlock = await this.mutex.acquire();
    try {
      this.worker.postMessage({
        type: 'call',
        name,
        args,
      });
      return await this.read();
    } finally {
      unlock();
    }
  }

  async _waitPing() {
    await this.pinging;
  }

  _prepRead() {
    this.reading = new Promise((resolve) => {
      this.readingCb = resolve;
    });
  }

  _prepPing() {
    this.pinging = new Promise((resolve) => {
      this.pingingCb = resolve;
    });
  }
}

// Returns a blob:// URL which points
// to a javascript file which will call
// importScripts with the URL of the actual worker code.
// Based on https://stackoverflow.com/a/62914052/2482744
// Used to avoid CORS errors when loading worker.
// Also allows directly injecting urlPrefix instead of
// posting it in a message.
function getWorkerURL(urlPrefix: string) {
  const content = `
self.urlPrefix = "${urlPrefix}pipe/";
importScripts("${urlPrefix}webworker.bundle.js");
`;
  return URL.createObjectURL(new Blob([content], { type: "text/javascript" }));
}

class PyodideSandbox implements ISandbox {
  private worker: OutsideWorkerWithBlockingStream;

  constructor() {
    this.worker = new OutsideWorkerWithBlockingStream();
    const base = document.querySelector('base');
    const prefix = new URL(((window as any).bootstrapGristPrefix || base?.href || window.location.href));
    const url = getWorkerURL(prefix.href);
    this.worker.start(url);
  }

  async shutdown() {
    this.worker.close();
  }

  async pyCall(funcName: string, ...varArgs: unknown[]) {
    return await this.worker.call(funcName, ...varArgs);
  }

  async reportMemoryUsage() {
  }
}

export const create: ICreate = {
  ...makeSimpleCreator({
    getSqliteVariant() {
      // return new BetterSqliteVariant();
      return new SqliteJsVariant();
    },
    deploymentType: 'static',
  }),
  NSandbox: (_options: ISandboxCreationOptions) => {
    return new PyodideSandbox();
  },
};
