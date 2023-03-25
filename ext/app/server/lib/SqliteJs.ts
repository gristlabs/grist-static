import * as SqlJs from 'sql.js';
import initSqlJs = require('sql.js/dist/sql-wasm-debug');

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
      console.log("locateFile in", {file});
      let target = `static/sql.js/dist/${file}`;
      const prefix = typeof window !== 'undefined' && (window as any)?.bootstrapGristPrefix;
      if (prefix) {
        target = `${prefix}sql.js/dist/${file}`
      }
      console.log("locateFile out! - this doesn't work as far as i can see", {target});
      return target;
      //return `/home/paulfitz/cvs/grist-static/node_modules/sql.js/dist/${file}`;
    }
  });
}

export const sql = getSql();

export class JsDatabase implements MinDB {
  private db: Promise<SqlJs.Database>;
  constructor(path: string, mode: any, cb: (err: any, v?: any) => void) {
    this.db = new Promise<SqlJs.Database>((resolve, reject) => {
      console.log("DB", path, mode);
      sql.then(async sql => {
        try {
          console.log("working with.....", sql);
          const seedFile = path !== ':memory:' ? (window as any).seedFile : '';
          console.log("Have a seed file?", {seedFile});
          let seed: Uint8Array|undefined;
          if (seedFile) {
            console.log("Have a seed file", {seedFile});
            const resp = await window.fetch(seedFile);
            console.log("seed file result", resp.status, resp.statusText);
            if (!resp.ok) {
              throw new Error(seedFile + ": " + resp.statusText);
            }
            const data = await resp.arrayBuffer();
            const arr = new Uint8Array(data);
            console.log("Got seed file data", {arr});
            seed = arr;
          }

          //console.log("working with", sql);
          const db = new sql.Database(seed);
        //const step = (array: any) => {
        //console.log("CALLED STEP");
        //return array;
      //};
        //Object.defineProperty(step, 'length', { value: 0 });
        //console.log("length?", step.length);
          (db as any).create_aggregate('grist_marshal', {
            init: gristMarshal.initialize,
            //step,
            step: {
              length: 0,
              apply: (_: any, args: any[]) => {
                console.log("CALLED APPLY", {_, args});
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
      console.log("GOT", d);
      cb(null, d);
    });
  }
  async close() {
    (await this.db).close();
  }
  async run(sql: string, ...params: any[]) {
    const db = await this.db;
    console.log("SQLITE RUN", {sql, params});
    db.run(sql, params);
    const changes = db.getRowsModified();
    console.log("SQLITE RUN", {sql, params, changes});
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
    console.log("GET RESULT", {sql, args, result});
    return result;
  }
  async allMarshal(sql: string, ...args: any[]): Promise<Buffer> {
    console.log("allMarshal", {sql, args});
    return allMarshalQuery(this, sql, ...args);
  }
  async all(sql: string, ...args: any[]) {
    const db = await this.db;
    const result: any[] = [];
    const cb2 = (v: any) => {
      console.log("got v", v);
      result.push(v);
    }
    console.log("WORKING ON ALL", {sql, args});
    try {
      db.each(sql, args, cb2, () => 1);
    } catch (err) {
      console.log("PROBLEM", {
        err,
        keys: Object.keys(err),
      });
    }
    console.log("done", result);
    return result;
  }
  async exec(sql: string, ...args: any[]) {
    (await this.db).exec(sql, args);
  }
  // serialize(...args: any[]) { }
  async prepare(sql: string, ...args: any[]) {
    const stmt = new Statement();
    const stmt2 = (await this.db).prepare(sql, args);
    stmt.attach(stmt2, await this.db);
    return stmt;
  }
  async limitAttach() {
    console.log("NO ATTACH LIMIT");
  }
  async runAndGetId(sql: string, ...params: any[]) {
    await this.run(sql, ...params);
    const result = await this.get('SELECT last_insert_rowid() AS id');
    console.log({runAndGetId: result});
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
  foo() {
    console.log(this.stmt);
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
