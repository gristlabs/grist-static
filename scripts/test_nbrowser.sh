#!/usr/bin/env bash
#
# Drive an unmodified grist-core nbrowser test against the grist-static
# shadows. Replicates `yarn run test:nbrowser` from core, with two tweaks:
#
#   1. NODE_PATH puts _build/stubs before _build/ext before _build, so our
#      shadows in ext/test/nbrowser/ and ext/app/server/lib/ resolve before
#      the upstream files of the same name.
#   2. mocha gets `--require ext/test/grist-static-test-setup.js` (after
#      core's setupPaths.js, which mocha loads first), to install the in-
#      page recorder and post-mortem hook.
#
# Usage:
#     scripts/test_nbrowser.sh                        # default: Formulas (a fully-green suite)
#     scripts/test_nbrowser.sh '^Formulas '           # any mocha grep regex
#     HEADLESS=0 scripts/test_nbrowser.sh             # show the browser
#     VERBOSE=1 scripts/test_nbrowser.sh              # stream the server log
#     DEBUG=1 scripts/test_nbrowser.sh                # mocha -b --no-exit
#
# Requires: `make build` already done; Chrome + chromedriver on PATH; a
# Node that supports require(esm) without flags (checked at startup).

set -e

GREP="${1:-^Formulas }"

# Locate core/ via the script's realpath so symlinks don't fool us.
# Paths below are absolute against $CORE; the script body avoids cd
# so it works from any cwd.
CORE=$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/../core" && pwd)

( cd "$CORE" && node -e 'require("uuid")' ) 2>/dev/null \
  || { echo "node can't require(esm)" >&2; exit 1; }

# Compile the test-side shadows. tsc --build is incremental, so this is
# cheap. The webpack bundle is built separately by `make build`.
"$CORE/node_modules/.bin/tsc" --build "$CORE/ext/test/tsconfig.json"

# NODE_PATH order:
#   stubs  - server-side core stubs beat ext/'s browser versions in Node.
#   ext    - our shadows (sendAppPage, homeUtil) beat upstream.
#   _build - everything else falls through to upstream.
export NODE_PATH="$CORE/_build/stubs:$CORE/_build/ext:$CORE/_build"
# Read by ext/test/grist-static-test-setup.js so it can find core/'s
# node_modules without relying on cwd.
export GRIST_STATIC_CORE_DIR="$CORE"
export GRIST_TEST_LOGIN=1
# On a dark-themed OS, chrome's default-dark inverts cell colors and
# breaks rgba assertions. Force light mode locally; CI runs headless on
# a known-light OS so the flag isn't needed there.
[[ -z "$CI" ]] && export GRIST_TEST_FORCE_LIGHT_MODE=1
export TEST_SUITE=nbrowser
export TEST_SUITE_FOR_TIMINGS=nbrowser
export TIMINGS_FILE="$CORE/test/timings/nbrowser.txt"
[[ "${HEADLESS:-1}" != "0" ]] && export MOCHA_WEBDRIVER_HEADLESS=1

mocha_args=(
  --slow 8000
  -R "$CORE/test/xunit-file"
  --require "$CORE/ext/test/grist-static-test-setup.js"
  -g "$GREP"
  "$CORE/_build/test/nbrowser/**/*.js"
  "$CORE/_build/ext/test/nbrowser/**/*.js"
)
if [[ -n "$DEBUG" ]]; then
  mocha_args=(-b --no-exit "${mocha_args[@]}")
else
  mocha_args=(--forbid-only "${mocha_args[@]}")
fi

# The body avoided cd, but the spawned server resolves its main module
# relative to cwd, and mocha walks up from cwd for core's package.json
# (whose `mocha.require` picks Chrome). Both want cwd=core/.
cd "$CORE"
exec ./test/test_env.sh ./node_modules/.bin/mocha "${mocha_args[@]}"
