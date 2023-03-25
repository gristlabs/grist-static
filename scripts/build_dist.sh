#!/bin/bash

set -e

rm -rf dist
mkdir dist

./scripts/link_page_resources.sh copy
cp -r page/static dist/static
for f in $(cd page; ls *.grist *.js *.html); do
  ln -s ../page/$f dist/$f
done
./scripts/link_page_resources.sh link

echo "================================================"
echo "== Prepared dist/static directory"
ls dist
