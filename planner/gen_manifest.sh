#!/bin/bash
# Regenerate images/manifest.json + images/product-shots/manifest.json.
# Run after adding media, before pushing to GitHub Pages (no dir listings there).
cd "$(dirname "$0")"
for d in images images/product-shots; do
  (cd "$d" && ls -1 2>/dev/null | grep -Ei '\.(jpe?g|png|gif|webp|mp4|mov|webm)$' \
    | python3 -c 'import json,sys; print(json.dumps([l.rstrip("\n") for l in sys.stdin]))' > manifest.json)
  echo "$d/manifest.json: $(python3 -c "import json;print(len(json.load(open('$d/manifest.json'))))") files"
done
