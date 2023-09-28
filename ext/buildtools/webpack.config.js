const path = require('path');

// Get path to top-level node_modules if in a yarn workspace.
// Otherwise node_modules one level up won't get resolved.
// This is used in Electron packaging.
const up = path.dirname(path.dirname(require.resolve('pyodide')));

// Load the core webpack configuration
const base = require('../../core/buildtools/webpack.config.js');

base.entry = {
  ...base.entry,
  doc: 'app/server/Doc',
};

base.resolve.modules.push(up);

base.resolve.alias = {
  ...base.resolve.alias,
  'app/server/lib/GoogleImport': 'app/server/lib/GoogleImportStub',
  'app/server/lib/Requests': 'app/server/lib/RequestsStub',
  'app/server/lib/log': 'app/server/lib/logStub',
  'module': 'app/server/lib/moduleStub',
  'app/server/lib/SqliteNode': 'app/server/lib/SqliteNodeStub',
  '@gristlabs/connect-sqlite3': 'app/server/lib/connectSqlite3Stub',
  '@gristlabs/pidusage': 'app/server/lib/pidUsageStub',
  'child_process': 'app/server/lib/childProcessStub',
  'tmp': 'app/server/lib/tmpStub',
  'app/client/components/Comm': 'app/server/lib/CommStub',
  'app/server/lib/ProxyAgent': 'app/server/lib/ProxyAgentStub',
  'app/client/Hooks': 'app/client/HookStub',
  'app/gen-server/lib/HomeDBManager': 'app/server/lib/HomeDBManagerStub',
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

// There's something a little off in source maps in some exceljs
// dependencies - tell webpack we don't care.
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

base.output = {
  ...base.output,
  library: 'gristy',
  libraryTarget: 'window',
  libraryExport: 'default',
};

module.exports = [base, webworker];
