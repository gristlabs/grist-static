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

aws s3 sync dist/static $s3url
cat dist/latest.js | sed "s|XXX|'$http'|" > dist/latest-send.js
aws s3 cp dist/latest-send.js s3://grist-static/next.js --cache-control max-age=60
