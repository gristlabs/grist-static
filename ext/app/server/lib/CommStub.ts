import * as dispose from 'app/client/lib/dispose';
import { DocListAPI, OpenLocalDocResult } from 'app/common/DocListAPI';
import { GristServerAPI } from 'app/common/GristServerAPI';
import { gristOverrides, MiniExpress } from 'app/pipe/GristOverrides';

import gristy from 'app/server/Doc';

import { Events as BackboneEvents } from 'backbone';
import { ImportOptions, ImportResult, TransformRuleMap } from 'app/common/ActiveDocAPI';
import { ActiveDocImport, FileImportOptions } from 'app/server/lib/ActiveDocImport';
import { OptDocSession } from 'app/server/lib/DocSession';
import { installSnapshotOnPagehide } from 'app/server/lib/testmode/snapshot';
import {
  ANON_ACCESS_ALL, ANON_DOC_INFO_DEFAULT_NAME, ANON_USER_FOR_RESULT,
  getCurrentOrg, getCurrentUser,
  makeAnonDocInfo, makeStubClient, makeStubGristServer, makeStubSession,
} from 'app/server/lib/gristStubs';
import { trace } from 'app/server/lib/testmode/trace';
import { buildWidgetRepository } from 'app/server/lib/WidgetRepository';
import { FileUploadResult, UploadResult } from 'app/common/uploads';
import { FileUploadInfo, globalUploadSet, UploadInfo } from 'app/server/lib/uploads';
import * as path from 'path';

export class Comm  extends dispose.Disposable implements GristServerAPI, DocListAPI {
  // methods defined by GristServerAPI
  public logout = this._wrapMethod('logout');
  public updateProfile = this._wrapMethod('updateProfile');
  public getDocList = this._wrapMethod('getDocList');
  public createNewDoc = this._wrapMethod('createNewDoc');
  public importSampleDoc = this._wrapMethod('importSampleDoc');
  public importDoc = this._wrapMethod('importDoc');
  public deleteDoc = this._wrapMethod('deleteDoc');
  // openDoc has special definition below
  public renameDoc = this._wrapMethod('renameDoc');
  public getConfig = this._wrapMethod('getConfig');
  public updateConfig = this._wrapMethod('updateConfig');
  public showItemInFolder = this._wrapMethod('showItemInFolder');
  public getBasketTables = this._wrapMethod('getBasketTables');
  public embedTable = this._wrapMethod('embedTable');
  public reloadPlugins = this._wrapMethod('reloadPlugins');

  public dm: any;
  public ad: any;
  public client: any;
  public session: any;
  public expressApp: MiniExpress;

  protected listenTo: BackboneEvents["listenTo"];            // set by Backbone
  protected trigger: BackboneEvents["trigger"];              // set by Backbone
  protected stopListening: BackboneEvents["stopListening"];  // set by Backbone


  public constructor() {
    super();
  }

  public create(reportError?: (err: Error) => void) {
  }

  public initialize() {
  }

  // Bumped around _makeRequest and around broadcast dispatch, so
  // gu.waitForServer sees both as in-flight.
  private _inFlight: number = 0;

  public hasActiveRequests(): boolean {
    return this._inFlight > 0;
  }

  public addUserActions() {
  }

  public useDocConnection() {
  }

  public releaseDocConnection() {
  }

  public handleMessage(msg: any) {
    msg = msg[0];
    msg.docFD = 1;
    trace('broadcast', msg.type);
    this.trigger(msg.type, msg);
  }

  // Bump, fire synchronous listeners, drain a microtask, drop — so
  // .then() continuations queued by listeners still see in-flight.
  private _dispatchBroadcast(args: any[]): void {
    this._inFlight++;
    try {
      this.handleMessage(args);
    } finally {
      Promise.resolve().then(() => { this._inFlight--; });
    }
  }

