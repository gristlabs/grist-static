// Enough to work with a single document in a browser

//import {Comm} from 'app/server/lib/Comm';
//import * as sqlite3 from 'app/server/lib/SQLite';
import {SQLiteDB} from 'app/server/lib/SQLiteDB';
//import {sql, Database} from 'app/server/lib/SQLite';
import {DocStorage} from 'app/server/lib/DocStorage';
//import {DocStorageManager} from 'app/server/lib/DocStorageManager';
import {ActiveDoc, Deps as ActiveDocDeps} from 'app/server/lib/ActiveDoc';
import {DocManager} from 'app/server/lib/DocManager';
import {NSandbox} from 'app/server/lib/NSandbox';

import {create} from 'app/server/lib/create';

process.env.GRIST_SANDBOX_FLAVOR = 'pyodideInline';

// Provide a default list of custom widgets.
process.env.GRIST_WIDGET_LIST_URL =
  'https://gristlabs.github.io/grist-widget/manifest.json';

ActiveDocDeps.ACTIVEDOC_TIMEOUT_ACTION = 'ignore';

class FakeDocStorageManager {
  getPath(x: string) { return x; }
  renameDoc() { throw new Error('no renames'); }
  markAsChanged() {}
  scheduleUsageUpdate() {}
  prepareToCreateDoc() {}
  closeDocument() {}
  prepareLocalDoc() {}
  makeBackup() {}
}

// A simple test function for when things go wrong.
function get42() {
  return 42;
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
};

export default backend;
