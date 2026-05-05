// Hand-rolled fakes of core's GristServer / Client / DocSession /
// InstallAdmin objects. Most fields aren't used in-page; when one is,
// we fill it in just well enough. New required fields show up as "X is
// not a function" at runtime; the fix lives here.

import {gristOverrides} from 'app/pipe/GristOverrides';
import {createDummyGristServer, createDummyTelemetry} from 'app/server/lib/GristServer';
import gristy from 'app/server/Doc';

// FullUser literal used in-process: authSession.fullUser,
// authorizer.getUser(), client.getProfile(), and the default for
// gristOverrides.behaviorOverrides.getCurrentUser. The
// OpenLocalDocResult `user` field uses a different on-the-wire layout
// (capitalised keys); we derive ANON_USER_FOR_RESULT from this so the
// two can't drift.
export const ANON_FULL_USER = {
  id: 1,
  email: 'anon@getgrist.com',
  name: 'Anonymous',
  picture: null,
  ref: '3VEnpHipNXQZWQyCz5vLxH',
  anonymous: true,
};

export const ANON_USER_FOR_RESULT = {
  Access: 'owners',
  Email: ANON_FULL_USER.email,
  IsLoggedIn: false,
  LinkKey: {},
  Origin: null,
  Name: ANON_FULL_USER.name,
  SessionID: 'u1',
  ShareRef: null,
  UserID: ANON_FULL_USER.id,
  UserRef: ANON_FULL_USER.ref,
  Type: null,
};

// /api/session/access/all response.
export const ANON_ACCESS_ALL = {
  users: [{
    id: ANON_FULL_USER.id,
    email: ANON_FULL_USER.email,
    name: ANON_FULL_USER.name,
    picture: null,
    anonymous: true,
  }],
  orgs: [],
};

// /api/docs/{docId} GET response. Default name is used when the host
// page doesn't supply one via behaviorOverrides.getCurrentDocName.
export const ANON_DOC_INFO_DEFAULT_NAME = "Your document";

export function makeAnonDocInfo({name, id}: {name: string, id: string}) {
  return {
    name,
    createdAt: "2023-03-11T23:07:40.999Z",
    updatedAt: "2023-03-11T23:07:40.999Z",
    id,
    isPinned: false,
    urlId: null,
    workspace: {
      name: "Home",
      createdAt: "2023-02-25T21:02:43.000Z",
      updatedAt: "2023-02-25T21:02:43.242Z",
      id: 1,
      isSupportWorkspace: false,
      docs: [],
      org: {
        name: "Personal",
        createdAt: "2023-02-25T21:02:43.000Z",
        updatedAt: "2023-02-25T21:02:43.235Z",
        id: 1,
        domain: "docs-4",
        host: null,
        owner: {
          id: 4,
          name: "Support",
          picture: null,
          ref: "dYWDbNhQWZ1WaXqpiqFfcN",
        },
      },
      access: "owners",
    },
    aliases: [],
    access: "owners",
    trunkAccess: "owners",
  };
}

// Spread createDummyGristServer() for harmless defaults; override only
// the methods our in-page paths actually call.
export function makeStubGristServer() {
  return {
    ...createDummyGristServer(),
    create: gristy.create,
    getTelemetry: () => createDummyTelemetry(),
    getDocNotificationManager: () => undefined,
    getInstallAdmin: makeStubInstallAdmin,
  };
}

export function makeStubInstallAdmin() {
  return {
    isAdminUser: async () => false,
    isAdminReq: async () => false,
    getAdminUser: async () => null,
    getAdminUsers: async () => [],
    clearCaches: () => {},
    getMiddlewareRequireAdmin: () => (_req: any, _res: any, next: any) => next(),
  };
}

export function makeStubClient(dispatchBroadcast: (args: any[]) => void) {
  return {
    clientId: 'one-and-only',
    publicClientId: 'one-and-only',
    authSession: {
      userIsAuthorized: false,
      userId: 1,
      altSessionId: 'alt-session-id',
      org: 'docs',
      fullUser: ANON_FULL_USER,
      getLogMeta: () => ({}),
    },
    browserSettings: {},
    removeDocSession: () => 1,
    interruptConnection: () => 1,
    // sendMessage runs through _dispatchBroadcast in CommStub, which keeps
    // a broadcast-in-flight counter visible to gu.waitForServer. See
    // CommStub for the timing details.
    sendMessage: (...args: any[]) => dispatchBroadcast(args),
    sendMessageOrInterrupt: (...args: any[]) => dispatchBroadcast(args),
    getLogMeta: () => ({ thing: 1 }),
    getAltSessionId: () => 'alt-session-id',
    getCachedUserId: () => 1,
    getCachedUserRef: () => ANON_FULL_USER.ref,
    getProfile: () => ANON_FULL_USER,
  };
}

export function makeStubSession(client: any, docName: string) {
  return {
    client,
    getLogMeta: () => ({ thing: 1 }),
    mode: 'system',
    linkParameters: {},
    authorizer: {
      assertAccess: () => true,
      getUserId: () => 1,
      getUser: () => ANON_FULL_USER,
      getLinkParameters: () => ({}),
      getCachedAuth: () => ({access: 'owners', docId: docName, removed: false}),
    },
  };
}

export async function getCurrentUser() {
  return gristOverrides.behaviorOverrides?.getCurrentUser?.() || ANON_FULL_USER;
}

export async function getCurrentOrg(user: unknown) {
  return gristOverrides.behaviorOverrides?.getCurrentOrg?.() || {
    "id": 0,
    "createdAt": "2023-03-11T18:01:50.231Z",
    "updatedAt": "2023-03-11T18:01:50.231Z",
    "domain": "docs",
    "name": "Anonymous",
    "owner": user,
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
  };
}
