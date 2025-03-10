/***
 * This is web worker code for running the Grist data engine.
 */
import {guessColInfo} from 'app/common/ValueGuesser';
import {convertFromColumn} from 'app/common/ValueConverter';
const {loadPyodide} = require("pyodide");  // importing causes weird webpack errors

// This file is copied from core/sandbox/pyodide/ where it's built by packages.js.
// Remember to update it when packages are rebuilt.
// TODO automate the copying or make symlinking work.
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
  const pyodide = await loadPyodide({indexURL: self.urlPrefix + "pyodide/"});
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
  mode = 'w' if isinstance(content, str) else 'wb'
  with open(path, mode) as f:
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
      try {
        let data = (await pyodidePromise).globals.get("call")(name, args);
        if (data?.toJs) {
          data = data.toJs({ dict_converter: Object.fromEntries });
        }
        postMessage({ type: 'data', data });
      } catch (e) {
        postMessage({ type: 'error', error: e.message });
      }
    }
  });
}

async function main() {
  const pyodidePromise = initPyodide();
  start(pyodidePromise);
}

main().catch(e => console.error(e));
