/***
 * This is web worker code for running the Grist data engine.
 */
import {guessColInfo} from 'app/common/ValueGuesser';
import {convertFromColumn} from 'app/common/ValueConverter';

// Add to self to make this accessible within Python as js.callExternal
self.callExternal = (name, args) => {
  const func = {
    guessColInfo,
    convertFromColumn
  }[name];
  args = args.toJs({ dict_converter: Object.fromEntries });
  return func(...args);
}

async function initPyodide() {
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.23.4/pyc/pyodide.js');
  const pyodide = await loadPyodide();
  console.log(pyodide.runPython(`
import sys
sys.version
`));
  const packages = [
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
  await pyodide.loadPackage(
    packages.map(l => self.urlPrefix + l)
  );
  pyodide.runPython(`
import sys
sys.path.append('/lib/python3.9/site-packages/grist/')
sys.path.append('/lib/python3.10/site-packages/grist/')
sys.path.append('/lib/python3.11/site-packages/grist/')
import main
import sandbox as sandbox_mod
import os
import js

os.environ['IMPORTDIR'] = '/import'
sandbox = sandbox_mod.default_sandbox = sandbox_mod.Sandbox(None, None)
sandbox.run = lambda: print("Sandbox is running")

def save_file(path, content):
  with open(path, 'w') as f:
    f.write(content)

sandbox.register('save_file', save_file)


def call_external(name, *args):
  result = js.callExternal(name, args)
  return result.to_py()

sandbox.call_external = call_external

def call(name, args):
  return sandbox._functions[name](*args.to_py())

main.main()
`);
  return pyodide;
}

function start(pyodidePromise) {
  addEventListener('message', async (e) => {
    if (e.data.type === 'call') {
      const { name, args } = e.data;
      let data = (await pyodidePromise).globals.get("call")(name, args);
      if (data?.toJs) {
        data = data.toJs({ dict_converter: Object.fromEntries });
      }
      postMessage({ type: 'data', data });
    }
  });
}

async function main() {
  const pyodidePromise = initPyodide();
  start(pyodidePromise);
}

main().catch(e => console.error(e));