  public async openDoc(docName: string): Promise<OpenLocalDocResult> {
    trace('open', 'enter', docName);
    const dsm = new gristy.FakeDocStorageManager();
    trace('open', 'after FakeDocStorageManager');
    const gs = makeStubGristServer();
    this.dm = new gristy.DocManager(dsm as any, null, null, {} as any, gs as any);
    trace('open', 'after DocManager');
    this.ad = new gristy.ActiveDoc(this.dm, docName);
    trace('open', 'after ActiveDoc');
    this.dm.addActiveDoc(docName, this.ad);
    activeDocSingleton = this.ad;

    const hasSeed = gristOverrides.seedFile;
    const initialData = gristOverrides.initialData;
    const initialContent = gristOverrides.initialContent;
    trace('open', 'before loadDoc', {hasSeed: !!hasSeed});
    await this.ad.loadDoc(gristy.makeExceptionalDocSession('system'), {
      forceNew: !hasSeed,
      skipInitialTable: hasSeed || initialData || initialContent,
      useExisting: true,
    });
    trace('open', 'after loadDoc');

    this.client = makeStubClient((args) => this._dispatchBroadcast(args));
    this.session = makeStubSession(this.client, docName);
    sessionSingleton = this.session;
    this.ad.addClient({addDocSession: () => this.session}, {});
    trace('open', 'after addClient');
    this.expressApp = gristy.makeApp(this.dm, gs as any, this as any);
    trace('open', 'after makeApp');
    gristOverrides.expressApp = this.expressApp;
    installTestBridge(docName, this.expressApp);

    if (initialContent) {
      await this._loadInitialContent(initialContent);
    } else if (initialData) {
      await this._loadInitialData(initialData);
    }

    gristOverrides.behaviorOverrides?.onOpenComplete?.();

    const [doc, rawLog, userOverride] = await Promise.all([
      this.ad.fetchMetaTables(this.session),
      this.ad.getRecentMinimalActions(this.session),
      this.ad.getUserOverride(this.session),
    ]);
    // Test-mode refresh: snapshot the DB on pagehide, and re-tag the
    // history as fromSelf so the next page load can undo into it.
    let log = rawLog;
    if (gristOverrides.testRefreshPersistence) {
      installSnapshotOnPagehide();
      log = (rawLog || []).map((ag: object) => ({...ag, fromSelf: true}));
    }
    trace('open', 'return');
    return {
      docFD: 1,
      clientId: 'one-and-only',
      doc,
      log,
      userOverride,
      recoveryMode: this.ad.recoveryMode,
      isTimingOn: false,
      user: ANON_USER_FOR_RESULT as any,
    };
  }

  public getDocWorkerUrl(docId: string | null): string {
    return window.location.href;
  }

  private async _readFromURL(initialDataUrl: string): Promise<File> {
    // If we are in a iframe, we need to use the parent window to fetch the data.
    // This is hack to fix a bug in FF https://bugzilla.mozilla.org/show_bug.cgi?id=1741489, and shouldn't
    // affect other browsers.
    // TODO: add test for it.
    const inSrcDoc = Boolean(window.frameElement?.getAttribute('srcdoc'));
    const fetch = inSrcDoc ? window.parent.fetch : window.fetch;
    const response = await fetch(initialDataUrl);
    if (!response.ok) {
      throw new Error(`Failed to load initial data from ${initialDataUrl}: ${response.statusText}`);
    }
    const content = await response.blob();
    // Extract filename from end of URL
    const originalFilename = initialDataUrl.match(/[^/]+$/)?.[0] || "data.csv";
    return new File([content], originalFilename);
  }

  private async _loadInitialData(initialData: string|File) {
    if (typeof initialData === 'string') {
      initialData = await this._readFromURL(initialData);
    }
    const content = new Uint8Array(await initialData.arrayBuffer());
    await this._loadInitialContent(content, initialData.name);
  }

  private async _loadInitialContent(content: string|Uint8Array, origName: string = "data.csv") {
    const files: MyFileUploadInfo[] = [{
      absPath: 'fakeAbsPath',
      origName,
      size: content.length,
      ext: path.extname(origName).toLowerCase(),
      content,
    }];
    return this.ad.oneStepImport(this.session, {files});
  }

  private _wrapMethod<Name extends keyof GristServerAPI>(name: Name): GristServerAPI[Name] {
    // throw Error('not implemented');
    return this._makeRequest.bind(this, null, null, name);
  }

  public async _makeRequest(clientId: string | null, docId: string | null,
                            methodName: string, ...args: any[]): Promise<any> {
    args[0] = this.session; // { mode: 'system', client: this.client };
    this._inFlight++;
    const t0 = Math.round(performance.now());
    trace('comm', methodName + ':start');
    let ok = false;
    try {
      const result = await this.ad[methodName].call(this.ad, ...args);
      // __staticApplyDelayMs lets tests insert a fixed post-apply delay.
      const extraMs = window.__staticApplyDelayMs || 0;
      if (extraMs > 0) {
        await new Promise(r => setTimeout(r, extraMs));
      }
      ok = true;
      return result;
    } catch (e) {
      const err = e as Error;
      trace('comm', methodName + ':err', String(err?.message || err).substring(0, 200));
      console.error('CommStub method failed:', methodName, e);
      throw e;
    } finally {
      this._inFlight--;
      trace('comm', methodName + ':end', {dur: Math.round(performance.now()) - t0, ok});
    }
  }

}

