// Enough to work with a single document in a browser

import {gristOverrides, MiniExpress, ResponseInfo} from 'app/pipe/GristOverrides';
import {ActiveDoc, Deps as ActiveDocDeps} from 'app/server/lib/ActiveDoc';
import {Comm} from 'app/server/lib/Comm';
import {create} from 'app/server/lib/create';
import {addDocApiRoutes} from 'app/server/lib/DocApi';
import {DocManager} from 'app/server/lib/DocManager';
import {DocStorage} from 'app/server/lib/DocStorage';
import {DocWorker} from 'app/server/lib/DocWorker';
import {GristServer} from 'app/server/lib/GristServer';
import {HomeDBManager} from 'app/server/lib/HomeDBManagerStub';
import {EmptySnapshotProgress} from 'app/server/lib/IDocStorageManager';
import {NSandbox} from 'app/server/lib/NSandbox';
import {SQLiteDB} from 'app/server/lib/SQLiteDB';
import {virtualFileSystem} from 'app/server/lib/SqliteJs';


process.env.GRIST_SANDBOX_FLAVOR = 'pyodideInline';

// Provide a default list of custom widgets.
process.env.GRIST_WIDGET_LIST_URL =
  'https://gristlabs.github.io/grist-widget/manifest.json';

ActiveDocDeps.ACTIVEDOC_TIMEOUT_ACTION = 'ignore';

class FakeDocStorageManager {
  getPath(x: string) { return x; }
  renameDoc() { throw new Error('no renames'); }    // Not used.
  markAsChanged() { gristOverrides.behaviorOverrides?.onChange?.(); }
  scheduleUsageUpdate() {}
  prepareToCreateDoc() {}
  closeDocument() {}
  prepareLocalDoc() {}
  makeBackup() {}
  getSnapshotProgress() {
    return new EmptySnapshotProgress();
  }

  /**
   * Copies are made when filtering a document
   * prior to downloading as a .grist file.
   * We support exactly one copy, called 'copy',
   * And conspire with SqliteJs so that works
   * just well enough.
   */
  getCopy() {
    virtualFileSystem.delete('copy');
    return 'copy';
  }
}

// A simple test function for when things go wrong.
function get42() {
  return 42;
}

/**
 * A minimal implementation of Express, to be able to access
 * the document REST API.
 */
export class MiniExpressImpl implements MiniExpress {
  private _endpoints: Endpoint[] = [];

  // Methods for adding endpoints.

  public post(...args: any[]) {
    this._addEndpoint('post', args);
  }
  public get(...args: any[]) {
    this._addEndpoint('get', args);
  }
  public patch(...args: any[]) {
    this._addEndpoint('patch', args);
  }
  public delete(...args: any[]) {
    this._addEndpoint('delete', args);
  }
  public put(...args: any[]) {
    this._addEndpoint('put', args);
  }

  public use() {
  }

  // Method for invoking an endpoint.

  public async run(options: {method: string, path: string}): Promise<ResponseInfo> {
    // Look up the endpoint.
    const endpointAndParams = this._getEndpoint(options);
    if (!endpointAndParams) {
      throw new Error('cannot find ' + String(options));
    }

    // For now, it seems to be fine to just take the last function and
    // skip middleware entirely. In principle, some middleware could set a
    // value that we need, but in practice that isn't the case for the
    // endpoints we're using so far.
    const fns = endpointAndParams.endpoint.fns;
    const fn = fns[fns.length - 1];

    // Extract query parameters in expected format.
    const url = new URL(options.path, 'http://localhost');
    const query = {} as Record<string, string>;
    for (const [k, v] of url.searchParams.entries()) {
      query[k] = v;
    }

    // Build up something sufficently like an Express request object
    // for the endpoints we are using.
    const req = {
      get(key: string): any {
        return null;
      },
      userId: 1,
      user: {
        id: 1,
        name: 'User',
      },
      docAuth: {
        docId: gristOverrides.fakeDocId || 'unknown',
        access: 'owners',
        cachedDoc: {
          workspace: {
            org: {
            }
          }
        }
      },
      query,
      params: endpointAndParams.params,
    };

    // Create a place to cache information set in a response.
    const info: ResponseInfo = {
      sets: {},
      headers: {},
      data: undefined,
    };

    // Build up something sufficently like an Express response object
    // for the endpoints we are using.
    const res = {
      set(key: string, val: any) {
        info.sets[key] = val;
        return this;
      },
      setHeader(key: string, val: any) {
        info.headers[key] = val;
        return this;
      },
      send(data: any) {
        info.data = data;
        return this;
      },
      type(name: string) {
        info.type = name;
        return this;
      },
      download(fileName: string, name: string, fn: (err: any) => Promise<void>) {
        info.name = name;
        info.data = virtualFileSystem.get(fileName);
      }
    };
    const next = (err?: any) => {
      if (err) {
        throw err;
      }
    }
    await fn(req, res, next);
    return info;
  }

  // Helpers.

  /**
   * Match a path against a template, like:
   *    /api/workspaces/abc123/import
   * against:
   *    /api/workspaces/:wid/import'
   * Returns undefined if no match, otherwise an object with the
   * required parameters to make the match.
   */
  private _matchPath(fullPath: string, template: string): Record<string, string>|undefined {
    const url = new URL(fullPath, 'http://localhost');
    const path = url.pathname;

    const pathSegments = path.split('/');
    const templateSegments = template.split('/');

    if (pathSegments.length !== templateSegments.length) {
      return undefined;
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < pathSegments.length; i++) {
      const pathSegment = pathSegments[i];
      const templateSegment = templateSegments[i];
      if (templateSegment.startsWith(':')) {
        const paramName = templateSegment.slice(1);
        params[paramName] = pathSegment;
      } else if (pathSegment !== templateSegment) {
        return undefined;
      }
    }
    return params;
  }

  private _addEndpoint(method: string, args: any[]) {
    const path = args[0];
    if (typeof path !== 'string') {
      throw new Error('do not know what to do with ' + String(path));
    }
    const fns = args.slice(1);
    this._endpoints.push({method, path, fns});
  }

  private _getEndpoint(options: {method: string, path: string}) {
    for (const endpoint of this._endpoints) {
      if (endpoint.method !== options.method) { continue; }
      const params = this._matchPath(options.path, endpoint.path);
      if (!params) { continue; }
      return { endpoint, params };
    }
  }
}

// Express-like middleware functions.
type ExpressFn = (req: any, res: any, err: any) => Promise<any>;

// A per-endpoint record.
interface Endpoint {
  method: string;
  path: string;
  fns: ExpressFn[];
}

/**
 * Construct an express-like app.
 */
function makeApp(dm: DocManager, gs: GristServer, comm: Comm): MiniExpress {
  const app = new MiniExpressImpl();
  const db = new HomeDBManager();
  const dw = new DocWorker(db as any, {
    comm,
    gristServer: gs
  });

  addDocApiRoutes(app as any,
                  dw,
                  {} as any,
                  dm,
                  db as any,
                  gs);
  return app;
}

const backend = {
  get42,
  SQLiteDB,
  DocStorage,
  FakeDocStorageManager,
  makeDocStorage: () => {
    return new DocStorage(new FakeDocStorageManager() as any,
                          'meep2');
  },
  ActiveDoc,
  DocManager,
  NSandbox,
  create,
  makeApp,
};

export default backend;
