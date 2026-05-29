# Hacking on grist-static

grist-static is regular Grist with the back-end pulled out. SQLite runs
in the browser via [sql.js](https://sql.js.org/), Python via
[Pyodide](https://pyodide.org/), and the rest of what used to want a
Node server is repackaged so it runs inside the page.

The repo is two trees side by side. `core/` is the unmodified
[grist-core](https://github.com/gristlabs/grist-core) submodule. `ext/`
is a parallel tree of replacement files: anything in `ext/` wins over
its counterpart in `core/` at build time, and `core/` is never edited.
Upgrading to a newer grist-core is `git checkout` in the submodule plus
fixing whatever the replacements drifted against.

Two override mechanisms, configured separately:

  * **Webpack** — `ext/buildtools/webpack.config.js` maps upstream
    module paths to ours.
  * **TypeScript** — the `paths` setting in our tsconfig resolves
    imports against `ext/` first.

If a change doesn't take effect, check both — they don't see each other.

## Running the tests

```
yarn test            # 3 quick known-green suites
yarn test:all        # 14 suites, more thorough
```

You'll need Chrome and chromedriver on PATH. `HEADLESS=0` shows the
browser; `DEBUG=1` runs mocha with `-b --no-exit`.

The pipeline reuses regular Grist's test infrastructure — login, doc
storage, the test framework itself. grist-static overrides exactly one
thing: the HTML the server hands back for the doc page. From the
test's point of view it's the same browser at the same URL on the same
doc, just running our bundle instead of upstream's.

## When something breaks

```
  page-side (testHarness.ts)              driver-side (mocha)
  ─────────────────────────               ───────────────────
  __staticErrors  (errors)         ┐      afterEach on failure:
  __staticFocus   (focus samples)  │  ←   reads __staticPostMortem()
  __staticKeys    (keystrokes)     │      → /tmp/grist-static-postmortem.log
  __staticTrace   (opt-in trace)   ┘
  1Hz state probe  ──────────────────→    POST /api/log
                                          → /tmp/grist_test_*/node.log
```

Three buffers + one opt-in trace ring run in the page; the mocha hook
reads them on failure via `window.__staticPostMortem()`. The 1Hz state
probe ships separately to the server log, so you can see how far boot
got even before any test ran.

Fastest to slowest:

  1. The browser console.
  2. `/tmp/grist-static-postmortem.log` — written on test failure;
     contains all four buffers plus DOM facts.
  3. `/tmp/grist_test_*/node.log` — search for `grist-static-probe`
     for the 1Hz state probe entries.

Set `window.__staticTraceOn = true` before page load to fill the trace
ring (opt-in: comm/python pairs would otherwise fire constantly). Set
`GRIST_STATIC_APPLY_DELAY_MS=N` to make CommStub sleep N ms after each
user action — useful for reproducing races.

Other test-mode files in `/tmp`, less often useful:

  * `/tmp/grist-static-404s.log` — assets the server failed to find.
  * `/tmp/grist-static-rendered-doc.html` — the HTML for the doc page
    on the most recent test run.
  * `/tmp/grist-static-shadow-probe.txt` — written once at NODE_PATH
    setup, proves which `_build/ext` shadows are winning.

The page-side observability lives in `ext/app/pipe/testHarness.ts`
and `ext/app/server/lib/testmode/`. Production runtime stubs (e.g.
`gristStubs.ts`, `asyncHooksStub.ts`) sit outside `testmode/`.

## Upgrading grist-core

Check out a new sha in `core/`, then `make build`. Breakages usually
fall into one of:

  1. **Webpack can't find a file.** Upstream renamed or moved something
     a webpack alias was pointing at. Walk the alias list.
  2. **Missing method at runtime.** Upstream added something to an
     interface our replacement file is supposed to satisfy. TypeScript
     catches most; the rest show up as "X is not a function."
  3. **Python wheels.** Data-engine deps changed.
     `ext/app/pipe/package_filenames.json` is stale; compare with the
     regenerated `core/sandbox/pyodide/package_filenames.json` after
     `make requirements`.

A small upgrade is rarely deeper than that. A long jump usually pulls
in toolchain changes too: a newer Pyodide (see below), webpack's
handling of `node:` imports under a newer Node, refreshed wheel
filenames. Budget more than the three bullets when the submodule has
moved by hundreds of commits.

## Upgrading Python / Pyodide

The big one: **Pyodide and grist-core's Python version need to match.**
Pyodide ships with a specific CPython baked in (0.23 → 3.11, 0.28 →
3.13), and the wheels we load must match that version's `cp3XX` tag. If
core has moved on to a newer Python and `ext/package.json` is still on
the old Pyodide, every wheel will 404 and you'll spend an afternoon
chasing ghosts. Bump Pyodide first; the rest tends to follow.

Also skim Pyodide's release notes for JS↔Python bridge changes — 0.28
started returning a `JsNull` proxy in place of `None`, which there's a
`convertNullToNone: true` opt-in to undo.

## Things that don't behave like normal Grist

  * **`AsyncLocalStorage`.** Node has it; browsers don't. Our shim keeps
    the store set across awaited promises so SQLite transactions don't
    deadlock.
  * **Refresh persistence in tests.** No server-side storage, so a
    `refresh()` would lose state. We snapshot the SQLite bytes to
    `sessionStorage` on `pagehide` and restore them on next load.
    Test-mode only.
  * **Test API to page bridge.** The test framework's `applyUserActions`
    normally hits the home server; in static mode the home server
    doesn't have the live doc. A small bridge on `window` routes those
    calls into the in-page code.
