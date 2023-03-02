It should be possible to render Grist documents on static sites
without any special back end. This is a playground for that.
Nothing that works here yet.

 * Need a data engine that is browser-friendly.
   There's a Pyodide flavor that should be usable with some tweaks.
   https://github.com/gristlabs/grist-core/pull/437
 * Need a pure javascript library for interacting with Sqlite.
   There's plenty of them now.
 * Need to fiddle with bundling to pull out enough of the "server"
   code and disentangle any dependencies that won't work in browser.

Getting Pyodide in upstream will help keep this clean.
Another step is making the Sqlite libraries pluggable.
I've revived an old better-sqlite3 fork as a starting
point for that, because it has some useful fixes,
even though it doesn't matter for the static file project.

## What works now?

If you type `make` and follow instructions, you'll get
a version of Grist running at localhost:8484.  Clicking
on the create-a-new-document button should get you into
a working empty document. The SQLite part ony exists in
a transient state in your browser. It is still hooked up
to a backend though for the data engine (spreadsheet-style
updates). The backend uses pyodide but under node.
Just need to collapse these pieces together and cut out
all the unnecessary plumbing between them :-)

