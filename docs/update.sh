#!/bin/bash

# Make a version of the test page that uses next.js, to
# check embedded work before releasing.
cat index.html | sed "s/latest[.]js/next.js/g" > next.html
diff index.html next.html

# Allow looking at previous version also (for embedded work).
cat index.html | sed "s/latest[.]js/previous.js/g" > previous.html
diff index.html previous.html
