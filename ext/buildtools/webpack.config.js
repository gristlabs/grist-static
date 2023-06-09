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
  'app/server/utils/ProxyAgent': 'app/server/lib/ProxyAgentStub',
  'app/client/Hooks': 'app/client/HookStub',
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

base.output = {
  ...base.output,
  library: 'gristy',
  libraryTarget: 'window',
  libraryExport: 'default',
};

base.module.rules.unshift({
  test: /py\.js$/,
  type: 'asset'
});

const webworker = {
  ...base,
  target: 'webworker',
  entry: {
    webworker: 'app/pipe/webworker',
  },
};

module.exports = [base, webworker];
