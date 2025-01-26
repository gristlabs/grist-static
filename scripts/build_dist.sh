#!/bin/bash

set -e

# In dist directory, we will lay out files for packaging.
rm -rf dist

# In dist-test directory, we will lay out some test files.
rm -rf dist-test
mkdir dist-test

# Copy over main material.
./scripts/link_page_resources.sh copy
cp -r page/static dist
for f in $(cd page; ls *.grist *.csv *.html *.js); do
  ln -s ../page/$f dist-test/$f
done
./scripts/link_page_resources.sh link

# Remove some unnecessary symlinks that will make s3 syncs fail.
rm -f dist/mocha.js dist/mocha.css

# Remove some duplicates of sql.js not used in front-end.
rm -rf dist/static/sql.js/dist/
rm -rf dist/node_modules/sql.js/dist/
rm -f dist/sql.js/dist/sqljs-all.zip

# Remove some unhelpful dead links, I think related to the API console,
# which would need some effort to make work without a server.
rm -f dist/sinon.js
rm -f dist/swagger-ui.css
rm -f dist/swagger-ui-bundle.js

# Move entry points to top level of dist.
for f in components.js csv-viewer.js; do
  cp dist/pipe/$f dist
done
sed "s|bootstrapGristRelative = '..'|bootstrapGristRelative = '.'|" < dist/pipe/bootstrap.js  > dist/bootstrap.js
# Some synonyms of the main entry point.
cp dist/bootstrap.js dist/index.js
cp dist/bootstrap.js dist/latest.js

# Make the dist package available for testing in dist-test.
ln -s ../dist dist-test/static

echo "================================================"
echo "== Prepared dist and dist-test directory"
ls dist-test
