// Browser stub for app/server/lib/ProxyAgent (swapped in via the webpack
// alias in ext/buildtools/webpack.config.js). grist-static runs in the
// browser, where there is no Node http(s) proxy agent: trusted/untrusted
// agents are always undefined and fetch is used directly. This must export
// every name the bundled code imports from the real ProxyAgent, or those
// imports resolve to `undefined` and blow up at first use (e.g.
// WidgetRepository reading `agents.trusted` while loading custom widgets).

export function proxyAgent() {
  return undefined;
}

export const agents: { trusted: undefined; untrusted: undefined } = {
  trusted: undefined,
  untrusted: undefined,
};

export function isUntrustedRequestBehaviorSet() {
  return false;
}

export async function fetchUntrustedWithAgent(
  requestUrl: URL | string, options?: Omit<RequestInit, "agent">
) {
  return await fetch(requestUrl, options);
}
