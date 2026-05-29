// First script on the doc page in test mode (see sendAppPage.ts):
// captures errors, runs a focus/key recorder, and ships periodic state
// snapshots to /api/log so failed runs have a record of how far init got.
//
// Reaches into gristApp/pageModel internals on purpose; expect drift.
// Window globals (__staticErrors, __staticFocus, __staticKeys, etc.)
// are typed in ext/app/server/lib/testmode/windowTypes.d.ts; this bundle
// targets `pipe` rather than `server`, so the d.ts isn't in scope here
// and the local interfaces below stand in.

interface StaticErrorEntry {
  t: number;
  msg: string;
  filename?: string;
  lineno?: number;
  stack?: string;
}

declare global {
  interface Window {
    __staticErrors?: StaticErrorEntry[];
    __staticTraceOn?: boolean;
    __staticTrace?: any[];
    __staticFocus?: Array<[number, number, string]>;
    __staticKeys?: Array<[number, string, string]>;
    __staticPostMortem?: () => Record<string, unknown>;
    gristApp?: any;
    gristy?: any;
    bootstrapGrist?: any;
    gristOverrides?: any;
  }
}

// Buffer caps. Tuned so post-mortem JSON stays a few hundred KB at most.
const ERROR_BUFFER_MAX = 30;
const FOCUS_BUFFER_MAX = 600;
const KEYS_BUFFER_MAX = 60;

// Sampling cadence.
const FOCUS_SAMPLE_MS = 100;        // 10Hz focus/keystroke recorder.
const STATE_PROBE_MS = 1000;        // 1Hz state probe ship.
// Skip identical snapshot ships up to this gap; one heartbeat at the
// boundary keeps "harness alive" detectable even on idle pages.
const HEARTBEAT_MS = 30_000;

// Slice limits for what __staticPostMortem returns.
const POSTMORTEM_FOCUS = 200;
const POSTMORTEM_KEYS = 60;
const POSTMORTEM_TRACE = 200;
const POSTMORTEM_ERRORS = 30;

const SELECTORS = {
  viewSection: '.viewsection_title',
  mainBundle: 'script[src*="main.bundle"]',
  bootstrapJs: 'script[src*="pipe/bootstrap"]',
  gristDoc: '.test-gristdoc',
  logo: '.grist-logo-wrapper, #grist-logo-wrapper',
  loader: '#grist-static-loader',
  appRoot: '.test-app, .grist-app, body > .grist',
};

function ship(msg: string): void {
  try {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/log', true);
    x.setRequestHeader('Content-Type', 'application/json');
    x.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    x.send(JSON.stringify({event: 'grist-static-probe', browser: msg}));
  } catch (_e) { /* ignore */ }
}

function pushError(entry: StaticErrorEntry): void {
  const buf = window.__staticErrors = window.__staticErrors || [];
  buf.push(entry);
  if (buf.length > ERROR_BUFFER_MAX) { buf.shift(); }
}

function installErrorCapture(): void {
  if (window.__staticErrors) { return; }
  window.__staticErrors = [];
  // Webpack chunk-load failures don't always fire window 'error'.
  const origErr = console.error;
  console.error = function (...args: any[]) {
    try {
      pushError({
        t: Math.round(performance.now()),
        msg: 'console.error: ' + args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); }
          catch { return String(a); }
        }).join(' ').substring(0, 400),
      });
    } catch { /* swallow; never let logging crash the page */ }
    return origErr.apply(this, args as any);
  };
  window.addEventListener('error', (e: ErrorEvent) => {
    const entry: StaticErrorEntry = {
      t: Math.round(performance.now()),
      msg: String(e.message || e),
      filename: String(e.filename || ''),
      lineno: e.lineno,
      stack: (e.error && e.error.stack) ? String(e.error.stack).substring(0, 800) : '',
    };
    pushError(entry);
    ship(`ERR ${entry.msg} @${entry.filename}:${entry.lineno} || ${entry.stack}`);
  });
  window.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
    const reason: any = e.reason;
    const msg = 'unhandledrejection: ' + String((reason && reason.message) || reason || '');
    pushError({t: Math.round(performance.now()), msg});
    ship(msg);
  });
}

// Read `o`, calling .get() if it looks like an observable.
function peek(o: any): any {
  try { return (typeof o === 'object' && o && o.get) ? o.get() : o; }
  catch (_e) { return 'err'; }
}

function safeStringify(fn: () => any, maxLen: number): string {
  try { return JSON.stringify(fn()).substring(0, maxLen); }
  catch (e) { return 'err:' + e; }
}

function keys(o: any, n = 15): string {
  return o ? Object.keys(o).slice(0, n).join(',') : '';
}

