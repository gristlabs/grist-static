/**
 * Smoke test for the Puter integration's save and reopen paths. Drives a
 * real cell edit + Save click against page/index_puter_test.html, which
 * boots grist-static with a stub window.puter that records every save.
 */
import {assert, driver} from "mocha-webdriver";
import * as gu from "test/nbrowser/gristUtils";
import {server, setupTestSuite} from "test/nbrowser/testUtils";
import * as fse from "fs-extra";
import * as path from "path";

// FlexServer's static_ext mount only fires for /v/<tag>/ URLs and is
// only registered if the directory exists at server-start time. Seed it
// at module load, before setupTestSuite's before() hook starts the server.
// Symlinks (not copies) so edits to page/ are picked up live.
(function () {
  const coreDir = process.env.GRIST_STATIC_CORE_DIR!;
  const pageDir = path.resolve(coreDir, "..", "page");
  const dir = path.join(coreDir, "static_ext");
  fse.ensureSymlinkSync(path.join(pageDir, "index_puter_test.html"),
                        path.join(dir, "index_puter_test.html"));
  fse.ensureSymlinkSync(path.join(pageDir, "puter.js"), path.join(dir, "puter.js"));
  // The html references "static/pipe/bootstrap.js"; under /v/<tag>/ it
  // needs static_ext/static -> core/static for the path to resolve.
  fse.ensureSymlinkSync(path.join(coreDir, "static"), path.join(dir, "static"));
})();

interface PuterCall { method: string; name: string | null; bytes: number[]; }

const MARKER = "PuterTestMarker";

const PAGE_URL = (qs = "") =>
  `${server.getHost()}/v/gtag/index_puter_test.html${qs}`;

async function getCalls(): Promise<PuterCall[]> {
  return driver.executeScript<PuterCall[]>("return window.__puterTest.calls");
}

async function waitForCalls(n: number) {
  await driver.wait(async () =>
    await driver.executeScript<number>(
      "return window.__puterTest.calls.length") >= n, 15_000);
}

async function clickSave() {
  // puter.js's NewHooks intercepts clicks on toolbar buttons whose label
  // starts with "Save".
  const btn = await driver.findContentWait(".test-tb-share-action", /Save/, 10_000);
  await btn.click();
}

describe("StaticPuter", function() {
  this.timeout(120_000);
  setupTestSuite();

  before(async function() {
    // Any /v/<tag>/ value works (TagChecker is permissive).
    await driver.get(PAGE_URL());
    await driver.findWait(".test-gristdoc", 30_000);
    await gu.waitForServer();
  });

  it("hands the user's edits to the Puter SDK on Save", async function() {
    await gu.enterCell(MARKER);
    await gu.waitForServer();
    await clickSave();
    await waitForCalls(1);

    // Second save: the toolbar's Save button hides after markAsSaved(true)
    // fires, so drive save() directly — same code path the click handler
    // invokes. _puterFSItem is now set, so puter.js takes the fs.write
    // branch instead of popping another picker.
    await driver.executeScript(
      "return window.gristOverrides.behaviorOverrides.save()");
    await waitForCalls(2);

    const calls = await getCalls();
    assert.lengthOf(calls, 2);
    assert.equal(calls[0].method, 'showSaveFilePicker');
    assert.equal(calls[1].method, 'fs.write');

    const bytes = new Uint8Array(calls[1].bytes);
    const text = new TextDecoder("latin1").decode(bytes);
    assert.equal(text.slice(0, 16), "SQLite format 3\0");
    // SQLite stores TEXT inline; latin1 substring-search avoids encoding details.
    assert.include(text, MARKER);

    // Stash for the reopen test in-browser, so we don't shuttle the bytes
    // through node and back.
    await driver.executeScript(
      "sessionStorage.setItem('puterTestReopenBytes', " +
      "JSON.stringify(window.__puterTest.calls[1].bytes))");
  });

  it("reopens saved bytes and surfaces the user's edits", async function() {
    await driver.get(PAGE_URL("?reopen=1"));
    await driver.findWait(".test-gristdoc", 30_000);
    await gu.waitForServer();
    await driver.findContentWait(".test-gristdoc", new RegExp(MARKER), 10_000);
  });
});
