// Shadow of test/setupPaths.js. Same body but puts _build/ext FIRST,
// so our test-side shadows (e.g. ext/test/nbrowser/homeUtil.ts) win
// over upstream. Upstream's order has _build/ext fourth and never
// reached. NODE_PATH (set by scripts/test_nbrowser.sh) resolves
// test/setupPaths through _build/ext, picking this file up.

const path = require('path');
const fs = require('fs');
fs.writeFileSync('/tmp/grist-static-shadow-probe.txt',
  `setupPaths shadow loaded at ${new Date().toISOString()}\n` +
  `NODE_PATH=${process.env.NODE_PATH}\n` +
  `cwd=${process.cwd()}\n` +
  `__filename=${__filename}\n`);
const appModulePath = require('app-module-path');
const root = process.cwd();
const nodePath = (process.env.NODE_PATH || '').split(path.delimiter);
const paths = [path.join(root, "_build/ext"),
               path.join(root, "_build"),
               path.join(root, "_build/core"),
               path.join(root, "_build/stubs")];
for (const p of paths) {
  appModulePath.addPath(p);
}
// add to path for any subprocesses also
process.env.NODE_PATH = [...nodePath, ...paths]
  .filter(p => p !== '')
  .join(path.delimiter);