function snapshot(probe: number): Record<string, unknown> {
  const d = document;
  const ga = window.gristApp;
  const pm = ga && ga.pageModel;
  const firstChild = d.body && d.body.firstElementChild;
  const ae = d.activeElement;
  const has = (sel: string) => !!d.querySelector(sel);
  return {
    probe,
    t: Math.round(performance.now()),
    gristy: typeof window.gristy,
    bootstrapGrist: typeof window.bootstrapGrist,
    gristOverridesSeed: !!(window.gristOverrides && window.gristOverrides.seedFile),
    hasViewSection: has(SELECTORS.viewSection),
    hasMainBundle: has(SELECTORS.mainBundle),
    hasBootstrapJs: has(SELECTORS.bootstrapJs),
    hasGristDoc: has(SELECTORS.gristDoc),
    hasLogo: has(SELECTORS.logo),
    hasLoader: has(SELECTORS.loader),
    bodyChildren: d.body ? d.body.childElementCount : 0,
    ae: ae && ae.tagName,
    pending: ga && ga.testNumPendingApiRequests && ga.testNumPendingApiRequests(),
    commActive: ga && ga.comm && ga.comm.hasActiveRequests && ga.comm.hasActiveRequests(),
    commConnected: ga && ga.comm && ga.comm._isConnected,
    docInited: !!(ga && ga.allDocs && ga.allDocs().length),
    firstBodyId: firstChild && firstChild.id,
    firstBodyClass: firstChild && (firstChild.className || '').toString().substring(0, 80),
    appRootEmpty: appRootChildCount(d),
    gaKeys: keys(ga, 20),
    gaTopState: ga && ga.topAppModel ? `isLoading=${peek(ga.topAppModel.isLoading)}` : '',
    gaCurrentDoc: !!(ga && ga.currentDoc),
    gaPageModelType: pm && pm.constructor && pm.constructor.name || '',
    gaPageModelKeys: keys(pm),
    gaUrlState: urlStateSnapshot(ga),
    gaTopAppKeys: keys(ga && ga.topAppModel),
    gaDocPageState: docPageStateSnapshot(pm),
    bodyOutline: bodyOutline(d),
    scripts: scriptsSnapshot(d),
    recentErrors: (window.__staticErrors || []).slice(-5),
  };
}

// Per-<script src> load state. transferSize/decodedSize are 0 when the
// resource didn't return Timing-Allow-Origin (cross-origin masking) —
// distinguish via hasEntry: true with size 0 vs false (never fetched).
function scriptsSnapshot(d: Document): Array<Record<string, unknown>> {
  const perfEntries = (window.performance && window.performance.getEntriesByType)
    ? window.performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    : [];
  const byName = new Map<string, PerformanceResourceTiming>();
  for (const e of perfEntries) { byName.set(e.name, e); }
  const out: Array<Record<string, unknown>> = [];
  d.querySelectorAll('script[src]').forEach((el) => {
    const s = el as HTMLScriptElement;
    const entry = byName.get(s.src);
    out.push({
      src: s.src.split('/').slice(-2).join('/'),
      hasEntry: !!entry,
      transferSize: entry ? Math.round(entry.transferSize) : null,
      decodedSize: entry ? Math.round(entry.decodedBodySize) : null,
      duration: entry ? Math.round(entry.duration) : null,
    });
  });
  return out;
}

function appRootChildCount(d: Document): number {
  const r = d.querySelector(SELECTORS.appRoot);
  return r ? r.children.length : -1;
}

function urlStateSnapshot(ga: any): string {
  if (!(ga && ga.appModel && ga.appModel.urlState)) { return ''; }
  return safeStringify(() => ga.appModel.urlState.state.get(), 200);
}

function docPageStateSnapshot(pm: any): string {
  if (!pm) { return 'no-pm'; }
  return safeStringify(() => ({
    pageType: peek(pm.pageType),
    docId: peek(pm.currentDocId),
    docTitle: peek(pm.currentDocTitle),
    hasGristDoc: !!peek(pm.gristDoc),
    docUsage: !!peek(pm.currentDocUsage),
    isReadonly: peek(pm.isReadonly),
    offerRecovery: peek(pm.offerRecovery),
  }), 300);
}

function bodyOutline(d: Document): string {
  if (!d.body) { return ''; }
  const out: string[] = [];
  for (let i = 0; i < d.body.children.length; i++) {
    const el = d.body.children[i];
    const cls = (el.className || '').toString().split(' ').slice(0, 2).join('.');
    out.push(`${el.tagName}#${el.id || ''}.${cls}`);
  }
  return out.join(',').substring(0, 400);
}

