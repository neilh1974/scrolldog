#!/bin/zsh
set -eu

cd "$(dirname "$0")/.."

node tools/validate_extension.mjs
node tools/stage_extension.mjs

if ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  printf '%s\n' 'Xcode is required before Safari conversion can run.'
  exit 1
fi

xcrun safari-web-extension-converter \
  Build/WebExtension \
  --project-location Safari \
  --app-name "Scroll Dog" \
  --bundle-identifier com.neilhe.scrolldog \
  --macos-only \
  --force
