import { makeSimpleCreator } from 'app/server/lib/ICreate';
import { BetterSqliteVariant } from 'app/server/lib/SqliteBetter';
import { SqliteJsVariant } from 'app/server/lib/SqliteJs';

export const create = makeSimpleCreator({
  getSqliteVariant() {
    if (process.env.wefwefwef) {
      console.log("BETTER SQLITE VARIANT");
      return new BetterSqliteVariant();
    } else {
      console.log("SQLITE JS VARIANT");
      return new SqliteJsVariant();
    }
  }
});
