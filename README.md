It should be possible to render Grist documents on static sites
without any special back end. This is a playground for that.

 [x] Need a data engine that is browser-friendly.
     There's a Pyodide flavor that should be usable with some tweaks.
     https://github.com/gristlabs/grist-core/pull/437
 [x] Need a pure javascript library for interacting with Sqlite.
     There's plenty of them now.
 [x] Need to fiddle with bundling to pull out enough of the "server"
     code and disentangle any dependencies that won't work in browser.

## What works now?

Actually can, with a bit of work, be used to build a Grist
document as a static page:

  https://paulfitz.github.io/scrapyard/grist-static/

Now that I've done it once, I need to clean up, get some small
patches upstream, and make the build put all the bits and pieces
in the right places.

