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
};

base.output = {
  ...base.output,
  library: 'gristy',
  libraryTarget: 'window',
  libraryExport: 'default',
};


module.exports = base;

/*
module.exports = {
  target: 'web',
  entry: {
    main: "app/client/app",
    errorPages: "app/client/errorMain",
    account: "app/client/accountMain",
    billing: "app/client/billingMain",
    activation: "app/client/activationMain",
    doc: "app/server/Doc"
  },
  output: {
    filename: "[name].bundle.js",
    sourceMapFilename: "[file].map",
    path: path.resolve("./static"),
    // Workaround for a known issue with webpack + onerror under chrome, see:
    //   https://github.com/webpack/webpack/issues/5681
    // "We use a source map plugin here with this special configuration
    // because if we do not - the window.onerror function does not work properly in chrome
    // and it swallows the errors because normally source maps have begin with webpack:///
    // here we are changing how the module file names are created
    // See this bug
    // https://bugs.chromium.org/p/chromium/issues/detail?id=765909
    //  See this for syntax
    // https://webpack.js.org/configuration/output/#output-devtoolmodulefilenametemplate
    // "
    devtoolModuleFilenameTemplate: "[resourcePath]?[loaders]",
    crossOriginLoading: "anonymous",
    library: 'gristy',
    libraryTarget: 'window',
    libraryExport: 'default'
  },
  // This creates .map files, and takes webpack a couple of seconds to rebuild while developing,
  // but provides correct mapping back to typescript, and allows breakpoints to be set in
  // typescript ("cheap-module-eval-source-map" is faster, but breakpoints are largely broken).
  devtool: "source-map",
  resolve: {
    extensions: ['.ts', '.js'],
    modules: [
      path.resolve('.'),
      path.resolve('./ext'),
      path.resolve('./stubs'),
      path.resolve('./node_modules'),
      base,
    ],
    fallback: {
      'path': require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"), // because lazy
      "stream": require.resolve("stream-browserify"),
      "vm": require.resolve("vm-browserify"),
      "net": false,
      "fs": false,
      "constants": require.resolve("constants-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "fsevents": false,
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'ts',
          target: 'es2017',
          sourcemap: true,
        },
        exclude: /node_modules/
      },
      { test: /\.js$/,
        use: ["source-map-loader"],
        enforce: "pre"
      }
    ]
  },
  plugins: [
    // Some modules assume presence of Buffer and process.
    new ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer']
    }),
    // To strip all locales except “en”
    new MomentLocalesPlugin()
  ],
};
*/
