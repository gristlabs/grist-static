It should be possible to render Grist documents on static sites
without any special back end. This is a playground for that.
Not ready for use, a lot of bits and pieces are still broken
or unpackaged.

## See a POC of Grist without a backend

```
git submodule update --init
make requirements
make build
./scripts/link_page_resources.sh
python -m http.server 3030
# now visit http://localhost:3030/page/
```

Or visit https://paulfitz.github.io/scrapyard/grist-static/

The sequence above places a lot of links in the `page`
directory. To collect files for uploading, use:

```
./scripts/link_page_resources.sh copy
```
