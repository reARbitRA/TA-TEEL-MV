#!/bin/bash
# tools/verify/bootstrap.sh — set up headless Chromium for runtime verification.
# Playwright/Chromium CDNs are blocked in this sandbox; @sparticuz/chromium ships
# the browser binary inside its npm tarball (no CDN download needed).
# Re-run each session (node_modules never persists). ~10s.
set -e
cd "$(dirname "$0")"
if [ ! -d node_modules/@sparticuz/chromium ]; then
  npm init -y >/dev/null 2>&1
  npm install @sparticuz/chromium puppeteer-core --no-fund --no-audit 2>&1 | tail -1
fi
# extract the bundled AL2023 shared libs (libnspr4/libnss3 etc.) for LD_LIBRARY_PATH
mkdir -p /tmp/al2023
node -e "
const zlib = require('zlib'), fs = require('fs');
const br = fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br');
fs.writeFileSync('/tmp/al2023.tar', zlib.brotliDecompressSync(br));
" 
tar -xf /tmp/al2023.tar -C /tmp/al2023 2>/dev/null || true
echo "bootstrap OK: $(ls /tmp/al2023/lib | wc -l) libs, chromium $(du -sh /tmp/chromium 2>/dev/null || echo 'extracts on first run')"