Object.assign(Comm.prototype, BackboneEvents);

// Cross-process bridge for tests. homeUtil.ts routes api.applyUserActions
// through this rather than the production gristOverrides.expressApp,
// so the two surfaces don't drift into each other.
function installTestBridge(docName: string, expressApp: MiniExpress): void {
  if (typeof window === 'undefined') { return; }
  window.__staticTestBridge = {
    applyUserActions: async (actions) => {
      const r = await expressApp.run({
        method: 'post',
        path: `/api/docs/${docName}/apply`,
        body: actions,
      });
      return r && r.data;
    },
  };
}

async function getAccessActive() {
  const user = await getCurrentUser();
  const org = await getCurrentOrg(user);
  return {user, org};
}

const widgetRepo = buildWidgetRepository(null as any);

interface MyFileUploadInfo extends FileUploadInfo {
  content: string|Uint8Array;
}

// This largely replicates the logic of handleOptionalUpload() in app/server/lib/uploads.ts.
async function newUpload(xhr: XMLHttpRequest, formData: FormData, origSend: typeof XMLHttpRequest.prototype.send) {
  // Hook should emit events on the xhr object appropriately. Upload code uses:
  //    xhr.addEventListener('load', ...)
  //    xhr.addEventListener('error', ...)
  //    xhr.upload.addEventListener('progress', ...)

  // 'upload' is the name of the form field containing file data, set by app/client/lib/uploads.
  // If no such field, then we got called for some other endpoint. Fall back to default behavior
  // without special handling.
  const uploads = formData.getAll('upload');
  if (uploads.length === 0) {
    return origSend.call(xhr, formData);
  }

  const uploadedFiles: MyFileUploadInfo[] = [];
  for (const file of uploads as File[]) {
    uploadedFiles.push({
      absPath: 'fakeAbsPath',
      origName: file.name,
      size: file.size,
      ext: path.extname(file.name).toLowerCase(),
      content: new Uint8Array(await file.arrayBuffer()),    // <-- Extra property containing the actual file data
    });
  }
  const tmpDir = 'fakeTmpDir';
  const cleanupCallback = () => {}; // no-op
  const accessId = null;
  const uploadId = globalUploadSet.registerUpload(uploadedFiles, tmpDir, cleanupCallback, accessId);
  const files: FileUploadResult[] = uploadedFiles;
  const uploadResult: UploadResult = {uploadId, files};
  // These properties are normally read-only getters, but NewHooks makes them settable.
  (xhr as any).status = 200;
  (xhr as any).responseText = JSON.stringify(uploadResult);
  xhr.dispatchEvent(new ProgressEvent('load'));
}

// Replace a method implementation that we need to handle serverless "uploads".
(ActiveDocImport.prototype as any)._importFiles = async function(
  docSession: OptDocSession, upload: UploadInfo, transforms: TransformRuleMap[],
  {parseOptions = {}, mergeOptionMaps = []}: ImportOptions,
  isHidden: boolean
): Promise<ImportResult> {

  const importResult: ImportResult = {options: parseOptions, tables: []};
  for (const [index, file] of upload.files.entries()) {
    const fileParseOptions = {...parseOptions};
    if (file.ext === '.dsv') {
      if (!fileParseOptions.delimiter) {
        fileParseOptions.delimiter = '💩';
      }
      if (!fileParseOptions.encoding) {
        fileParseOptions.encoding = 'utf-8';
      }
    }
    const originalFilename = file.origName;
    const res = await this._importFileAsNewTable(docSession, (file as MyFileUploadInfo).content, {
      parseOptions: fileParseOptions,
      mergeOptionsMap: mergeOptionMaps[index] || {},
      isHidden,
      originalFilename,
      uploadFileIndex: index,
      transformRuleMap: transforms[index] || {}
    });
    if (index === 0) {
      // Returned parse options from the first file should be used for all files in one upload.
      importResult.options = parseOptions = res.options;
    }
    importResult.tables.push(...res.tables);
  }
  return importResult;
};

