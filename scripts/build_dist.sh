#!/bin/bash

set -e

rm -rf dist
mkdir dist

./scripts/link_page_resources.sh copy
cp -r page/static dist/static
for f in $(cd page; ls *.grist *.csv *.html); do
  ln -s ../page/$f dist/$f
done
./scripts/link_page_resources.sh link

cat dist/static/pipe/bootstrap.js | sed "s/^settings.bootstrapGristPrefix = .*/settings.bootstrapGristPrefix = XXX;/" > dist/latest.js

echo "================================================"
echo "== Prepared dist/static directory"
ls dist
