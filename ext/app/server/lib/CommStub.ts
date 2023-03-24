import * as dispose from 'app/client/lib/dispose';
//import * as log from 'app/client/lib/log';
//import {CommRequest, CommResponse, CommResponseBase, CommResponseError, ValidEvent} from 'app/common/CommTypes';
//import {UserAction} from 'app/common/DocActions';
import {DocListAPI, OpenLocalDocResult} from 'app/common/DocListAPI';
import {GristServerAPI} from 'app/common/GristServerAPI';
//import {getInitialDocAssignment} from 'app/common/urlUtils';
//import {Events as BackboneEvents} from 'backbone';

import gristy from 'app/server/Doc';

import {Events as BackboneEvents} from 'backbone';

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
  public lookupEmail = this._wrapMethod('lookupEmail');
  public getNewInvites = this._wrapMethod('getNewInvites');
  public getLocalInvites = this._wrapMethod('getLocalInvites');
  public ignoreLocalInvite = this._wrapMethod('ignoreLocalInvite');
  public showItemInFolder = this._wrapMethod('showItemInFolder');
  public getBasketTables = this._wrapMethod('getBasketTables');
  public embedTable = this._wrapMethod('embedTable');
  public reloadPlugins = this._wrapMethod('reloadPlugins');

  public dm: any;
  public ad: any;

  protected listenTo: BackboneEvents["listenTo"];            // set by Backbone
  protected trigger: BackboneEvents["trigger"];              // set by Backbone
  protected stopListening: BackboneEvents["stopListening"];  // set by Backbone


  public constructor() {
    super();
  }

  public create(reportError?: (err: Error) => void) {
  }

  public initialize() {
    console.log("Initialize, returning nothing though");
  }

  public addUserActions() {
  }

  public useDocConnection() {
    console.log("useDocConnection, returning nothing though");
  }

  public releaseDocConnection() {
    console.log("releaseDocConnection, returning nothing though");
  }
  
  public handleMessage(msg: any) {
    msg = msg[0];
    msg.docFD = 1;
    console.log("MESSAGE TYPE", msg.type);
    this.trigger(msg.type, msg);
    console.log("MESSAGE TYPED", msg.type);
  }
  
  public async openDoc(docName: string, mode?: string,
                       linkParameters?: Record<string, string>): Promise<OpenLocalDocResult> {
    console.log("openDoc");
    const dsm = new gristy.FakeDocStorageManager();
    const gs = {
      create: gristy.create,
    };
    this.dm = new gristy.DocManager(dsm as any, null, null, gs as any);
    this.ad = new gristy.ActiveDoc(this.dm, 'meep');
    //await this.ad.createEmptyDoc({});
    const hasSeed = (window as any).seedFile;
    await this.ad.loadDoc({mode: 'system'}, {
      forceNew: !hasSeed,
      skipInitialTable: hasSeed,
      useExisting: true,
    });
    this.ad.addClient({
      addDocSession: () => {
        return {
          client: {
            removeDocSession: () => 1,
            interruptConnection: () => 1,
            sendMessage: (...args: any[]) => {
              console.log("MESSAGE!", args);
              this.handleMessage(args);
            },
            getLogMeta: () => {
              return { thing: 1 };
            },
          },
          authorizer: {
            assertAccess: () => true,
            getUser: () => 1,
            getLinkParameters: () => {
              return {};
            },
            getCachedAuth() {
              return {
                access: 'owners',
                docId: 'meep',
                removed: false,
              };
            },
          }
        };
      },
    }, {});
    (window as any).ad = this.ad;
    const session = { mode: 'system' };
    return {
      docFD: 1,
      clientId: "1",
      doc: await this.ad.fetchMetaTables(session),
      log: await this.ad.getRecentMinimalActions(session),
      recoveryMode: this.ad.recoveryMode,
    };
    // throw new Error('not ipmlemented');
    //return this._makeRequest(null, docName, 'openDoc', docName, mode, linkParameters);
  }

  public getDocWorkerUrl(docId: string|null): string {
    return window.location.href;
  }

  private _wrapMethod<Name extends keyof GristServerAPI>(name: Name): GristServerAPI[Name] {
    // throw Error('not implemented');
    return this._makeRequest.bind(this, null, null, name);
  }

  public async _makeRequest(clientId: string|null, docId: string|null,
                            methodName: string, ...args: any[]): Promise<any> {
    console.log("CALLING WITH ARGS", {methodName, args});
    args[0] = { mode: 'system' };
    return this.ad[methodName].call(this.ad, ...args);
  }
}

