# grist-static: Grist on static sites without embeds

This is a way to view and interact with `.grist` files
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

  * The code in this repository is available from https://grist-static.com/ as a CDN; you can produce it all yourself using this repo.
  * After that, it is just a case of putting a `.grist` file on your server beside this `.html` file, and filing in the options to `bootstrapGrist`.
  * You can also pass `initialData: 'path/to/data.csv'` to import a CSV file into a new table. In this case `initialFile` is optional.
  * There is also `initialContent` option. You can use it to pass the content of a CSV file.
  * You can also pass `elementId: 'element-id` to open Grist within an element in your page.
	- In that case, you can include a small wrapper page for your document as above, and embed it as an iframe yourself.
  * You can set `singlePage: true` for a less busy, single page layout.

## Grist CSV Viewer

Grist can handle data in multiple formats, including CSV. Since CSV is such a common format, and interacting with it
online remains a chore, we've packaged `grist-static` into a streamlined `csv-viewer.js` utility specifically for
viewing, sorting, filtering, any copy/pasting from CSV, directly in a webpage.

Just add the viewer in the `head` area of a webpage:

```html
<head>
  <script src="https://grist-static.com/csv-viewer.js"></script>
</head>
```

Then you can make a button to open CSV from a URL:
```html
<button data-grist-csv-open="transactions.csv">View CSV</button>
```
The CSV could be a file, or a URL of CSV data that your site generates for a user dynamically.

If you are working with links rather than buttons, the same approach works:

```html
<a data-grist-csv-open="transactions.csv" href="#">View CSV</a>
```

You can of course style the buttons and links as you wish.

## Grist CSV Viewer as a web component

The CSV Viewer can also be used as a web component called `csv-viewer`:

```html
<html>
  <head>
    <script src="https://grist-static.com/csv-viewer.js"></script>
  </head>
  <body>
    <csv-viewer initial-data="path/to/data.csv" style="height: 500px; border: 1px solid green">
    </csv-viewer>
  </body>
</html>
```

The component in fact accepts the same set of options as the `bootstrapGrist` function, so you can configure it to show either a CSV file or (despite its name) a Grist document of your choice. Full list of options available:

- `initial-file`: The initial Grist document to load.
- `initial-data`: A CSV file to import.
- `initial-content`: A content of a CSV file to import.
- `name`: The name of the Grist document to use.
- `single-page`: A boolean attribute that, when present, displays the document in a less busy, single page layout.
- `loader`: A boolean attribute that, when present, displays a loading spinner while the document is loading.

## More viewer options

We've seen that with `csv-viewer.js`, any element can be converted to a link that opens a popup with a CSV file. All you need to do is to add `data-grist-csv-open` attribute to it.

There are other options available.

  * Setting `data-grist-doc-open` allows opening a Grist document rather than a CSV (despite the utility's name).
  * Set `data-single-page` to `true` for a single page layout, or `false` for a multi-page layout.
  * Use `data-name` to override the default document name shown in the multi-page layout.
  * Use `data-loader` to show a loading spinner while the document is loading. This is enabled by default, pass `data-loader="false"` to disable it.

There are also some predefined button classes, specifically `grist`
and `grist-large`, that offer Grist's default styling.

For finer control, there is a global `previewInGrist` function with the same API as `bootstrapGrist`,
but instead of rendering inline it opens a preview in a popup. This might be useful for any dynamically created content or files that are not available at the time of page load.

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
make serve
# now visit http://localhost:3030/page/
```

The sequence above places a lot of links in the `page`
directory, for convenience during development. To collect
files for uploading, use instead:

```
make package
# everything you need is in dist/
```

## Serving all files from your own website or CDN

All HTML examples so far have used `https://grist-static.com/`,
a domain operated by Grist Labs that only serves static files.
This domain logs traffic to measure usage, but does not set or track cookies.
You can copy all needed files to your own website or CDN to keep your
traffic completely private.

You can get the files needed by:

 * Building from source.
 * Or by running `npm pack grist-static` to fetch the latest tarball from the NPM registry.
 * Or by visiting https://registry.npmjs.org/grist-static/latest and finding a link to the latest tarball, then downloading it.

Tarballs (`.tgz` files) are a common archive format, with many free
tools available for unpacking them.
However you get there, in the end you will have a `dist/` directory
containing `csv-viewer.js`, `latest.js`, and many other
files that make up Grist. Place that material where you wish,
and update your URLs appropriately.

The `jsdelivr` CDN automatically mirrors packages placed on NPM,
so let's use it as an example. We could replace:

```html
<script src="https://grist-static.com/csv-viewer.js"></script>
```

with:

```html
<script src="https://cdn.jsdelivr.net/npm/grist-static@latest/dist/csv-viewer.js"></script>
```

Of course, this particular change would simply move usage information
to `jsdelivr.net` rather than `grist-static.com`, but you get
the idea. Just use the same pattern for wherever you choose to place
the files.

## Roadmap

It could be neat to make user changes persist in their browser -
[OPFS](https://sqlite.org/wasm/doc/tip/persistence.md#opfs)
may be a good option for that, once it has broad browser support.
Other steps:

 * [X] Get something that works on a webserver without special COOP/COEP headers.
 * [ ] Start making versioned .zip releases of all needed assets.
 * [X] Get a few small tweaks to enable plugging in alternate storage and build steps landed upstream in `grist-core`.
 * [ ] Support attachments - maybe serve as data URIs? Might need a service worker if separate URLs are unavoidable.
 * [ ] Whittle down the code and clean up the demo now we know what we're doing.
 * [ ] Hide parts of UI that don't make sense in this context.
 * [ ] Consider switching to SQLite developers' version of sqlite.js, which has good local storage support.
 * [ ] Enable at least one export option (Download *.grist seems easiest).
 * [ ] Enable at least one import option.
 * [ ] Give a better way of pruning *.grist files.
 * [ ] Currently, if a *.grist file is old relative to the code, and a migration needs to run, the "data engine"
   may end up on the critical path to showing the document (and that remains the case indefinitely since the result
   of migration cannot be stored). The data engine is relatively slow to start up, compared to the rest of the
   app, so this is sad. Look at ways around this.
