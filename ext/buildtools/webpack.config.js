const path = require('path');

// Get path to top-level node_modules if in a yarn workspace.
// Otherwise node_modules one level up won't get resolved.
// This is used in Electron packaging.
const up = path.dirname(path.dirname(require.resolve('pyodide')));

// Load the core webpack configuration
const base = require('../../core/buildtools/webpack.config.js');

base.entry = {
  ...base.entry,
  // Doc.ts is bundled into main.bundle.js via the import in CommStub.
  // doc.bundle.js exposes the same exports as window.gristy for any
  // consumer that wants them directly. Per-entry library so the main
  // bundle doesn't also try to set window.gristy (no default export).
  doc: {
    import: 'app/server/Doc',
    library: { type: 'window', name: 'gristy', export: 'default' },
  },
  // Test-mode harness loaded first by sendAppPage. Source file rather
  // than inline so it gets tsc/lint and avoids HTML-parser traps.
  'test-harness': 'app/pipe/testHarness',
};

base.resolve.modules.push(up);

base.resolve.alias = {
  ...base.resolve.alias,
  'app/server/lib/GoogleImport': 'app/server/lib/GoogleImportStub',
  'app/server/lib/Requests': 'app/server/lib/RequestsStub',
  'app/server/lib/log': 'app/server/lib/logStub',
  'module': 'app/server/lib/moduleStub',
  'app/server/lib/SqliteNode': 'app/server/lib/SqliteNodeStub',
  '@gristlabs/connect-sqlite3': 'app/server/lib/emptyStub',
  '@gristlabs/sqlite3': 'app/server/lib/emptyStub',
  'express': 'app/server/lib/emptyStub',
  'readdirp': 'app/server/lib/emptyStub',
  'chokidar': 'app/server/lib/emptyStub',
  'app/server/lib/gristSessions': 'app/server/lib/emptyStub',
  '@gristlabs/pidusage': 'app/server/lib/pidUsageStub',
  'pidusage': 'app/server/lib/pidUsageStub',
  // archiver pulls in node-only crypto/zlib; only used for server-side
  // export/zip paths we never run.
  'archiver': 'app/server/lib/emptyStub',
  'archiver-utils': 'app/server/lib/emptyStub',
  'crc32-stream': 'app/server/lib/emptyStub',
  'compress-commons': 'app/server/lib/emptyStub',
  'zip-stream': 'app/server/lib/emptyStub',
  'zlib': 'app/server/lib/emptyStub',
  'child_process': 'app/server/lib/childProcessStub',
  'tmp': 'app/server/lib/tmpStub',
  'app/client/components/Comm': 'app/server/lib/CommStub',
  'app/server/lib/ProxyAgent': 'app/server/lib/ProxyAgentStub',
  'app/client/Hooks': 'app/client/HookStub',
  'app/gen-server/lib/homedb/HomeDBManager': 'app/server/lib/HomeDBManagerStub',
  'piscina': 'app/server/lib/piscina-stub',
  'app/server/lib/GoogleAuth': 'app/server/lib/GoogleAuthStub',
  'app/server/lib/GoogleExport': 'app/server/lib/GoogleAuthStub',
  'app/server/lib/ExportXLSX': 'app/server/lib/ExportXLSXStub',
  'exceljs': 'exceljs/dist/es5/exceljs.browser.js',
};

base.resolve.fallback = {
  ...base.resolve.fallback,
  "crypto": require.resolve("crypto-browserify"), // because ActionHash
  "stream": require.resolve("stream-browserify"), // ditto
  "vm": false, //require.resolve("vm-browserify"),
  "net": false,
  "fs": false,
  "constants": false, //require.resolve("constants-browserify"),
  "os": false, //require.resolve("os-browserify/browser"),
  "fsevents": false,
  "http": false,
  "https": false,
  "zlib": false,
  "aws-sdk": false,
  "tls": false,
  "child_process": false,
  "http2": false,
  "worker_threads": false,
  "react-native-sqlite-storage": false,
};

// Webpack 5 treats `node:foo` imports as "unhandled" instead of going
// through resolve.fallback. Rewrite them here. webpack itself lives in
// core/node_modules; resolve explicitly via core's tree.
const webpack = require(path.join(process.cwd(), 'node_modules', 'webpack'));
base.plugins = base.plugins || [];
// stream and crypto need real polyfills (Transform etc.); everything
// else can no-op since it's server-side code only.
base.plugins.push(new webpack.NormalModuleReplacementPlugin(
  /^node:stream$/,
  (resource) => { resource.request = 'stream-browserify'; },
));
base.plugins.push(new webpack.NormalModuleReplacementPlugin(
  /^node:crypto$/,
  (resource) => { resource.request = 'crypto-browserify'; },
));
base.plugins.push(new webpack.NormalModuleReplacementPlugin(
  /^node:async_hooks$/,
  (resource) => { resource.request = 'app/server/lib/asyncHooksStub'; },
));
base.plugins.push(new webpack.NormalModuleReplacementPlugin(
  /^node:/,
  (resource) => { resource.request = 'app/server/lib/emptyStub'; },
));

// Source maps are off in some exceljs deps; mute the warning.
const sourceMapLoader = base.module.rules[1];
if (sourceMapLoader.use[0] !== 'source-map-loader') {
  throw new Error('cannot find source map loader');
}
sourceMapLoader.exclude = [
  /node_modules\/fast-csv/,
  /node_modules\/saxes/,
  /node_modules\/xmlchars/,
  /node_modules\/@fast-csv/
];

const webworker = {
  ...base,
  target: 'webworker',
  entry: {
    webworker: 'app/pipe/webworker',
  },
};

// (Per-entry library is set on the `doc` entry above.)

module.exports = [base, webworker];
