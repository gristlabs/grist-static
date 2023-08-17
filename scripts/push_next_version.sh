#!/bin/bash

n="$1"
if [[ "$n" = "" ]]; then
  echo "please supply version number. Previously:"
  aws s3 ls s3://grist-static/experiments/
  exit 0
fi

n=$(printf "%04d" $n)

set -ex

version="experiments/e$n"
http="https://grist-static.com/$version/"
s3url="s3://grist-static/$version"

# remove some unnecessary testing stuff that will make sync fail.
rm -f dist/static/mocha.js dist/static/mocha.css
# sync
aws s3 sync dist/static $s3url

# point to new version
cat dist/latest.js | sed "s|XXX|'$http'|" > dist/latest-send.js
aws s3 cp dist/latest-send.js s3://grist-static/next.js --cache-control max-age=60

# same for csv viewer
cat dist/csv-viewer.js | sed "s|XXX|'$http'|" > dist/csv-viewer-send.js
aws s3 cp dist/csv-viewer-send.js s3://grist-static/csv-viewer-next.js --cache-control max-age=60
