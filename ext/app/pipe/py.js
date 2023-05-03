/***
 * This is web worker code for running the Grist data engine.
 */

class Pyodide {
  async start(prefix, sender, receiver) {
    this.prefix = prefix;
    if (typeof importScripts === 'function') {
      importScripts(this.prefix + 'pyodide/pyodide.js');
      this.myLoadPyodide = loadPyodide;
    } else {
      const pyo = require('pyodide/pyodide.js');
      this.myLoadPyodide = pyo.loadPyodide;
    }
    this.pyodide = await this.myLoadPyodide({
      jsglobals: {
        Object: {},
        setTimeout: function(code, delay) {
          if (self.adminMode) {
            setTimeout(code, delay);
            // Seems to be OK not to return anything, so we don't.
          } else {
            throw new Error('setTimeout not available');
          }
        },
        sendFromSandbox: (data) => {
          data = data.toJs();
          sender(data);
        }
      }
    });
    this.pyodide.setStdin({
      stdin: () => {
        const result = receiver();
        return result;
      },
    });
  }

  check() {
    console.log(this.pyodide.runPython(`
import sys
sys.version
  `));
  }

  async loadPackages() {
    const lst = [
      "packages/astroid-2.14.2-py3-none-any.whl",
      "packages/asttokens-2.0.5-py2.py3-none-any.whl",
      "packages/backports.functools_lru_cache-1.6.4-py2.py3-none-any.whl",
      "packages/chardet-4.0.0-py2.py3-none-any.whl",
      "packages/enum34-1.1.10-py3-none-any.whl",
      "packages/et_xmlfile-1.0.1-py3-none-any.whl",
      "packages/executing-1.1.1-py2.py3-none-any.whl",
      "packages/friendly_traceback-0.7.48-py3-none-any.whl",
      "packages/iso8601-0.1.12-py2.py3-none-any.whl",
      "packages/jdcal-1.4.1-py2.py3-none-any.whl",
      "packages/lazy_object_proxy-1.6.0-cp311-cp311-emscripten_3_1_31_wasm32.whl",
      "packages/openpyxl-3.0.10-py2.py3-none-any.whl",
      "packages/phonenumberslite-8.12.57-py2.py3-none-any.whl",
      "packages/pure_eval-0.2.2-py3-none-any.whl",
      "packages/python_dateutil-2.8.2-py2.py3-none-any.whl",
      "packages/roman-3.3-py2.py3-none-any.whl",
      "packages/singledispatch-3.6.2-py2.py3-none-any.whl",
      "packages/six-1.16.0-py2.py3-none-any.whl",
      "packages/sortedcontainers-2.4.0-py2.py3-none-any.whl",
      "packages/stack_data-0.5.1-py3-none-any.whl",
      "packages/typing_extensions-4.4.0-py3-none-any.whl",
      "packages/unittest_xml_reporting-2.0.0-py2.py3-none-any.whl",
      "packages/wrapt-1.12.1-cp311-cp311-emscripten_3_1_31_wasm32.whl",

      "packages/grist-1.0-py3-none-any.whl"
    ];
    await this.pyodide.loadPackage(
      lst.map(l => this.prefix + l)
    );
  }

  run() {
    this.pyodide.runPython(`
  import sys
  sys.path.append('/lib/python3.9/site-packages/grist/')
  sys.path.append('/lib/python3.10/site-packages/grist/')
  sys.path.append('/lib/python3.11/site-packages/grist/')
  import grist
  import main
  import os
  os.environ['PIPE_MODE'] = 'pyodide'
  os.environ['IMPORTDIR'] = '/import'
  main.main()
`);
  }
}


class InsideWorkerWithBlockingStream {
  async start() {
    this._getWorkerApi();
    this.buffer = null;
    this.prefix = null;
    return new Promise((resolve) => {
      this.addEventListener('message', e => {
        if (e.data.buffer) {
          this.buffer = e.data.buffer;
          this.prefix = e.data.prefix;
          this.key = new Int32Array(this.buffer, 0, 4);
          this.len = new Int32Array(this.buffer, 4, 4);
          this.tlen = new Int32Array(this.buffer, 8, 4);
          this.offset = new Int32Array(this.buffer, 12, 4);
          this.storage = new Uint8Array(this.buffer, 16);
        }
        if (this.buffer) {
          this.postMessage({type: 'ping'});
          resolve();
        }
      });
    });
  }

  read() {
    let tresult = null;
    while (true) {
      const result = Atomics.wait(this.key, 0, 0);
      const ll = this.len[0];
      const offset = this.offset[0];
      const tlen = this.tlen[0];
      const done = offset + ll === tlen;
      tresult = tresult || new ArrayBuffer(tlen);
      const dsti = new Uint8Array(tresult, offset);
      const srci = this.storage.subarray(0, ll);
      dsti.set(srci);
      Atomics.store(this.key, 0, 0);
      Atomics.notify(this.key, 0, 1);
      this.postMessage({type: 'ping'});
      if (done) {
        return tresult;
      }
    }
  }

  write(data) {
    this.postMessage({type: 'data', data: data});
  }

  delay(t) {
    this.AB = this.AB || new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(this.AB, 0, 0, Math.max(1, t|0));
  }

  _getWorkerApi() {
    if (typeof addEventListener === 'undefined') {
      const wt = require('worker_threads');
      this.postMessage = (data) => {
        wt.parentPort.postMessage(data);
      };
      this.addEventListener = (type, cb) => {
        wt.parentPort.addEventListener(type, cb);
        wt.parentPort.start();
      }
    } else {
      this.addEventListener = (typ, cb) => addEventListener(typ, cb);
      this.postMessage = (data) => postMessage(data);
    }
    // Lack of Blob may result in a message on console.log that hurts us.
    if (!globalThis.Blob) {
      globalThis.Blob = String;
      this.addedBlob = true;
    }
  }  
}

async function main() {
  const pyodide = new Pyodide();
  const worker = new InsideWorkerWithBlockingStream();
  await worker.start();
  const sender = (data) => {
    worker.write(data);
  };
  const receiver = () => {
    const result = worker.read();
    return result;
  }
  
  await pyodide.start(worker.prefix, sender, receiver);
  await pyodide.loadPackages();
  pyodide.check();
  try {
    pyodide.run();
  } catch (e) {
    console.error("Error!");
    throw e;
  }
}

main().catch(e => console.error(e));
