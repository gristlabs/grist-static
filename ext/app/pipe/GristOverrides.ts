/**
 * grist-static passes around some global state in a hacky way.
 * Here we at least try to shepherd the state into a single place.
 */


export interface GristOverrides {
  bootstrapGristPrefix?: string;
  staticGristOptions?: {
    name?: string;
  };
  /**
   * .grist doc URL.
   */
  seedFile?: string;
  /**
   * .csv file URL.
   */
  initialData?: string;
  /**
   * .csv file content to load. Not used when initialData is set.
   */
  initialContent?: string;
  fakeUrl?: string;
  fakeDocId?: string;
  singlePage?: boolean;

  // A hook to the document's REST API.
  expressApp?: MiniExpress;

  // Hooks for overriding behavior.
  behaviorOverrides?: {
    getCurrentUser?: () => unknown;
    getCurrentOrg?: () => unknown;
    onSave?: () => void;
  };
}

export function getGristOverrides(): GristOverrides {
  if (typeof window === 'undefined') { return {}; }
  return (window as any).gristOverrides || {};
}

export const gristOverrides = getGristOverrides();

/**
 * A bare-bones implementation of Express. Call run with a http request
 * method and path (e.g. /api/docs/DOCID/download/xlsx), and get back
 * information about what the "back-end" code for that endpoint did.
 */
export interface MiniExpress {
  run(options: {method: string, path: string}): Promise<ResponseInfo>;
}

/**
 * A grab-bag of information about a response.
 */
export interface ResponseInfo {
  // Keeps track of any res.set(key, val) calls.
  sets: Record<string, any>;

  // Keeps track of any res.setHeader(key, val) calls.
  headers: Record<string, any>;

  // Keeps track of material from a res.send() or a res.download().
  data: any;

  // Keeps track of a res.type() call.
  type?: string;

  // Set from a res.download() call.
  name?: string;
}
