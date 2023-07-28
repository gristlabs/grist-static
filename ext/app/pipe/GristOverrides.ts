/**
 * grist-static passes around some global state in a hacky way.
 * Here we at least try to shepherd the state into a single place.
 */


export interface GristOverrides {
  bootstrapGristPrefix?: string;
  staticGristOptions?: {
    name?: string;
  };
  seedFile?: string;
  initialData?: string;
  fakeUrl?: string;
  fakeDocId?: string;
  singlePage?: boolean;
}

export function getGristOverrides(): GristOverrides {
  if (typeof window === 'undefined') { return {}; }
  return (window as any).gristOverrides || {};
}

export const gristOverrides = getGristOverrides();
