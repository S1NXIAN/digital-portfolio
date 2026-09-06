#!/usr/bin/env bash
set -euo pipefail

# Self-ping keep-alive script.
# Pings the application endpoint every 14 minutes using curl to keep free hosting tiers warm.
# Usage: ./scripts/self-ping.sh [TARGET_URL]

interval_min="${SELF_PING_INTERVAL_MIN:-14}"
interval_sec=$(( interval_min * 60 ))
raw_target="${1:-${SELF_PING_URL:-${RENDER_EXTERNAL_URL:-http://localhost:3000}/api}}"
target="${raw_target%/}"
if [[ "$target" != */api ]]; then
  target="${target}/api"
fi

echo "[self-ping] Pinging ${target} every ${interval_min} minutes (${interval_sec}s)..."

while true; do
  timestamp="$(date -u +"%Y-%m-%d %H:%M:%SZ")"
  http_status="$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "${target}" || echo "000")"
  echo "[self-ping] ${timestamp} -> ${http_status} ${target}"
  sleep "${interval_sec}"
done
