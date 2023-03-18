#!/bin/bash

set -ex

mode=link
if [[ "$1" = "copy" ]]; then
  mode=copy
fi

function transfer {
  src_extra=$1
  src=$2
  dest=$3
  if [[ "$mode" = "link" ]]; then
    ln -s $src $dest
  else
    echo "in $PWD"
    cp -r $src_extra$src $dest
  fi
}

cd core/static
rm -rf bootstrap bootstrap-datepicker jquery jqueryui hljs.default.css
rm -rf static node_modules pipe
cd ../..

cd page

rm -rf static
transfer ./ ../core/static static
cd static
transfer ../../core/static/ ../node_modules/bootstrap bootstrap
transfer ../../core/static/ ../node_modules/bootstrap-datepicker bootstrap-datepicker
transfer ../../core/static/ ../node_modules/jquery jquery
transfer ../../core/static/ ../node_modules/components-jqueryui jqueryui
transfer ../../core/static/ ../node_modules/highlight.js/styles/default.css hljs.default.css

# silly...
rm -rf static
mkdir -p static
cd static
transfer ./ ../../../node_modules/sql.js sql.js
cd ..
# super silly...
rm -rf node_modules
mkdir -p node_modules
cd node_modules
transfer ./ ../../../node_modules/sql.js sql.js
cd ..

rm -rf pipe
mkdir -p pipe
cd pipe
transfer ./ ../../../pipe/py.js py.js
transfer ./ ../../../pipe/py_main.js py_main.js
transfer ./ ../../../node_modules/pyodide pyodide
transfer ../../../core/app/server/ ../../sandbox/pyodide/_build/packages packages
cd ..

