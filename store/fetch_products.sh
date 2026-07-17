#!/bin/bash
# Оновлення каталогу з aloyoga.com → products.json (rich-формат для сторінки товару:
# всі фото, наявність по розмірах, повний опис і буллети).
set -e
cd "$(dirname "$0")"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

page=1
while [ $page -le 30 ]; do
  curl -s --max-time 60 -H "User-Agent: $UA" "https://www.aloyoga.com/products.json?limit=250&page=$page" -o "$TMP/p$page.json"
  count=$(python3 -c "import json;print(len(json.load(open('$TMP/p$page.json'))['products']))" 2>/dev/null || echo 0)
  echo "page $page: $count"
  [ "$count" = "0" ] && break
  page=$((page+1))
  sleep 1
done
if [ $page -gt 30 ]; then echo "WARN: 30-page cap reached — catalog may be truncated"; fi

TMPDIR_ARG="$TMP" python3 <<'PYEOF'
import json, re, glob, os, datetime
tmp = os.environ['TMPDIR_ARG']
CDN = "https://cdn.shopify.com/s/files/1/2185/2813/files/"
out, seen = [], set()
for f in sorted(glob.glob(tmp + '/p*.json'), key=lambda x: int(re.search(r'p(\d+)\.json$', x).group(1))):
    try:
        prods = json.load(open(f))['products']
    except Exception:
        continue
    for p in prods:
        pid = str(p['id'])
        if pid in seen:
            continue
        seen.add(pid)
        t = p.get('product_type') or ''
        if t.lower() in ('internal', 'dnu') or 'gift card' in t.lower():
            continue
        variants = p.get('variants') or []
        if not variants:
            continue
        try:
            pr = float(variants[0].get('price') or 0)
        except Exception:
            continue
        if pr <= 0:
            continue
        imgs = []
        for im in (p.get('images') or [])[:5]:
            src = im.get('src') or ''
            if src.startswith(CDN):
                src = src[len(CDN):]
            if src:
                imgs.append(src)
        if not imgs:
            continue
        html = p.get('body_html') or ''
        feats = [re.sub(r'<[^>]+>', '', li).strip() for li in re.findall(r'<li[^>]*>(.*?)</li>', html, re.S)]
        feats = [x for x in feats if x][:6]
        desc = re.sub(r'<li[^>]*>.*?</li>', ' ', html, flags=re.S)
        desc = re.sub(r'<[^>]+>', ' ', desc)
        desc = re.sub(r'\s+', ' ', desc).strip()[:500]
        colors = []
        size_pos = None
        for o in (p.get('options') or []):
            n = (o.get('name') or '').lower()
            if n in ('color', 'colour'):
                colors = o.get('values') or []
            if n == 'size':
                size_pos = o.get('position')
        sd, order = {}, []
        for v in variants:
            sz = v.get('option%d' % size_pos) if size_pos else None
            if not sz:
                continue
            if sz not in sd:
                sd[sz] = 0
                order.append(sz)
            if v.get('available'):
                sd[sz] = 1
        sizesA = [[s, sd[s]] for s in order]
        avail = 1 if any(v.get('available') for v in variants) else 0
        cmp_ = variants[0].get('compare_at_price')
        try:
            cmp_ = float(cmp_) if cmp_ else None
        except Exception:
            cmp_ = None
        out.append({'id': pid, 'title': p.get('title', ''), 'handle': p.get('handle', ''), 'type': t,
                    'priceUSD': pr, 'compareUSD': cmp_, 'imgs': imgs, 'desc': desc, 'feats': feats,
                    'colors': colors, 'sizesA': sizesA, 'avail': avail})
json.dump({'generatedAt': datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'), 'cdnBase': CDN, 'products': out},
          open('products.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('products:', len(out))
PYEOF

ls -lh products.json
echo "done → products.json"