function installStateProbe(): void {
  let probeCount = 0;
  let lastShipped = '';
  let lastShippedAt = 0;
  const id = setInterval(() => {
    probeCount++;
    try {
      const snap = snapshot(probeCount);
      // Drop the timestamp from the comparison key so settled pages
      // don't ship a fresh frame every second just because `t` advanced.
      const now = performance.now();
      const t = snap.t;
      snap.t = 0;
      const stable = JSON.stringify(snap);
      if (stable === lastShipped && now - lastShippedAt < HEARTBEAT_MS) { return; }
      lastShipped = stable;
      lastShippedAt = now;
      snap.t = t;
      ship('STATE ' + JSON.stringify(snap));
    } catch (_e) { /* ignore */ }
  }, STATE_PROBE_MS);
  window.addEventListener('pagehide', () => clearInterval(id));
}

// 10Hz focus + keystroke buffers, deduped to changes only.
function installRecorder(): void {
  if (window.__staticFocus) { return; }
  const buf: Array<[number, number, string]> = [];
  const keyBuf: Array<[number, string, string]> = [];
  window.__staticFocus = buf;
  window.__staticKeys = keyBuf;
  let lastBit = -1;
  let lastTag = '';
  const sample = () => {
    const ae = document.activeElement as HTMLElement | null;
    const allCp = document.querySelectorAll('.copypaste');
    const firstCp = allCp[0];
    // Pack copypaste-count into the bit field so "absent" and
    // "present-but-unfocused" stay distinguishable.
    const focusBit = firstCp && firstCp === ae ? 1 : 0;
    const bit = focusBit | (allCp.length << 1);
    const tag = ae ? `${ae.tagName}.${(ae.className || '').toString().split(' ')[0]}` : '';
    if (bit !== lastBit || tag !== lastTag) {
      buf.push([Math.round(performance.now()), bit, tag]);
      if (buf.length > FOCUS_BUFFER_MAX) { buf.shift(); }
      lastBit = bit;
      lastTag = tag;
    }
  };
  const id = setInterval(sample, FOCUS_SAMPLE_MS);
  sample();
  ['focus', 'focusin', 'blur', 'focusout'].forEach(evt => {
    document.addEventListener(evt, sample, true);
  });
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    keyBuf.push([
      Math.round(performance.now()),
      e.key,
      `${t && t.tagName}.${((t && t.className) || '').toString().split(' ')[0]}`,
    ]);
    if (keyBuf.length > KEYS_BUFFER_MAX) { keyBuf.shift(); }
  }, true);
  window.addEventListener('pagehide', () => clearInterval(id));
}

// Selectors for visible-floating-UI to capture in post-mortems.
const FLOAT_SELECTORS = [
  '.test-column-title-popup', '.grist-floating-menu',
  '.test-tooltip', '.test-dropdown', '.modal', '.weasel-popup-open',
  '.test-cell-editor', '.celleditor_text_editor', '.formula_editor',
  '.ace_autocomplete',
];

function isVisible(el: Element): boolean {
  const r = el.getBoundingClientRect();
  const s = window.getComputedStyle(el);
  return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
}

// Called from the mocha driver via executeScript on test failure.
function installPostMortem(): void {
  window.__staticPostMortem = (): Record<string, unknown> => {
    const ae = document.activeElement;
    const ga = window.gristApp;
    const floats: Array<{sel: string, text: string}> = [];
    FLOAT_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (isVisible(el)) {
          floats.push({sel, text: ((el as HTMLElement).innerText || '').substring(0, 60)});
        }
      });
    });
    const copypaste = document.querySelector('.copypaste');
    return {
      url: location.href,
      activeTag: ae && ae.tagName,
      activeClasses: ae && (ae.className || '').toString().substring(0, 100),
      activeId: ae && ae.id,
      copypasteExists: !!copypaste,
      copypasteHasFocus: copypaste === ae,
      pendingApi: ga && ga.testNumPendingApiRequests && ga.testNumPendingApiRequests(),
      commActive: ga && ga.comm && ga.comm.hasActiveRequests && ga.comm.hasActiveRequests(),
      floats,
      focus: (window.__staticFocus || []).slice(-POSTMORTEM_FOCUS),
      keys: (window.__staticKeys || []).slice(-POSTMORTEM_KEYS),
      trace: (window.__staticTrace || []).slice(-POSTMORTEM_TRACE),
      errors: (window.__staticErrors || []).slice(-POSTMORTEM_ERRORS),
    };
  };
}

installErrorCapture();
installRecorder();
installStateProbe();
installPostMortem();
