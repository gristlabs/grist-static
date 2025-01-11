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

# Some slightly messy file rewriting.
rm -rf dist-deploy
mkdir dist-deploy
cat dist/pipe/bootstrap.js | sed "s/^settings.bootstrapGristPrefix = .*/settings.bootstrapGristPrefix = XXX;/" > dist-deploy/latest.js
cat dist-deploy/latest.js dist/pipe/components.js > dist-deploy/csv-viewer.js

# Send off the bulk of the material.
aws s3 sync dist $s3url || {
  # Give an error message if this command fails (it can be hard to notice)
  echo "sync failed, aborting"
  exit 1
}

# Point to new version.
cat dist-deploy/latest.js | sed "s|XXX|'$http'|" > dist-deploy/latest-send.js
aws s3 cp dist-deploy/latest-send.js s3://grist-static/next.js --cache-control max-age=60

# Same for csv viewer.
cat dist-deploy/csv-viewer.js | sed "s|XXX|'$http'|" > dist-deploy/csv-viewer-send.js
aws s3 cp dist-deploy/csv-viewer-send.js s3://grist-static/csv-viewer-next.js --cache-control max-age=60
