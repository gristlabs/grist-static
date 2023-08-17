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
  * There is also `initialContent` option. You can use it to pass the content of a CSV file.
  * You can also pass `elementId: 'element-id` to open Grist within an element in your page.
    - If using `elementId`, and serving a `.grist` or `.csv` file at a URL that requires cookie-based authentication, be aware that Firefox may not support this yet ([bug report](https://bugzilla.mozilla.org/show_bug.cgi?id=1741489)).
	- In that case, you can include a small wrapper page for your document as above, and embed it as an iframe yourself.
  * You can set `singlePage: true` for a less busy, single page layout.


### No-Code integration

We have a few building blocks ready for you, that makes **embedding** CSV or Grist files as easy as possible.
In order to use them, first include the `csv-viewer.js` script somewhere near the top of the page. The first one is a custom `csv-viewer` web element.

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

It allows you to embed CSV file right inside your page, where and how you want it (no JavaScript
required). It accepts the same set of options as `bootstrapGrist` function, so you can configure it
to show either a CSV file are a Grist document of your choice. Full list of options available:

- `initial-file`: The initial Grist document to load.
- `initial-data`: A CSV file to import.
- `initial-content`: A content of a CSV file to import.
- `name`: The name of the Grist document to use.
- `single-page`: A boolean attribute that, when present, displays the document in a less busy, single page layout.
- `loader`: A boolean attribute that, when present, displays a loading spinner while the document is loading.

#### Open with Grist button

For a busy page, you can easily include external data and show it as a popup:

```html
<html>
  <head>
    <script src="https://grist-static.com/csv-viewer.js"></script>
  </head>
  <body>
    Here is a <button data-grist-csv-open="path/to/report">financial report</button> for the current year.

    Here is the same <a data-grist-csv-open="path/to/report" href="#">report</a> as a link.
  </body>
</html>
```

Any element can be converted to a link that opens a popup with a CSV file. All you need to do is to add `data-grist-csv-open` attribute to it. You can also use `data-grist-doc-open` to open a Grist document.
As with <csv-viewer> component, you can pass additional options to it, like:
* `data-single-page` for a single page layout,
* `data-name` to override the default document name,
* `data-loader` to show a loading spinner while the document is loading. This is enabled by default,
pass `data-loader="false"` to disable it.


You can also used a predefined button's classes, like `grist` or `grist-large`, to reuse Grist's 
default styling.


For finer control, there is a global `previewInGrist` function with the same API as `bootstrapGrist`,
but instead of rendering inline it opens a preview in a popup. This might be useful for any dynamically created content or a files that are not available at the time of page load.


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
