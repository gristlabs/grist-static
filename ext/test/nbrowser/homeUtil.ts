// Shadow of test/nbrowser/homeUtil. Two changes:
//   _getApiKey      -> HTTP-only, since the home-page SPA isn't running.
//   createHomeApi   -> route applyUserActions through the in-page bridge.
//
// Reaches upstream via a relative path because the bare module name
// would loop back to this shadow. tsc sees ext/ as core/ext/ via the
// make-requirements symlink.

import * as upstream from '../../../test/nbrowser/homeUtil';
import fetch from 'node-fetch';
import { driver } from 'mocha-webdriver';


// api.applyUserActions normally goes to the home server, which doesn't
// see the in-page sql.js copy and would silently diverge from it. Route
// through window.__staticTestBridge (installed by CommStub.openDoc).
// Outside the doc page there's no bridge; fall through to HTTP.
const origCreate = upstream.HomeUtil.prototype.createHomeApi;
(upstream.HomeUtil.prototype as any).createHomeApi = function createHomeApiShadow(
  this: InstanceType<typeof upstream.HomeUtil>, ...args: any[]
) {
  const api = origCreate.apply(this, args as any);
  const origApply = api.applyUserActions.bind(api);
  api.applyUserActions = async (docId: string, actions: any[]) => {
    const result = await driver.executeAsyncScript<any>(
      function (actionsJson: string, done: (r: any) => void) {
        const bridge = (window as any).__staticTestBridge;
        if (!bridge) { done({ noBridge: true }); return; }
        bridge.applyUserActions(JSON.parse(actionsJson)).then(
          (data: unknown) => done({ data }),
          (e: any) => done({ error: String((e && e.message) || e) }),
        );
      } as any,
      JSON.stringify(actions),
    );
    if (result && result.noBridge) { return origApply(docId, actions); }
    if (result && result.error) {
      throw new Error('grist-static apply route: ' + result.error);
    }
    return result && result.data;
  };
  return api;
};

(upstream.HomeUtil.prototype as any)._getApiKey = async function _getApiKeyShadow(
  this: InstanceType<typeof upstream.HomeUtil>
): Promise<string> {
  const sid = await this.getGristSid();
  if (!sid) { throw new Error('grist-static homeUtil shadow: no session id'); }
  const cookieName = process.env.GRIST_SESSION_COOKIE || 'grist_sid';
  const url = (this as any).server.getUrl('docs', '/api/profile/apiKey');
  // X-Requested-With is core's CSRF gate; POST returns 401 without it.
  const headers = {
    Cookie: `${cookieName}=${sid}`,
    'X-Requested-With': 'XMLHttpRequest',
  };
  // GET first; POST to create one if none yet.
  let res = await fetch(url, { headers });
  if (res.ok) {
    const key = await res.text();
    if (key) { return key; }
  }
  res = await fetch(url, { method: 'POST', headers });
  if (!res.ok) {
    throw new Error(`grist-static homeUtil shadow: POST apiKey ${res.status}`);
  }
  return await res.text();
};

export = upstream;
