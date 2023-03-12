import { makeSimpleCreator } from 'app/server/lib/ICreate';
//import { BetterSqliteVariant } from 'app/server/lib/SqliteBetter';
import { SqliteJsVariant } from 'app/server/lib/SqliteJs';
import { SandboxProcess } from 'app/server/lib/NSandbox';

//import * as pyodide from 'pyodide';
// import Worker from 'web-worker';

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
  private mutex = new Mutex();
  
  async start(fname: string|URL, bufferLen: number, readCb: any = null) {
    this._getWorkerApi();
    this.worker = new this.Worker(fname);
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
    });
    console.log('Waiting to hear from worker...');
    await this._waitPing();
    console.log('... heard from worker.');
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
    console.log("Writing", data);
    const mlen = this.storage.byteLength;
    let at = 0;
    while (at < data.byteLength) {
      const jlen = Math.min(mlen, data.byteLength - at);
      const part = data.subarray(at, jlen + at);
      console.log("write at", {at, jlen, part});
      this.storage.set(part);
      this.len[0] = part.byteLength;
      this.tlen[0] = data.byteLength;
      this.offset[0] = at;
      Atomics.store(this.key, 0, 1);
      console.log("notifying");
      Atomics.notify(this.key, 0, 1);
      console.log("notified");
      at += part.byteLength;
      // For simplicity, wait after sending.
      try {
        console.log("tried wait...");
        await (Atomics as any).waitAsync(this.key, 0, 1).value;
        console.log("tried wait");
      } catch (e) {
        // Atomics may not be implemented - wait for ping instead
        //if (Atomics.load(this.key, 0)) {
        console.log("wait ping");
        await this._waitPing();
        console.log("waited ping");
        //}
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
    //if (process.env.wefwefwef) {
    //console.log("BETTER SQLITE VARIANT");
    //return new BetterSqliteVariant();
    //} else {
    console.log("SQLITE JS VARIANT");
    return new SqliteJsVariant();
    ///}
  },
  getSandboxVariants() {
    return {
      'pyodideInline': pyodideInlineSpawner
    };
  }
});


function pyodideInlineSpawner(): SandboxProcess {
  //console.log("Running loadpyodide");
  //pyodide.loadPyodide();
  console.log("=======================================");
  console.log("=======================================");
  console.log("=======================================");
  console.log("=======================================");
  console.log("=======================================");
  console.log("Worker thing2");
  //const url = new URL('py.js', 'file:///home/paulfitz/cvs/grist-static/pipe/zing');
  //console.log("URL IS", {url, full: url.href});
  //const worker = new Worker(url, { type: 'module' });
  /*
  let _cb: any = null;
  worker.addEventListener('message', e => {
    console.log(e.data)  // "hiya!"
    if (_cb) {
      _cb(e.data);
    }
  });
  
  worker.postMessage('hello');
  console.log("Ran loadpyodide");
  */
  let setWorker: (worker: OutsideWorkerWithBlockingStream) => void;
  let worker = new Promise<OutsideWorkerWithBlockingStream>(resolve => {
    setWorker = resolve;
  });
  return {
    sendData: (data: any) => {
      console.log('asked to send data');
      worker.then(async w => {
        console.log("writing data...");
        try {
          await w.write(data);
          console.log("wrote data...");
        } catch (e) {
          console.log("error when writing", e);
        }
      }).catch(e => console.error(e));
    },
    getData: (cb) => {
      console.log('asked to get data');
      const worker = new OutsideWorkerWithBlockingStream();
      const url = 'pipe/py.js';
      //const url = new URL('py.js', 'file:///home/paulfitz/cvs/grist-static/pipe/zing');
      console.log("URL", url);
      worker.start(url, 65536, cb).then(() => {
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
        console.log("close!!");
      },
      async kill() {
        console.log("kill!!");
      },
    }
  };
}
