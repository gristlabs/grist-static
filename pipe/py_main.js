class OutsideWorkerWithBlockingStream {
  
  async start(fname, bufferLen) {
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
    this.workerOnMessage(this.worker, (e) => {
      if (e.data.type === 'ping') {
        this.pingingCb(e.data);
        this._prepPing();
      } else if (e.data.type === 'data') {
        this.readingCb(e.data.data);
        this._prepRead();
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

  async write(data) {
    const mlen = this.storage.byteLength;
    let at = 0;
    while (at < data.byteLength) {
      const jlen = Math.min(mlen, data.byteLength - at);
      const part = data.subarray(at, jlen + at);
      try {
        await Atomics.waitAsync(this.key, 0, 1).value;
      } catch (e) {
        // Atomics may not be implemented - wait for ping instead
        if (Atomics.load(this.key, 0) === 1) {
          await this._waitPing();
        }
      }
      this.storage.set(part);
      this.len[0] = part.byteLength;
      this.tlen[0] = data.byteLength;
      this.offset[0] = at;
      Atomics.store(this.key, 0, 1);
      Atomics.notify(this.key, 0, 1);
      at += part.byteLength;
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
      this.workerOnMessage = (worker, cb) => {
        worker.on('message', (d) => {
          cb({
            data: d,
          });
        });
      }
    } else {
      this.Worker = Worker;
      this.workerOnMessage = (worker, cb) => {
        worker.onmessage = cb;
      }
    }
  }
}

async function delay(t) {
  return new Promise(resolve => {
    setTimeout(resolve, t);
  });
}

async function main() {
  const worker = new OutsideWorkerWithBlockingStream();

  if (typeof window !== 'undefined') {
    window.addEventListener("unload", (event) => {
      worker.close();
    });
  }
  
  await worker.start('./py.js');

  await delay(10000);
  const txt = "bork bork bork";
  await worker.write(new TextEncoder().encode(txt));

  /*
  let ct = 0;
  let txt = "moopwefpwepkofweofkpweopfewfe12340121203-12o03102310-2310o-20-21e12-0oe0-xs123";
  while (true) {
    console.log("WRITING", {txt});
    await worker.write(new TextEncoder().encode(txt));
    const result = await worker.read();
    console.log("READ", {result});
    ct++;
    txt += ".";
    txt += String(ct);
    await delay(10000);
  }
  */
}

main().catch(e => console.error(e));
