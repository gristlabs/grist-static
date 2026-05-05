import { gristOverrides } from 'app/pipe/GristOverrides';
import { BaseCreate, ICreate } from 'app/server/lib/ICreate';
import { SqliteJsVariant } from 'app/server/lib/SqliteJs';
import { ISandboxCreationOptions, ISandbox } from 'app/server/lib/ISandbox';
import { SqliteVariant } from 'app/server/lib/SqliteCommon';
import { traceWrap } from 'app/server/lib/testmode/trace';
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

// Returns a blob: URL pointing at a tiny JS that importScripts the
// real worker. Avoids CORS errors and lets us inject urlPrefix
// directly. https://stackoverflow.com/a/62914052/2482744
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
    return traceWrap('py', funcName, () => this.workerWrapper.call(funcName, ...varArgs));
  }

  async reportMemoryUsage(): Promise<number> {
    return 0;
  }

  getFlavor() { return 'pyodide'; }

  isProcessDown() { return false; }
}

class StaticCreate extends BaseCreate {
  constructor() {
    super('static', []);
  }
  public getSqliteVariant(): SqliteVariant {
    return new SqliteJsVariant();
  }
  public override NSandbox(_options: ISandboxCreationOptions): ISandbox {
    return new PyodideSandbox();
  }
}

export const create: ICreate = new StaticCreate();
