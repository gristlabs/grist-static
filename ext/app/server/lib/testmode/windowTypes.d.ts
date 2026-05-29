// Window augmentations for the in-page server-side modules. Same idea
// as core/app/client/lib/GristWindow.ts. Page-side test-mode globals
// (__staticFocus, __staticKeys) are declared inside testHarness.ts,
// which targets the pipe/ tsconfig and doesn't see this file.

interface StaticErrorEntry {
  t: number;
  msg: string;
  filename?: string;
  lineno?: number;
  stack?: string;
}

interface StaticTraceEntry {
  t: number;
  cat: string;
  msg: string;
  extra?: unknown;
}

interface StaticTestBridge {
  applyUserActions(actions: unknown[]): Promise<unknown>;
}

declare global {
  interface Window {
    // Test-mode globals.
    __staticTrace?: StaticTraceEntry[];
    __staticTraceOn?: boolean;
    __staticErrors?: StaticErrorEntry[];
    __staticTestBridge?: StaticTestBridge;
    __staticApplyDelayMs?: number;

    // Set up by bootstrap.js / pipe/components.js. Permissive types
    // since the consumer-page surface is wide.
    // (gristConfig is typed by core's GristWindow.ts, included by our
    // server tsconfig.)
    bootstrapGrist?: (options: any) => void;
    gristy?: any;
    gristOverrides?: any;

    // Production hooks: CommStub installs them, HookStub reads them.
    // On window so consumers can override.
    fetchHook?: (...args: any[]) => any;
    uploadHook?: (...args: any[]) => any;
  }
}

export {};
