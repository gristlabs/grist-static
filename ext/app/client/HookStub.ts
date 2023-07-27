import { defaultHooks, IHooks } from 'app/client/DefaultHooks';
import { IGristUrlState } from 'app/common/gristUrls';
import { gristOverrides } from 'app/pipe/GristOverrides';

export const hooks: IHooks = {
  ...defaultHooks,
  iframeAttributes: {
    credentialless: true,
  },
  fetch: fetcher,
  baseURI: gristOverrides.bootstrapGristPrefix,
  urlTweaks: {
    postEncode,
    preDecode,
  },
};
console.log({hooks});

function fetcher(...args: any[]) {
  if ((window as any).fetchHook) {
    return (window as any).fetchHook(...args);
  }
  return (fetch as any)(args);
}

function preDecode(options: {
  url: URL,
}) {
  const fakeUrl = gristOverrides.fakeUrl;
  if (!fakeUrl) {
    return;
  }
  const at = new URL(options.url.href);
  let extra = at.searchParams.get('part');
  if (!extra) {
    const p = at.searchParams.get('p');
    if (p) {
      extra = `/p/${p}`;
    }
  }
  const location = new URL(fakeUrl + (extra || ''));
  location.search = at.search;
  if (gristOverrides.light) {
    location.searchParams.set('embed', 'true');
    location.searchParams.set('style', 'light');
  }
  location.hash = at.hash;
  options.url.href = location.href;
  console.log({options});
}

function postEncode(options: {
  url: URL,
  parts: string[],
  state: IGristUrlState,
  baseLocation: Location | URL,
}): void {
  const {url, parts} = options;
  const fakeUrl = gristOverrides.fakeUrl;
  if (!fakeUrl) {
    return;
  }
  const at = new URL(location.href);
  const queryStr = url.search;
  at.search = queryStr;
  if (parts[0] === '/') {
    parts.shift();
  }
  if (parts[0] === 'o/docs/') {
    parts.shift();
  }
  if (parts[0]?.startsWith('doc/')) {
    parts.shift();
  }
  if (parts.length === 1 && parts[0].startsWith('/p/')) {
    at.searchParams.set('p', parts[0].slice(3));
  } else {
    at.searchParams.set('part',
                        parts.join(''));
  }
  at.hash = url.hash;
  url.href = at.href;
}
