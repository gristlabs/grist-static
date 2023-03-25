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
  public client: any;
  public session: any;

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
    (window as any).gristActiveDoc = this.ad;
    //await this.ad.createEmptyDoc({});
    const hasSeed = (window as any).seedFile;
    await this.ad.loadDoc({mode: 'system'}, {
      forceNew: !hasSeed,
      skipInitialTable: hasSeed,
      useExisting: true,
    });
    this.client = {
      clientId: 'one-and-only',
      removeDocSession: () => 1,
      interruptConnection: () => 1,
      sendMessage: (...args: any[]) => {
        console.log("MESSAGE!", args);
        this.handleMessage(args);
      },
      getLogMeta: () => {
        return { thing: 1 };
      },
      getAltSessionId: () => {
        return 'alt-session-id';
      },
      getCachedUserId: () => {
        return 1;
      },
      getCachedUserRef: () => {
        return '3VEnpHipNXQZWQyCz5vLxH';
      },
      getProfile: () => {
        return {
          "id": 1,
          "email": "anon@getgrist.com",
          "name": "Anonymous",
          "picture": null,
          "ref": "3VEnpHipNXQZWQyCz5vLxH",
          "anonymous": true
        };
      },
    };
    this.session = {
      client: this.client,
      authorizer: {
        assertAccess: () => true,
        getUserId: () => 1,
        getUser: () => {
          return {
            "id": 1,
            "email": "anon@getgrist.com",
            "name": "Anonymous",
            "picture": null,
            "ref": "3VEnpHipNXQZWQyCz5vLxH",
            "anonymous": true
          };
        },
        getLinkParameters: () => {
          return linkParameters || {};
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
    (window as any).gristSession = this.session;
    this.ad.addClient({
      addDocSession: () => this.session
    }, {});
    (window as any).ad = this.ad;
    return {
      docFD: 1,
      clientId: 'one-and-only',
      doc: await this.ad.fetchMetaTables(this.session),
      log: await this.ad.getRecentMinimalActions(this.session),
      userOverride: await this.ad.getUserOverride(this.session),
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
    args[0] = this.session; // { mode: 'system', client: this.client };
    try {
      const result = await this.ad[methodName].call(this.ad, ...args);
      console.log("GOT RESULT", {methodName, args, result});
      return result;
    } catch (e) {
      console.log("GOT FAILURE", {methodName, args, e});
      throw e;
    }
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

async function newFetch(target: string, opts: any) {
  const url = new URL(target);
  const activeDoc = (window as any).gristActiveDoc;
  const session = (window as any).gristSession;
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
  } else if (url.pathname.endsWith('/api/docs/new~tTzg3iGWsXq7Q6hSXGb94j/snapshots')) {
    return {
      status: 200,
      json: () => ({ snapshots: [] }),
    };
  } else if (url.pathname.endsWith('/api/docs/new~tTzg3iGWsXq7Q6hSXGb94j/snapshots')) {
    return {
      status: 200,
      json: () => ({ snapshots: [] }),
    };
  } else if (url.pathname.endsWith('/api/docs/new~tTzg3iGWsXq7Q6hSXGb94j/usersForViewAs')) {
    const result = await activeDoc.getUsersForViewAs(session);
    return {
      status: 200,
      json: () => result,
    };
  } else if (url.pathname.endsWith('/api/log')) {
    return {
      status: 200,
      json: () => ({}),
    };
  }
  return {
    status: 404,
    json: () => ({}),
  };
  // return window.fetch(target, opts);
}

function installFetch() {
  if (!(window as any).fetchHook) {
    (window as any).fetchHook = newFetch;
  }
}

installFetch();
