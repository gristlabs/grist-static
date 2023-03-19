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

https://paulfitz.github.io/scrapyard/grist-static-take2/index.html
is a Grist document with some investment data and analysis,
hosted on GitHub Pages:

https://user-images.githubusercontent.com/118367/226204523-82ef98b3-5543-4907-9ce2-3c4fba79fd83.mp4

For neatness, I stored as many assets as I could on a CDN.
You can use this repository to collect them all to place where
you want.

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

I don't have any particular roadmap in mind, just enjoying making
Grist work in all the places. I do want to clean up the code in this
repo, now that I've make a POC know what I'm doing.

For many purposes [Grist embedding](https://support.getgrist.com/embedding/)
may be what you want. That will let you embed a Grist document
from a Grist installation (such as the hosted service offered by
Grist Labs) onto another website.
