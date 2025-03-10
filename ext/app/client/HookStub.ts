import { defaultHooks, IHooks } from 'app/client/DefaultHooks';
import { IGristUrlState } from 'app/common/gristUrls';
import { getGristConfig } from 'app/common/urlUtils';
import { gristOverrides } from 'app/pipe/GristOverrides';
import { setupNewHooks } from 'app/client/NewHooks';
import type { FileDialogOptions } from 'app/client/ui/FileDialog';
import { IAttrObj } from 'grainjs';

export interface IHooksExtended extends IHooks {
  save?: () => void;

  // If set, used to implement FileDialog's open(), used in for importing files.
  open?: (options: FileDialogOptions) => Promise<FileList>;

  // If set, this is called in place of XMLHttpRequest's send() method when the body argument is
  // FormData. Note that this will also affect fetch() requests with such body. The original send
  // method is passed in as the last argument.
  // Hook should emit events on the xhr object appropriately. Upload code uses:
  //    xhr.addEventListener('load', ...)
  //    xhr.addEventListener('error', ...)
  //    xhr.upload.addEventListener('progress', ...)
  upload?: (xhr: XMLHttpRequest, formData: FormData, send: typeof XMLHttpRequest.prototype.send) => void;
}

export const hooks: IHooksExtended = {
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
  maybeModifyLinkAttrs,
  save: gristOverrides.behaviorOverrides?.save,
  open: gristOverrides.behaviorOverrides?.open,
  upload: (...args) => (window as any).uploadHook?.(...args),
};

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
  if (gristOverrides.singlePage) {
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

/**
 * Information about a download the user has requested.
 */
interface DownloadInfo {
  data: any;     // The body of the response.
  name: string;  // A name assigned in a header or elsewhere.
  type: string;  // The mime type associated with the body.
}

/**
 * Trigger a download of some prepared data in the browser.
 * Must be called ultimately by a user clicking on a link
 * or button, or the browser will deny a simulated click
 * used in the implementation.
 */
async function downloadInBrowser({data, name, type}: DownloadInfo) {
  const blob = new Blob([data], {type});
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.URL.revokeObjectURL(url);
}

/**
 * Given a URL of some document API REST endpoint, call
 * the "back-end" code for it, and then try to determine
 * the name and type (and content) of the response.
 */
async function fetchFromDocApi(href: string): Promise<DownloadInfo> {
  // Figure out the path relative to the home URL
  const config = getGristConfig();
  if (!config?.homeUrl) {
    // Not expected.
    throw new Error('fetchFromDocApi needs homeUrl');
  }
  if (!href.startsWith(config.homeUrl)) {
    // Not expected.
    throw new Error('Endpoint does not have expected base URL');
  }
  const pathname = '/' + href.split(config.homeUrl)[1];

  // Use a simulated router to run the "back-end" code.
  const app = gristOverrides.expressApp;
  if (!app) {
    // Not expected.
    throw new Error('fetchFromDocApi needs expressApp');
  }
  const res = await app.run({
    method: 'get',
    path: pathname,
  });

  // Rifle through the information returned to find a name
  // and type.
  // A name may be provided in a Content-Disposition header
  // of the form 'attachment; filename="name.csv"'
  // or by a call to res.download
  const prefix = 'attachment; filename="';
  let name = String(res.headers?.['Content-Disposition'] || '');
  if (name.startsWith(prefix)) {
    // Remove the prefix and the closing double quote
    name = name.slice(prefix.length, name.length - 1);
  }
  name = name || res.name || 'download';

  // A type may be provided in a Content-Type header
  // or by a call to res.download
  const type = res.type || res.sets['Content-Type'] || 'application/octet-stream';

  return {data: res.data, name, type};
}

async function fetchAndDownload(element: any) {
  const href = element.href;
  if (!href) {
    // Not expected.
    throw new Error('fetchAndDownload needs href');
  }
  const downloadInfo = await fetchFromDocApi(href);
  await downloadInBrowser(downloadInfo);
}

function gristDownloadLink(element: any) {
  fetchAndDownload(element).catch(e => console.error(e));
  return false;
}

(window as any).fetchDownloadContent = fetchFromDocApi;
(window as any).gristDownloadLink = gristDownloadLink;

/**
 * Redirect download links to a new, in-browser implementation.
 */
function maybeModifyLinkAttrs(originalAttrs: IAttrObj) {
  if (originalAttrs.download === undefined) {
    return originalAttrs;
  }
  const newAttrs = {...originalAttrs};
  newAttrs.onclick = "return gristDownloadLink(this)";
  delete newAttrs.target;
  delete newAttrs.download;
  return newAttrs;
}

setupNewHooks(hooks);
