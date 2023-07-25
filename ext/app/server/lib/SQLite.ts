import { gristOverrides } from 'app/pipe/GristOverrides';
import * as SqlJs from 'sql.js';
import initSqlJs = require('sql.js');

async function getSql() {
  return initSqlJs({
    locateFile: file => `node_modules/sql.js/dist/${file}`,
  });
}

export const sql = getSql();

function handleCallback<T>(op: () => Promise<T>,
                           cb: (err: any, val?: T) => void) {
  op().then(t => {
    cb(null, t);
  }).catch(e => {
    cb(e);
  });
}

export class Database {
  private db: Promise<SqlJs.Database>;
  constructor(path: string, mode: any, cb: (err: any, v?: any) => void) {
    this.db = new Promise<SqlJs.Database>((resolve, reject) => {
      sql.then(async sql => {
        try {
          const seedFile = gristOverrides.seedFile;
          if (seedFile) {
            const resp = await window.fetch(seedFile);
            const data = await resp.arrayBuffer();
            const arr = new Uint8Array(data);
            resolve(new sql.Database(arr));
          } else {
            resolve(new sql.Database());
          }
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
  close(...args: any[]) {
    const cb = args.pop();
    handleCallback(async () => {
      (await this.db).close();
    }, cb);
  }
  configure(...args: any[]) {
  }
  run(sql: string, ...args: any[]) {
    const cb = args.pop();
    handleCallback(async () => {
      (await this.db).run(sql, args);
    }, cb);
  }
  async get(sql: string, ...args: any[]) {
    const cb = args.pop();
    handleCallback(async () => {
      const stmt = (await this.db).prepare(sql, args);
      let result: any = undefined;
      try {
        if (stmt.step()) {
          result = stmt.getAsObject();
        }
      } finally {
        stmt.free();
      }
      return result;
    }, cb);
  }
  async all(sql: string, ...args: any[]) {
    const cb = args.pop();
    handleCallback(async () => {
      const result: any[] = [];
      const cb2 = (v: any) => {
        result.push(v);
      }
      (await this.db).each(sql, args, cb2, () => 1);
      return result;
    }, cb);
  }
  async exec(sql: string, ...args: any[]) {
    const cb = args.pop();
    handleCallback(async () => {
      return (await this.db).exec(sql, args);
    }, cb);
  }
  serialize(...args: any[]) { }
  prepare(sql: string, ...args: any[]) {
    const cb = args.pop();
    const stmt = new Statement();
    handleCallback(async () => {
      const stmt2 = (await this.db).prepare(sql, args);
      stmt.attach(stmt2);
    }, cb);
    return stmt;
  }
}

export class Statement {
  private stmt: SqlJs.Statement;
  attach(stmt2: any) {
    this.stmt = stmt2;
  }
  bind(...args: any[]) { throw new Error('nope'); }
  reset(...args: any[]) { throw new Error('nope'); }
  finalize(...args: any[]) {
    const cb = args.pop();
    this.stmt.free();
    cb(null);
  }
  each(...args: any[]) { throw new Error('nope'); }
  run(...args: any[]) {
    const cb = args.pop();
    this.stmt.run(args);
    cb(null);
  }
  get(...args: any[]) { throw new Error('nope'); }
  all(...args: any[]) { throw new Error('nope'); }
}


export const OPEN_READONLY = 1;
export const OPEN_READWRITE = 2;
export const OPEN_CREATE = 3;
export const LIMIT_ATTACHED = 4;
