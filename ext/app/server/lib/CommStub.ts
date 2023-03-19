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
