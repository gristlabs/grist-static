// Enough to work with a single document in a browser

//import {Comm} from 'app/server/lib/Comm';
//import * as sqlite3 from 'app/server/lib/SQLite';
import {SQLiteDB} from 'app/server/lib/SQLiteDB';
//import {sql, Database} from 'app/server/lib/SQLite';
import {DocStorage} from 'app/server/lib/DocStorage';
//import {DocStorageManager} from 'app/server/lib/DocStorageManager';
import {ActiveDoc} from 'app/server/lib/ActiveDoc';
import {DocManager} from 'app/server/lib/DocManager';
import {NSandbox} from 'app/server/lib/NSandbox';

import {create} from 'app/server/lib/create';

process.env.GRIST_SANDBOX_FLAVOR = 'pyodideInline';

class FakeDocStorageManager {
  getPath(x: string) { return x; }
  renameDoc() { throw new Error('no renames'); }
  markAsChanged() {}
  scheduleUsageUpdate() {}
  prepareToCreateDoc() {}
  closeDocument() {}
  prepareLocalDoc() {}
}

export function get42() {
  return 42;
}

/*
export function checkTypes() {
  /// const c = new Comm(null as any, null as any);
  const s = new sqlite3.Database('x', 'x', () => 1);
  return [s];
}
*/

const stuff = {
  get42,
  /*
  makeDb: async() => {
    return new Promise((resolve) => {
      let x: any = new sqlite3.Database('x', 'x', () => resolve(x));
    })
  },
  */
  SQLiteDB,
//  Database,
//  sql,
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
};

export default stuff;
