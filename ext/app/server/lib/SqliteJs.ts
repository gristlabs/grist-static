import * as SqlJs from 'sql.js';
import initSqlJs = require('sql.js/dist/sql-wasm-debug');

import { gristOverrides } from 'app/pipe/GristOverrides';
import { allMarshalQuery, gristMarshal, MinDB, PreparedStatement, SqliteVariant } from 'app/server/lib/SqliteCommon';
import { OpenMode } from 'app/server/lib/SQLiteDB';

export class SqliteJsVariant implements SqliteVariant {
  async opener(dbPath: string, mode: OpenMode): Promise<MinDB> {
    return new Promise((resolve, reject) => {
      const db = new JsDatabase(dbPath, mode, (err, v) => {
        if (err) {
          reject(err);
        }
        resolve(db);
      });
    });
  }
}


async function getSql() {
  return initSqlJs({
    locateFile: file => {
      let target = `static/sql.js/dist/${file}`;
      const prefix = typeof window !== 'undefined' && gristOverrides.bootstrapGristPrefix;
      if (prefix) {
        target = `${prefix}sql.js/dist/${file}`
      }
      return target;
    }
  });
}

export const sql = getSql();

/**
 * Keep track of the database that corresponds to the Grist document.
 */
let mainDB: SqlJs.Database|null;

/**
 * Store all databases, specifically a modified copy we may make for
 * downloading.
 * (There are browser implementations of filesystems we could use,
 * and probably will at some point for imports, but specifically for
 * dealing with SQLite in JS they won't help since the db isn't tied
 * to a file in the same way it is on the back-end.)
 */
export const virtualFileSystem: Map<string, Uint8Array> = new Map();

export class JsDatabase implements MinDB {
  private db: Promise<SqlJs.Database>;
  constructor(public path: string, mode: any, cb: (err: any, v?: any) => void) {
    this.db = new Promise<SqlJs.Database>((resolve, reject) => {
      sql.then(async sql => {
        try {
          let seedFile = path !== ':memory:' ? gristOverrides.seedFile : '';
          let seed: Uint8Array|undefined;
          if (path === 'copy') {
            // If loading from the special file "copy", go ahead and
            // use anything already in our "virtualFileSystem", or
            // copy from the first db we opened.
            seedFile = '';
            if (virtualFileSystem.has('copy')) {
              seed = virtualFileSystem.get('copy')!;
            } else if (mainDB) {
              seed = mainDB.export();
            }
          }
          if (seedFile && seedFile instanceof Uint8Array) {
            seed = seedFile;
          } else if (seedFile) {
            // If we are in a iframe, we need to use the parent window to fetch the data.
            // This is hack to fix a bug in FF https://bugzilla.mozilla.org/show_bug.cgi?id=1741489, and shouldn't
            // affect other browsers.
            // TODO: add test for it.
            const inSrcDoc = Boolean(window.frameElement?.getAttribute('srcdoc'));
            const fetch = inSrcDoc ? window.parent.fetch : window.fetch;
            const resp = await fetch(seedFile);
            if (!resp.ok) {
              throw new Error(seedFile + ": " + resp.statusText);
            }
            const data = await resp.arrayBuffer();
            const arr = new Uint8Array(data);
            seed = arr;
          }

          const db = new sql.Database(seed);
          if (path !== ':memory:' && path !== 'copy') {
            mainDB = db;
          }
          (db as any).create_aggregate('grist_marshal', {
            init: gristMarshal.initialize,
            step: {
              length: 0,
              apply: (_: any, args: any[]) => {
                return gristMarshal.step(args[0], ...args.slice(1));
              },
            },
            finalize: gristMarshal.finalize,
          });
          resolve(db);
        } catch (e) {
          reject(e);
        }
      }).catch(e => {
        console.error(e);
        reject(e);
      });
    });
    this.db.then(d => {
      cb(null, d);
    });
  }
  async close() {
    if (this.path === 'copy') {
      virtualFileSystem.set(this.path, (await this.db).export());
    }
    (await this.db).close();
  }
  async run(sql: string, ...params: any[]) {
    const db = await this.db;
    db.run(sql, params);
    const changes = db.getRowsModified();
    return {changes};
  }
  async get(sql: string, ...args: any[]) {
    const db = await this.db;
    const stmt = db.prepare(sql, args);
    let result: any = undefined;
    try {
      if (stmt.step()) {
        result = stmt.getAsObject();
      }
    } finally {
      stmt.free();
    }
    return result;
  }
  async allMarshal(sql: string, ...args: any[]): Promise<Buffer> {
    return allMarshalQuery(this, sql, ...args);
  }
  async all(sql: string, ...args: any[]) {
    const db = await this.db;
    const result: any[] = [];
    const cb2 = (v: any) => {
      result.push(v);
    }
    try {
      db.each(sql, args, cb2, () => 1);
    } catch (err) {
      console.error("PROBLEM", {
        err,
        keys: Object.keys(err),
      });
    }
    return result;
  }
  async exec(sql: string, ...args: any[]) {
    (await this.db).exec(sql, args);
  }
  async prepare(sql: string, ...args: any[]) {
    const stmt = new Statement();
    const stmt2 = (await this.db).prepare(sql, args);
    stmt.attach(stmt2, await this.db);
    return stmt;
  }
  async limitAttach() {
    console.error("NO ATTACH LIMIT");
  }
  async runAndGetId(sql: string, ...params: any[]) {
    await this.run(sql, ...params);
    const result = await this.get('SELECT last_insert_rowid() AS id');
    return result.id;
  }
}

export class Statement implements PreparedStatement {
  private stmt: SqlJs.Statement;
  private _db: SqlJs.Database;
  attach(stmt2: any, db: SqlJs.Database) {
    this.stmt = stmt2;
    this._db = db;
  }
  async finalize(...args: any[]) {
    this.stmt.free();
  }
  async run(...args: any[]) {
    this.stmt.run(args);
    const changes = this._db.getRowsModified(); // not sure about this...
    return {changes};
  }
  columns() {
    return this.stmt.getColumnNames();
  }
}


export const OPEN_READONLY = 1;
export const OPEN_READWRITE = 2;
export const OPEN_CREATE = 3;
export const LIMIT_ATTACHED = 4;
