#!/bin/bash

set -ex
aws s3 cp s3://grist-static/latest.js s3://grist-static/previous.js
aws s3 cp s3://grist-static/next.js s3://grist-static/latest.js
