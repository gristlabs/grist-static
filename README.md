# grist-static: Grist on static sites without embeds

This is an experimental way to view and interact with `.grist` files
(Grist spreadsheets) on regular websites, with no special back-end support needed.
The idea here is that it would be great for making reports if we could put
spreadsheets on a website like we do PDFs, with nice formatting
and navigation options and not much fuss.

If you *can* run a special back-end,
[grist-core](https://github.com/gristlabs/grist-core) is the most
battle-tested way to host Grist spreadsheets.
And for many purposes [Grist embedding](https://support.getgrist.com/embedding/)
may be adequate, where your embed a Grist spreadsheet
from an external Grist installation (such as the hosted service offered by
Grist Labs). But if you cannot host your data externally, and don't want
the operational burden of standing up a Grist installation of your own,
`grist-static` gives you a way to easily render Grist spreadsheets
on regular websites.
Like a PDF, people will be able to view the spreadsheet, navigate
around in it, and search within it. Better than a PDF, they'll be
able to change selections, and experiment with changing numbers to
see what happens. Every viewer has their own copy, and their changes
won't be seen by others, or stored.
This would also be a scalable way to show a Grist document to
millions of simultaneous users.

## See an example

https://gristlabs.github.io/grist-static shows a couple of
example Grist documents hosted on GitHub Pages:

https://user-images.githubusercontent.com/118367/227564527-82a9929c-40d3-4167-999f-6aeee4955723.mp4

## Serving a Grist document on a static website

These days, PDFs can be placed on a website, and you can link to them with the expectation that browsers will show them nicely.
Browsers don't have native support for Grist [yet :-)] but you can make a little wrapper page like this:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf8">
    <script src="https://grist-static.com/latest.js"></script>
  </head>
  <body>
    <script>
      bootstrapGrist({
        initialFile: 'investment-research.grist',
        name: 'Investment Research',
      });
    </script>
  </body>
</html>
```

  * I've been pushing Grist code to https://grist-static.com/ as a CDN; you can produce it all yourself using this repo.
  * After that, it is just a case of putting a `.grist` file on your server beside this `.html` file, and filing in the options to `bootstrapGrist`.
  * You can also pass `initialData: 'path/to/data.csv'` to import a CSV file into a new table. In this case `initialFile` is optional.
  * You can also pass `elementId: 'element-id` to open Grist within an element in your page.
  * You can set `light: true` for a less busy, single page layout.

## Differences with regular Grist

 * Changes aren't stored.
 * Changes are not shared with other viewers.
 * No specific access control.
 * Very immature, some features not yet ported, such as:
   - Attachments
	 - Should be doable (e.g. via service worker)
   - Importing and exporting
     - Again, doable, just "different"
   - Data size measurement
     - A needed configuration option on compiling SQLite.

## Tips for small .grist files

Grist spreadsheets by default store a lot of history in the `.grist` file.
You can prune that history by building `grist-core` and then, in the
`grist-core` directory, doing:

```
yarn run cli history prune PATH/TO/YOUR/doc.grist
```

Sorry this is awkward.

## Building from source

```
git submodule update --init
make requirements
make build
make link
python -m http.server 3030
# now visit http://localhost:3030/page/index.html
```

The sequence above places a lot of links in the `page`
directory, for convenience during development. To collect
files for uploading, use instead:

```
make package
# everything you need is in dist/static
```

## Roadmap

This is an unofficial personal experiment, not a Grist Labs product.
It is still rough and hacky. Pieces that don't work "naturally"
(e.g. imports, exports, snapshots, custom widgets) aren't disabled, they
just ... won't do anything.

I am interested in making user changes persist in their browser -
[OPFS](https://sqlite.org/wasm/doc/tip/persistence.md#opfs)
may be a good option for that, once it has broad browser support.

 * [X] Get something that works on a webserver without special COOP/COEP headers.
 * [ ] Start making versioned .zip releases of all needed assets.
 * [ ] Mirror grist-widgets from github pages to a site with the needed headers (such as grist-static.com). 
 * [X] Get a few small tweaks to enable plugging in alternate storage and build steps landed upstream in `grist-core`.
 * [ ] Whittle down the code and clean up the demo now I know what I'm doing.
 * [ ] Hide parts of UI that don't make sense in this context.
 * [ ] Consider switching to SQLite developers' version of sqlite.js, which has good local storage support.
 * [ ] Enable at least one export option (Download *.grist seems easiest).
 * [ ] Enable at least one import option.
 * [ ] Give a better way of pruning *.grist files.
 * [ ] Currently, if a *.grist file is old relative to the code, and a migration needs to run, the "data engine"
   may end up on the critical path to showing the document (and that remains the case indefinitely since the result
   of migration cannot be stored). The data engine is relatively slow to start up, compared to the rest of the
   app, so this is sad. Look at ways around this.