(ActiveDocImport.prototype as any)._importFileAsNewTable = async function(
  this: ActiveDocImport,
  docSession: OptDocSession, content: string|Uint8Array,
  importOptions: FileImportOptions
): Promise<ImportResult> {
  const ad = (this as any)._activeDoc;
  const {originalFilename, parseOptions} = importOptions;

  // Corresponds to core/plugins/core/manifest.yml.
  const fileParsers = {
    csv_parser: ['csv', 'tsv', 'dsv', 'txt'],
    xls_parser: ['xlsx', 'xlsm'],
    json_parser: ['json'],
  };
  // Turn into a map of 'csv' -> 'csv_parser', etc.
  const parserMap = new Map(Object.entries(fileParsers).flatMap(([parser, lst]) => lst.map(ext => [ext, parser])));

  const basename = originalFilename.split('/').pop()!;
  const extension = basename.split('.').pop()!;
  const parserName = parserMap.get(extension);
  if (!parserName) { throw new Error("File format is not supported"); }
  const path = `/tmp/${basename}`;

  await ad._pyCall("save_file", path, content);
  const parsedFile = await ad._pyCall(
    `${parserName}.parseFile`,
    {path, origName: originalFilename},
    parseOptions,
  );
  return this.importParsedFileAsNewTable(docSession, parsedFile, importOptions);
};


async function newFetch(target: string, opts: any) {
  const result = await fetchWithoutOk(target, opts);
  return {
    ...result,
    // Make sure "json" function returns a promise.
    json: async () => result.json(),
    // Add an "ok" summary.
    ok: result?.status === 200,
  };
}

// Set by Comm.openDoc; read by the fake-home-server fetch handler below.
let activeDocSingleton: any;
let sessionSingleton: any;

async function fetchWithoutOk(target: string, opts: any) {
  const url = new URL(target);
  const activeDoc = activeDocSingleton;
  const session = sessionSingleton;
  const docId = gristOverrides.behaviorOverrides?.getCurrentDocId?.() ||
    gristOverrides.fakeDocId || 'unknown';
  if (url.pathname.endsWith('/api/session/access/active')) {
    return {
      status: 200,
      json: getAccessActive,
    };
  } else if (url.pathname.endsWith('/api/session/access/all')) {
    return {
      status: 200,
      json: () => ANON_ACCESS_ALL,
    };
  } else if (url.pathname.endsWith(`/api/docs/${docId}`)) {
    if (opts.method === "PATCH") {
      const body = JSON.parse(opts.body);
      if (body.name) {
        // This is a rename.
        await gristOverrides.behaviorOverrides?.rename?.(body.name);
      }
      return { status: 200, json: () => null };
    } else if (opts.method === "GET") {
      const name = gristOverrides.behaviorOverrides?.getCurrentDocName?.() ||
        gristOverrides.staticGristOptions?.name ||
        ANON_DOC_INFO_DEFAULT_NAME;
      return {
        status: 200,
        json: () => makeAnonDocInfo({name, id: docId}),
      };
    }
  } else if (url.pathname.endsWith('/api/orgs/0/workspaces')) {
    return {
      status: 200,
      json: () => [],
    };
  } else if (url.pathname.endsWith(`/api/docs/${docId}/snapshots`)) {
    return {
      status: 200,
      json: () => ({ snapshots: [] }),
    };
  } else if (url.pathname.endsWith(`/api/docs/${docId}/usersForViewAs`)) {
    // Linked-As parameters should not be sent - really need a separate
    // request based object.
    const result = await activeDoc.getUsersForViewAs({
      ...session,
      authorizer: {
        ...session.authorizer,
        getLinkParameters: () => ({}),
      }
    });
    return {
      status: 200,
      json: () => result,
    };
  } else if (url.pathname.endsWith('/api/log')) {
    return {
      status: 200,
      json: () => ({}),
    };
  } else if (url.pathname.endsWith('/api/widgets')) {
    const widgets = await widgetRepo.getWidgets();
    return {
      status: 200,
      json: () => widgets,
    };
  } else if (url.pathname.endsWith('/api/orgs')) {
    const orgs = [await getCurrentOrg(await getCurrentUser())];
    return {
      status: 200,
      json: () => orgs,
    };
  }
  return {
    status: 404,
    json: () => ({}),
  };
}

function installFetch() {
  if (!window.fetchHook) {
    window.fetchHook = newFetch;
  }
  if (!window.uploadHook) {
    window.uploadHook = newUpload;
  }
}

installFetch();
