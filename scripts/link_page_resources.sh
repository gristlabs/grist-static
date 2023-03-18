#!/bin/bash

set -ex

rm -rf page/static
cd page
ln -s ../core/static static
cd ../core/static
rm -f bootstrap bootstrap-datepicker jquery jqueryui hljs.default.css
ln -s ../node_modules/bootstrap bootstrap
ln -s ../node_modules/bootstrap-datepicker bootstrap-datepicker
ln -s ../node_modules/jquery jquery
ln -s ../node_modules/components-jqueryui jqueryui
ln -s ../node_modules/highlight.js/styles/default.css hljs.default.css

# silly...
rm -rf static
mkdir -p static
ln -s ../../../node_modules/sql.js static/sql.js
# super silly...
rm -rf node_modules
mkdir -p node_modules
ln -s ../../../node_modules/sql.js node_modules/sql.js

rm -rf pipe
mkdir -p pipe
ln -s ../../../pipe/py.js pipe/py.js
ln -s ../../../pipe/py_main.js pipe/py_main.js
ln -s ../../../node_modules/pyodide pipe/pyodide
ln -s ../../sandbox/pyodide/_build/packages pipe/packages
