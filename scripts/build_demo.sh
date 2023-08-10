#!/bin/bash

set -e

./scripts/build_dist.sh

for f in $(find ./dist -maxdepth 1 -type l)
do
    cp --remove-destination $(readlink -e $f) $f
done