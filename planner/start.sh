#!/bin/bash
cd "$(dirname "$0")"
PORT=${1:-8766}
echo ""
echo "🤍  ALO UKRAINE Planner"
echo "─────────────────────────"
echo "→  Open: http://localhost:$PORT"
echo "→  Stop: Ctrl+C"
echo ""
python3 -m http.server $PORT
