import pipeCode from 'app/pipe/py';
import { makeSimpleCreator } from 'app/server/lib/ICreate';
import { SqliteJsVariant } from 'app/server/lib/SqliteJs';
import { SandboxProcess } from 'app/server/lib/NSandbox';
import { Mutex } from 'async-mutex';

class OutsideWorkerWithBlockingStream {
  private worker: any;
  private Worker: any;
  private buffer: any;
  private key: any;
  private len: any;
  private tlen: any;
  private offset: any;
  private storage: any;
  private workerOnMessage: any;
  private pingingCb: any;
  private readingCb: any;
  private reading: any;
  private pinging: any;
  private prefix: string;
  private mutex = new Mutex();
  
  async start(fname: string|URL, prefix: string, bufferLen: number, readCb: any = null) {
    this._getWorkerApi();
    this.worker = new this.Worker(fname);
    this.prefix = prefix;
    this._prepRead();
    this._prepPing();

    this.buffer = new SharedArrayBuffer(bufferLen || 65536);
    this.key = new Int32Array(this.buffer, 0, 4);
    this.len = new Int32Array(this.buffer, 4, 4);
    this.tlen = new Int32Array(this.buffer, 8, 4);
    this.offset = new Int32Array(this.buffer, 12, 4);
    this.storage = new Uint8Array(this.buffer, 16);
    this.key[0] = 0;
    this.len[0] = 0;
    this.workerOnMessage(this.worker, (e: any) => {
      if (e.data.type === 'ping') {
        this.pingingCb(e.data);
        this._prepPing();
      } else if (e.data.type === 'data') {
        if (readCb) {
          readCb(e.data.data);
        } else {
          this.readingCb(e.data.data);
          this._prepRead();
        }
      } else {
        console.error('Unexpected message ignored', e.data);
      }
    });
    this.worker.postMessage({
      type: 'buffer',
      buffer: this.buffer,
      prefix: this.prefix,
    });
    await this._waitPing();
  }

  close() {
    this.worker.terminate();
  }
  
  read() {
    return this.reading;
  }

  async write(data: any) {
    const unlock = await this.mutex.acquire();
    try {
      await this.writeCore(data);
    } finally {
      unlock();
    }
  }

  async writeCore(data: any) {
    const mlen = this.storage.byteLength;
    let at = 0;
    while (at < data.byteLength) {
      const jlen = Math.min(mlen, data.byteLength - at);
      const part = data.subarray(at, jlen + at);
      this.storage.set(part);
      this.len[0] = part.byteLength;
      this.tlen[0] = data.byteLength;
      this.offset[0] = at;
      Atomics.store(this.key, 0, 1);
      Atomics.notify(this.key, 0, 1);
      at += part.byteLength;
      // For simplicity, wait after sending.
      try {
        await (Atomics as any).waitAsync(this.key, 0, 1).value;
      } catch (e) {
        // Atomics may not be implemented, wait for ping instead.
        await this._waitPing();
      }
    }
  }

  async _waitPing() {
    await this.pinging;
    this._prepPing();
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

  _getWorkerApi() {
    if (typeof Worker === 'undefined') {
      const wt = require('worker_threads');
      this.Worker = wt.Worker;
      this.workerOnMessage = (worker: any, cb: any) => {
        worker.on('message', (d: any) => {
          cb({
            data: d,
          });
        });
      }
    } else {
      this.Worker = Worker;
      this.workerOnMessage = (worker: any, cb: any) => {
        worker.onmessage = cb;
      }
    }
  }
}


export const create = makeSimpleCreator({
  getSqliteVariant() {
    // return new BetterSqliteVariant();
    return new SqliteJsVariant();
  },
  getSandboxVariants() {
    return {
      'pyodideInline': pyodideInlineSpawner
    };
  }
});


function pyodideInlineSpawner(): SandboxProcess {
  let setWorker: (worker: OutsideWorkerWithBlockingStream) => void;
  let worker = new Promise<OutsideWorkerWithBlockingStream>(resolve => {
    setWorker = resolve;
  });
  return {
    sendData: (data: any) => {
      worker.then(async w => {
        try {
          await w.write(data);
        } catch (e) {
          console.error("error when writing", e);
        }
      }).catch(e => console.error(e));
    },
    getData: (cb) => {
      const worker = new OutsideWorkerWithBlockingStream();
      // Start worker with a data url since cross origin is a bear in
      // this case.
      const base = document.querySelector('base');
      const prefix = new URL(((window as any).bootstrapGristPrefix || base?.href || window.location.href) + 'pipe/');
      const selfContained = prefix.hostname === window.location.hostname;
      const url = selfContained ? (prefix.href  + 'py.js') : new URL(pipeCode as any);
      worker.start(url, selfContained ? '' : prefix.href, 65536, cb).then(() => {
        setWorker(worker);
      }).catch(e => console.error(e));
    },
    control: {
      async getUsage() {
        return { memory: 0 }
      },
      prepareToClose() {
      },
      async close() {
        console.log("close sandbox");
      },
      async kill() {
        console.log("kill sandbox");
      },
    }
  };
}
