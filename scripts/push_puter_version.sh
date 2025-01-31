#!/bin/bash

n="$1"
if [[ "$n" = "" ]]; then
  echo "please supply version number. Test with env var DRYRUN=1. Previous versions:"
  aws s3 ls s3://grist-static/experiments/PUTER/
  exit 0
fi

set -ex

n=$(printf "%04d" $n)

version="experiments/PUTER/e$n"
http="https://grist-static.com/$version/"
s3url="s3://grist-static/$version"
dryrun=${DRYRUN:+--dryrun}

# Send off the bulk of the material.
aws s3 sync ${dryrun} dist $s3url || {
  # Give an error message if this command fails (it can be hard to notice)
  echo "sync failed, aborting"
  exit 1
}

aws s3 cp ${dryrun} dist-test/puter.js $s3url/puter.js

# Tweak URL of bootstrap.js in index_puter.html, so it's found, and finds other files in its turn.
cat dist-test/index_puter.html | sed 's#static/pipe/bootstrap.js#bootstrap.js#' | \
  aws s3 cp ${dryrun} - $s3url/index_puter.html --content-type text/html

echo "Accessible at: ${http}index_puter.html"
