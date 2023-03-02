import * as sqlite3 from 'better-sqlite3';
export type { sqlite3 };

import { OpenMode } from 'app/server/lib/SQLiteDB';
import { allMarshalQuery, gristMarshal, MinDB, MinRunResult, PreparedStatement, ResultRow, SqliteVariant } from 'app/server/lib/SqliteCommon';


export class BetterSqlite3PreparedStatement implements PreparedStatement {
  public constructor(private _statement: sqlite3.Statement) {
  }

  public async run(...params: any[]): Promise<MinRunResult> {
    return (this._statement as any).run(...tweaked(params));
  }

  public async finalize() {}

  public columns() {
    return this._statement.columns().map(c => c.name);
  }
}

export class BetterSqliteVariant implements SqliteVariant {
  opener(dbPath: string, mode: OpenMode): Promise<MinDB> {
    return BetterSqlite3DatabaseAdapter.opener(dbPath, mode);
  }
}


export class BetterSqlite3DatabaseAdapter implements MinDB {
  public static async opener(dbPath: string, mode: OpenMode): Promise<any> {
    const _db = sqlite3.default(dbPath, {
      readonly: mode === OpenMode.OPEN_READONLY,
      fileMustExist: mode !== OpenMode.OPEN_CREATE && mode !== OpenMode.CREATE_EXCL,
    }).unsafeMode(true);   // unsafe so writable schema can be turned off and on - should refactor.
    // hmm no sqlite3_limit
    _db.aggregate('grist_marshal', {
      varargs: true,
      start: gristMarshal.initialize,
      step: gristMarshal.step,
      result: gristMarshal.finalize,
    });
    return new BetterSqlite3DatabaseAdapter(_db);
  }

  public constructor(protected _db: sqlite3.Database) {}

  public async exec(sql: string): Promise<void> {
    this._db.exec(sql);
  }

  public async run(sql: string, ...params: any[]): Promise<MinRunResult> {
    return this._db.prepare(sql).run(...tweaked(params));
  }

  public async get(sql: string, ...params: any[]): Promise<ResultRow|undefined> {
    return this._db.prepare(sql).get(...tweaked(params));
  }

  public async all(sql: string, ...params: any[]): Promise<ResultRow[]> {
    return this._db.prepare(sql).all(...tweaked(params));
  }

  public async prepare(sql: string): Promise<PreparedStatement> {
    return new BetterSqlite3PreparedStatement(this._db.prepare(sql));
  }

  public async runAndGetId(sql: string, ...params: any[]): Promise<number> {
    const result = await this.run(sql, ...params);
    const id = (result as any).lastInsertRowid;
    if (typeof id === 'bigint') {
      throw new Error('runAndGetId does not support bigint');
    }
    return id;
  }

  public async close() {
    this._db.close();
  }

  public async allMarshal(sql: string, ...params: any[]): Promise<Buffer> {
    return allMarshalQuery(this, sql, ...params);
  }

  /*
  public async allMarshal(sql: string, ...params: any[]): Promise<Buffer> {
    const q = this._db.prepare(sql);
    const cols = q.columns();
    const qq = cols.map((c: {name: string}) => c.name).map(quoteIdent).join(',');
    const names = cols.map((c: {name: string}) => c.name).map((c: string) =>
      quotePlain(c) + ' as ' + quoteIdent(c)).join(',');
    const test = await this.all(`select grist_marshal(${qq}) as buf FROM ` +
      `(select ${names} UNION ALL select * from (` + sql + '))', ...tweaked(params));
    return test[0].buf;
  }
  */

  public async limitAttach() {
    console.log("limitAttach does nothing with better-sqlite3 right now");
  }
}


function tweaked(params: any[]) {
  return params.map(p => p === true ? 1 : (p === false ? 0 : p));
}

