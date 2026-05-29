// Browser stub for `tmp`. tmp-promise calls promisify(tmp.tmpName) at
// module load, which throws if anything's undefined; every referenced
// field has to be a function.
const noop = (..._args: any[]) => undefined;
const noopCb = (_a: any, cb?: (...x: any[]) => void) => { if (cb) { cb(new Error('tmp stub')); } };
export = {
  file: noopCb,
  fileSync: noop,
  dir: noopCb,
  dirSync: noop,
  tmpName: noopCb,
  tmpNameSync: noop,
  tmpdir: '/tmp',
  setGracefulCleanup: noop,
};
