This tweaks Grist for use on static sites, with no specific
back-end support.

Could be handy for dropping a report onto a website as a
spreadsheet. People will be able to view the spreadsheet,
click around in it, change selections, try changing
numbers to see what happens. They won't be able to save their
results, though ([OPFS](https://sqlite.org/wasm/doc/tip/persistence.md#opfs)
may be a good option for that, once it has broad browser support).

This would also be a scalable way to show a Grist document to
millions of simultaneous users.

## See an example

https://paulfitz.github.io/grist-static shows a couple of
example Grist documents hosted on GitHub Pages:

https://user-images.githubusercontent.com/118367/226204523-82ef98b3-5543-4907-9ce2-3c4fba79fd83.mp4

## Make a local Proof Of Concept of Grist without a backend

```
git submodule update --init
make requirements
make build
./scripts/link_page_resources.sh
python -m http.server 3030
# now visit http://localhost:3030/page/index.html
```

The sequence above places a lot of links in the `page`
directory, for convenience during development. To collect
files for uploading, use instead:

```
./scripts/link_page_resources.sh copy
```

## Roadmap

This is an unofficial personal experiment, not a Grist Labs product.
It is still rough and hacky. Pieces that don't work "naturally"
(e.g. imports, exports, snapshots, custom widgets) aren't disabled, they
just ... won't do anything.

For many purposes [Grist embedding](https://support.getgrist.com/embedding/)
may be what you want. That will let you embed a Grist document
from a Grist installation (such as the hosted service offered by
Grist Labs) onto another website.

All that said, here is what I'm thinking:

 * [X] Get something that works on a webserver without special COOP/COEP headers.
 * [ ] Start making versioned .zip releases of all needed assets.
 * [ ] Get a few small tweaks to enable plugging in alternate storage and build steps landed upstream in `grist-core`.
 * [ ] Whittle down the code and clean up the demo now I know what I'm doing.
 * [ ] Hide parts of UI that don't make sense in this context.
 * [ ] Consider switching to SQLite developers' version of sqlite.js, which has good local storage support.
 * [ ] Enable at least one export option (Download *.grist seems easiest).
 * [ ] Enable at least one import option.
 
