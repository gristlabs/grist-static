import { ApiError } from "app/common/ApiError";
import { GristLoadConfig } from "app/common/gristUrls";
import * as roles from 'app/common/roles';
import { GristOverrides } from "app/pipe/GristOverrides";


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

export async function makeDocAuthResult(docPromise: Promise<any>): Promise<DocAuthResult> {
  try {
    const doc = await docPromise;
    const removed = Boolean(doc.removedAt || doc.workspace.removedAt);
    return {docId: doc.id, access: doc.access, removed, cachedDoc: doc};
  } catch (error) {
    return {docId: null, access: null, removed: null, error};
  }
}


// TODO: factor out
export interface DocAuthResult {
  docId: string|null;         // The unique identifier of the document. Null on error.
  access: roles.Role|null;    // The access level for the requesting user. Null on error.
  removed: boolean|null;      // Set if the doc is soft-deleted. Users may still have access
                              // to removed documents for some purposes. Null on error.
  error?: ApiError;
  cachedDoc?: any;       // For cases where stale info is ok.
}
