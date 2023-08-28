#!/bin/bash

# Make a version of the test page that uses next.js, to
# check embedded work before releasing.
cat index.html | sed "s/csv-viewer[.]js/csv-viewer-next.js/g" > next.html
diff index.html next.html

# Make a version that uses grist-static from jsdelvr
cat index.html | sed "s|http.*csv-viewer[.]js|https://cdn.jsdelivr.net/npm/grist-static@0.1.2/dist/csv-viewer.js|g" > jsdelivr.html
diff index.html jsdelivr.html

# Allow looking at previous version also (for embedded work).
cat index.html | sed "s/csv-viewer[.]js/csv-viewer-previous.js/g" > previous.html
diff index.html previous.html
