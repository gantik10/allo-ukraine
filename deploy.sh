#!/bin/bash
# Збірка і деплой на GitHub Pages (гілка gh-pages).
# Використання: ./deploy.sh
set -e
cd "$(dirname "$0")"

echo "→ Збираю _site…"
rm -rf _site
mkdir -p _site/admin
cp -r store/. _site/
cp -r admin/. _site/admin/
cp -r planner _site/admin/planner
rm -f _site/start.sh _site/fetch_products.sh _site/admin/planner/start.sh _site/admin/planner/gen_manifest.sh
touch _site/.nojekyll

echo "→ Пушу в gh-pages…"
cd _site
git init -q -b gh-pages
git config user.name "gantik10"
git config user.email "gantikkrill@gmail.com"
git add -A
git commit -q -m "deploy $(date '+%Y-%m-%d %H:%M')"
git push -q -f https://github.com/gantik10/allo-ukraine.git gh-pages
cd ..
rm -rf _site

echo "✓ Готово → https://gantik10.github.io/allo-ukraine/  (адмінка: /admin/)"
