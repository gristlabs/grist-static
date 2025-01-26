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
   * .grist doc URL or data.
   */
  seedFile?: string|URL|Uint8Array;
  /**
   * URL of a file to fetch for importing, or a File object to import directly.
   * The extension in the name (or in the URL path) determines how it's parsed.
   */
  initialData?: string|File;
  /**
   * .csv file content to load. Not used when initialData is set. Note that this is ONLY for csv
   * data. For other filetypes (e.g. xlsx), set initialData to a File with a suitable name.
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
    getCurrentDocName?: () => string|undefined;
    getCurrentDocId?: () => string|undefined;
    onOpenComplete?: () => void;
    onChange?: () => void;
    save?: () => void;
    rename?: (newName: string) => Promise<unknown>;
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
