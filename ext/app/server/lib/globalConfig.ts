export function getGlobalConfig() {
  return {
    edition: {
      async set(v: any) {},
      get(): 'core' { return 'core'; },
    },
  };
}



