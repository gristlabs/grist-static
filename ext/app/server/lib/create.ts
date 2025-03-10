import { gristOverrides } from 'app/pipe/GristOverrides';
import { makeSimpleCreator, ICreate } from 'app/server/lib/ICreate';
import { SqliteJsVariant } from 'app/server/lib/SqliteJs';
import { ISandboxCreationOptions, ISandbox } from 'app/server/lib/ISandbox';
import { Mutex } from 'async-mutex';

class WorkerWrapper {
  private worker: Worker;
  private mutex = new Mutex();

  constructor(url: string) {
    this.worker = new Worker(url);
  }

  close() {
    this.worker.terminate();
  }
  
  async call(name: string, ...args: any[]) {
    const unlock = await this.mutex.acquire();
    try {
      this.worker.postMessage({
        type: 'call',
        name,
        args,
      });
      return await new Promise((resolve, reject) => {
        const listener = ((e: MessageEvent) => {
          if (e.data.type === 'data') {
            this.worker.removeEventListener('message', listener);
            resolve(e.data.data);
          } else if (e.data.type === 'error') {
            this.worker.removeEventListener('message', listener);
            reject(e.data.error);
          } else {
            console.error('Unexpected message ignored', e.data);
          }
        });
        this.worker.addEventListener('message', listener);
      });
    } finally {
      unlock();
    }
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
  private workerWrapper: WorkerWrapper;

  constructor() {
    const base = document.querySelector('base');
    const prefix = new URL(gristOverrides.bootstrapGristPrefix || base?.href || window.location.href);
    const url = getWorkerURL(prefix.href);
    this.workerWrapper = new WorkerWrapper(url);
  }

  async shutdown() {
    this.workerWrapper.close();
  }

  async pyCall(funcName: string, ...varArgs: unknown[]) {
    return await this.workerWrapper.call(funcName, ...varArgs);
  }

  async reportMemoryUsage() {
  }

  getFlavor() { return 'pyodide'; }

  isProcessDown() { return false; }
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
