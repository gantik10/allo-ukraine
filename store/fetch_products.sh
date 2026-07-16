#!/bin/bash
# Refresh the ALO UKRAINE catalog from aloyoga.com (Shopify public products endpoint).
# Usage: ./fetch_products.sh
# Writes products.json ({"generatedAt": "...", "products": [...]}) next to this script.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
MAX_PAGES=30

for ((page=1; page<=MAX_PAGES; page++)); do
  echo "Fetching page $page..." >&2
  curl -sf -A "$UA" "https://www.aloyoga.com/products.json?limit=250&page=$page" \
    -o "$TMP/page$page.json"
  count=$(python3 -c "import json,sys; print(len(json.load(open(sys.argv[1]))['products']))" "$TMP/page$page.json")
  echo "  -> $count products" >&2
  if [ "$count" -eq 0 ]; then
    rm -f "$TMP/page$page.json"
    break
  fi
  if [ "$page" -eq "$MAX_PAGES" ]; then
    echo "Warning: hit page cap ($MAX_PAGES); catalog may be truncated." >&2
  fi
  sleep 1
done

python3 - "$TMP" "$DIR/products.json" <<'PYEOF'
import glob, html, json, os, re, sys
from datetime import datetime, timezone

tmp_dir, out_path = sys.argv[1], sys.argv[2]
TAG_RE = re.compile(r'<[^>]+>')
WS_RE = re.compile(r'\s+')

def strip_html(s, limit=300):
    if not s:
        return ''
    text = WS_RE.sub(' ', html.unescape(TAG_RE.sub(' ', s))).strip()
    if len(text) > limit:
        text = text[:limit].rsplit(' ', 1)[0].rstrip() + '…'
    return text

products, seen = [], set()
files = sorted(glob.glob(os.path.join(tmp_dir, 'page*.json')),
               key=lambda f: int(re.search(r'page(\d+)', f).group(1)))
for f in files:
    with open(f) as fh:
        data = json.load(fh)
    for p in data['products']:
        if p['id'] in seen:
            continue
        seen.add(p['id'])
        variants = p.get('variants') or []
        images = p.get('images') or []
        if not variants or not images:
            continue
        v = variants[0]
        try:
            price = float(v.get('price') or 0)
        except (TypeError, ValueError):
            continue
        if price <= 0:
            continue
        compare = None
        try:
            c = float(v.get('compare_at_price') or 0)
            if c > 0:
                compare = c
        except (TypeError, ValueError):
            pass
        colors, sizes = [], []
        for opt in (p.get('options') or []):
            name = (opt.get('name') or '').strip().lower()
            if name in ('color', 'colour'):
                colors = opt.get('values') or []
            elif name == 'size':
                sizes = opt.get('values') or []
        products.append({
            'id': p['id'],
            'title': p.get('title') or '',
            'handle': p.get('handle') or '',
            'type': p.get('product_type') or '',
            'priceUSD': price,
            'compareUSD': compare,
            'img': images[0].get('src'),
            'img2': images[1].get('src') if len(images) > 1 else None,
            'desc': strip_html(p.get('body_html')),
            'colors': colors,
            'sizes': sizes,
        })

out = {
    'generatedAt': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC'),
    'products': products,
}
with open(out_path, 'w') as fh:
    json.dump(out, fh, ensure_ascii=False, separators=(',', ':'))

size_mb = os.path.getsize(out_path) / 1024 / 1024
print(f'Wrote {len(products)} products to {out_path} ({size_mb:.1f} MB)', file=sys.stderr)
if size_mb > 6:
    print('Warning: file exceeds 6 MB; consider truncating descriptions harder.', file=sys.stderr)
PYEOF
