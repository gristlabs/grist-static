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
}

export function getGristOverrides(): GristOverrides {
  if (typeof window === 'undefined') { return {}; }
  return (window as any).gristOverrides || {};
}

export const gristOverrides = getGristOverrides();
