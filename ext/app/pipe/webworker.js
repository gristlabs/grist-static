/***
 * This is web worker code for running the Grist data engine.
 */
import {guessColInfo} from 'app/common/ValueGuesser';
import {convertFromColumn} from 'app/common/ValueConverter';
import packages from './package_filenames.json';

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
  await pyodide.loadPackage(
    [...packages, "grist-1.0-py3-none-any.whl"].map(l => self.urlPrefix + "packages/" + l)
  );
  pyodide.runPython(`
import sys
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