Object.assign(Comm.prototype, BackboneEvents);


const accessActive = {
  "user": {
    "id": 1,
    "email": "anon@getgrist.com",
    "name": "Anonymous",
    "picture": null,
    "ref": "3VEnpHipNXQZWQyCz5vLxH",
    "anonymous": true
  },
  "org": {
    "id": 0,
    "createdAt": "2023-03-11T18:01:50.231Z",
    "updatedAt": "2023-03-11T18:01:50.231Z",
    "domain": "docs",
    "name": "Anonymous",
    "owner": {
      "id": 1,
      "email": "anon@getgrist.com",
      "name": "Anonymous",
      "ref": "",
      "anonymous": true
    },
    "access": "viewers",
    "billingAccount": {
      "id": 0,
      "individual": true,
      "product": {
        "name": "anonymous",
        "features": {
          "workspaces": true,
          "maxSharesPerWorkspace": 0,
          "maxSharesPerDoc": 2,
          "snapshotWindow": {
            "count": 30,
            "unit": "days"
          },
          "baseMaxRowsPerDocument": 5000,
          "baseMaxApiUnitsPerDocumentPerDay": 5000,
          "baseMaxDataSizePerDocument": 10240000,
          "baseMaxAttachmentsBytesPerDocument": 1073741824,
          "gracePeriodDays": 14
        }
      },
      "isManager": false,
      "inGoodStanding": true
    },
    "host": null
  }
};

const accessAll = {
  "users": [
    {
      "id": 1,
      "email": "anon@getgrist.com",
      "name": "Anonymous",
      "picture": null,
      "anonymous": true
    }
  ],
  "orgs": []
};


const docInfo = {
  "name": "Your document",
  "createdAt": "2023-03-11T23:07:40.999Z",
  "updatedAt": "2023-03-11T23:07:40.999Z",
  "id": "new~tTzg3iGWsXq7Q6hSXGb94j",
  "isPinned": false,
  "urlId": null,
  "workspace": {
    "name": "Home",
    "createdAt": "2023-02-25T21:02:43.000Z",
    "updatedAt": "2023-02-25T21:02:43.242Z",
    "id": 1,
    "isSupportWorkspace": false,
    "docs": [],
    "org": {
      "name": "Personal",
      "createdAt": "2023-02-25T21:02:43.000Z",
      "updatedAt": "2023-02-25T21:02:43.235Z",
      "id": 1,
      "domain": "docs-4",
      "host": null,
      "owner": {
        "id": 4,
        "name": "Support",
        "picture": null,
        "ref": "dYWDbNhQWZ1WaXqpiqFfcN"
      }
    },
    "access": "owners"
  },
  "aliases": [],
  "access": "owners",
  "trunkAccess": "owners"
};

function newFetch(target, opts) {
  const url = new URL(target);
  console.log("HEY", {target, opts, url});
  if (url.pathname.endsWith('/api/session/access/active')) {
    return {
      status: 200,
      json: () => accessActive,
    };
  } else if (url.pathname.endsWith('/api/session/access/all')) {
    return {
      status: 200,
      json: () => accessAll,
    };
  } else if (url.pathname.endsWith('/api/docs/new~2d6rcxHotohxAuTxttFRzU')) {
    docInfo.name = (window as any).staticGristOptions?.name || docInfo.name;
    return {
      status: 200,
      json: () => docInfo,
    };
  } else if (url.pathname.endsWith('/api/orgs/0/workspaces')) {
    return {
      status: 200,
      json: () => [],
    };
  }
  return {};
  // return window.fetch(target, opts);
}

function installFetch() {
  if (!(window as any).fetchHook) {
    (window as any).fetchHook = newFetch;
  }
}

installFetch();
