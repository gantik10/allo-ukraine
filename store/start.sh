#!/bin/bash
# Serve the ALO UKRAINE storefront locally.
cd "$(dirname "$0")"
echo "ALO UKRAINE store -> http://localhost:8767"
python3 -m http.server 8767
