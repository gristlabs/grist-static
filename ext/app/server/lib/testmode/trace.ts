// Opt-in trace ring. Off by default; tests flip `window.__staticTraceOn = true`.
// The mocha post-mortem dumps the buffer on failure.

export type TraceCategory =
  | 'comm'      // CommStub._makeRequest start/end/err per GristServerAPI method.
  | 'py'        // PyodideSandbox.pyCall start/end/err per python entry point.
  | 'open'      // CommStub.openDoc step labels.
  | 'broadcast' // CommStub.handleMessage incoming messages by type.
  ;

const MAX_ENTRIES = 500;

export function traceOn(): boolean {
  if (typeof window === 'undefined') { return false; }
  return Boolean(window.__staticTraceOn);
}

export function trace(cat: TraceCategory, msg: string, extra?: unknown): void {
  if (!traceOn()) { return; }
  const buf = (window.__staticTrace = window.__staticTrace || []);
  buf.push({ t: Math.round(performance.now()), cat, msg, ...(extra !== undefined ? { extra } : {}) });
  if (buf.length > MAX_ENTRIES) { buf.shift(); }
}

// Wrap a promise-returning fn with start/end/err events. Returns fn()'s
// promise verbatim when tracing is off.
export function traceWrap<T>(cat: TraceCategory, name: string, fn: () => Promise<T>): Promise<T> {
  if (!traceOn()) { return fn(); }
  trace(cat, name + ':start');
  return fn().then(
    v => { trace(cat, name + ':end'); return v; },
    e => {
      trace(cat, name + ':err', String((e && e.message) || e).substring(0, 200));
      throw e;
    },
  );
}
