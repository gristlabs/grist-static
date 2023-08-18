#!/bin/bash

set -ex
aws s3 cp s3://grist-static/latest.js s3://grist-static/previous.js --cache-control max-age=60
aws s3 cp s3://grist-static/csv-viewer.js s3://grist-static/csv-viewer-previous.js --cache-control max-age=60

aws s3 cp s3://grist-static/next.js s3://grist-static/latest.js --cache-control max-age=60
aws s3 cp s3://grist-static/csv-viewer-next.js s3://grist-static/csv-viewer.js --cache-control max-age=60
