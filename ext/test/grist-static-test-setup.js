// Mocha --require hook. Two jobs:
//   1. Reorder app-module-path so our test-side shadows (e.g.
//      ext/test/nbrowser/homeUtil.ts) win over upstream. Order matches
//      NODE_PATH in scripts/test_nbrowser.sh.
//   2. Register mochaHooks for per-test apply-delay knob and on-failure
//      post-mortem. The page-side observability (errors, focus, keys,
//      trace, plus the snapshot reader window.__staticPostMortem) lives
//      in ext/app/pipe/testHarness.ts; this file is the driver-side
//      reader that writes the snapshot to /tmp on failure.
//
// Can't shadow setupPaths.js itself: mocha resolves --require args via
// fs.existsSync(cwd-relative) before NODE_PATH gets a chance.

const path = require('path');
const fs = require('fs');
// Resolve via GRIST_STATIC_CORE_DIR (set by scripts/test_nbrowser.sh)
// rather than cwd, so this works regardless of where the script ran from.
const root = process.env.GRIST_STATIC_CORE_DIR || process.cwd();
const appModulePath = require(path.join(root, 'node_modules', 'app-module-path'));

const ordered = [
  path.join(root, '_build/stubs'),
  path.join(root, '_build/ext'),
  path.join(root, '_build'),
  path.join(root, '_build/core'),
];
for (const p of ordered) { appModulePath.removePath(p); }
for (const p of ordered) { appModulePath.addPath(p); }

const POSTMORTEM_LOG = '/tmp/grist-static-postmortem.log';

// Same realpath quirk as the appModulePath setup above: __filename ends
// up under grist-static/ext/test/ where ../node_modules isn't findable.
function getDriver() {
  try {
    return require(path.join(root, 'node_modules', 'mocha-webdriver')).driver;
  } catch (_e) { return null; }
}

function writeLog(header, body) {
  fs.appendFileSync(POSTMORTEM_LOG,
    '\n=== ' + new Date().toISOString() + ' ' + header + ' ===\n' +
    (typeof body === 'string' ? body : JSON.stringify(body, null, 2)) + '\n');
}

// Read the page's post-mortem with a timeout; the driver may be wedged.
async function readPostMortem(driver) {
  return Promise.race([
    driver.executeScript('return window.__staticPostMortem && window.__staticPostMortem();'),
    new Promise((_r, rej) => setTimeout(() => rej(new Error('snapshot timeout 4s')), 4000)),
  ]);
}

exports.mochaHooks = {
  // Push the apply-delay knob into the page before each test; the page
  // reload wipes it. CommStub reads it from window.
  beforeEach: [async function pushApplyDelay() {
    const driver = getDriver();
    if (!driver) { return; }
    try {
      const applyDelay = parseInt(process.env.GRIST_STATIC_APPLY_DELAY_MS || '0', 10);
      await driver.executeScript(
        'window.__staticApplyDelayMs=arguments[0];',
        isNaN(applyDelay) ? 0 : applyDelay,
      );
    } catch (_e) { /* page might not be ready yet */ }
  }],
  // "before all" failures don't fire afterEach. afterAll runs once per
  // file so initial-load failures aren't lost.
  afterAll: [async function dumpAfterAll() {
    const driver = getDriver();
    if (!driver) { return; }
    try {
      writeLog('AFTER-ALL', await readPostMortem(driver));
    } catch (e) {
      writeLog('AFTER-ALL FAILED', String(e));
    }
  }],
  afterEach: [async function postMortem() {
    if (!this.currentTest || this.currentTest.state !== 'failed') { return; }
    const driver = getDriver();
    if (!driver) { writeLog('NO DRIVER', ''); return; }
    let snapshot;
    try { snapshot = await readPostMortem(driver); }
    catch (e) { snapshot = {error: String(e)}; }
    writeLog(this.currentTest.fullTitle(), snapshot);
  }],
};
