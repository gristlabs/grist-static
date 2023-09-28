import { ApiError } from "app/common/ApiError";
import { GristLoadConfig } from "app/common/gristUrls";
import * as roles from 'app/common/roles';
import { GristOverrides } from "app/pipe/GristOverrides";

/**
 * Bare minimum HomeDBManager that implements getDoc - this is enough
 * for the DocApi endpoints we are using so far.
 */
export class HomeDBManager {
  public async getDoc(reqOrScope: any) {
    const config = (window as any).gristConfig as GristLoadConfig;
    const overrides = (window as any).gristOverrides as GristOverrides;
    return {
      id: config.assignmentId,
      name: overrides.staticGristOptions?.name || 'grist',
    };
  }
}

/**
 * Bare minimum function for extracting a DocAuthResult.
 * We don't have any security concerns, so just put
 * an "owners" access level on the doc.
 */
export async function makeDocAuthResult(docPromise: Promise<any>): Promise<DocAuthResult> {
  try {
    const doc = await docPromise;
    return {docId: doc.id, access: 'owners', removed: false, cachedDoc: doc};
  } catch (error) {
    return {docId: null, access: null, removed: null, error};
  }
}

// TODO: ideally pull this out of grist-core HomeDBManager.
// For the moment, I need to avoid including that, since I'm
// not ready to deal with a second SQLite database, and we
// really don't need the Home DB yet, we just need enough to
// be able to fake getDoc calls.
export interface DocAuthResult {
  docId: string|null;
  access: roles.Role|null;
  removed: boolean|null;
  error?: ApiError;
  cachedDoc?: any;
}
