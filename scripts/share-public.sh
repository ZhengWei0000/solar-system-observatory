#!/usr/bin/env sh
set -eu

PORT="${PORT:-3000}"
HOST="${HOST:-127.0.0.1}"
BASE_URL="http://${HOST}:${PORT}"
USE_LOCALTUNNEL="false"
LOCAL_TUNNEL_HOST="${LOCAL_TUNNEL_HOST:-https://loca.lt}"
LOCAL_TUNNEL_SUBDOMAIN="${SHARE_SUBDOMAIN:-}"
LOCAL_TUNNEL_ARGS=""
HEALTH_CHECK_TIMEOUT="${SHARE_HEALTH_TIMEOUT:-4}"
AUTO_START="${AUTO_START_SERVER:-false}"
FORCE_BUILD="${FORCE_BUILD_SHARED_SITE:-false}"
BASE_CHECK_FAIL=true
if [ "${SKIP_LOCAL_CHECK:-false}" = "true" ]; then
  BASE_CHECK_FAIL=false
fi

case "${1:-}" in
  --localtunnel)
    USE_LOCALTUNNEL="true"
    ;;
  --cloudflared)
    USE_LOCALTUNNEL="false"
    ;;
  --prod)
    AUTO_START="true"
    FORCE_BUILD="true"
    ;;
esac

# Health probe helper.
probe() {
  if ! curl -fsS --max-time "${HEALTH_CHECK_TIMEOUT}" "$1" >/dev/null 2>&1; then
    return 1
  fi
}

start_prod_server() {
  if [ "${FORCE_BUILD}" = "true" ] || [ ! -f ".next/BUILD_ID" ]; then
    echo "Build required. Running build for share..."
    if command -v pnpm >/dev/null 2>&1; then
      pnpm build
    elif command -v node >/dev/null 2>&1; then
      npm install >/dev/null 2>&1 || true
      node ./node_modules/.bin/next build --webpack
    else
      echo "pnpm/node not found. Please install dependencies first."
      exit 1
    fi
  fi

  echo "Starting production server at ${BASE_URL}..."
  NODE_ENV=production ./node_modules/.bin/next start --hostname "${HOST}" --port "${PORT}" >/tmp/solar-system-share.log 2>&1 &
  SERVER_PID=$!
  trap 'kill "${SERVER_PID}" >/dev/null 2>&1 || true' EXIT

  for i in $(seq 1 30); do
    if probe "${BASE_URL}/api/health"; then
      echo "Server is healthy."
      return 0
    fi
    sleep 1
  done

  echo "Failed to start production server. Last logs:"
  tail -n 40 /tmp/solar-system-share.log || true
  exit 1
}

if [ ! -f "data/normalized/bodies.json" ]; then
  echo "data/normalized/bodies.json not found. Please run pnpm install first, then start the site."
  exit 1
fi

if [ "${BASE_CHECK_FAIL}" = "true" ] && ! probe "${BASE_URL}/api/health"; then
  if [ "${AUTO_START}" = "true" ]; then
    echo "No local server detected, starting production server for sharing."
    start_prod_server
  else
    echo "Share precheck failed: ${BASE_URL}/api/health not reachable."
    echo "Start your app first:"
    echo "  npx --yes pnpm@10 dev   # 开发态（默认）"
    echo "  或"
    echo "  npx --yes pnpm@10 build && npx --yes pnpm@10 start # 生产态"
    echo "如果必须直接分享，可用 AUTO_START_SERVER=true 再次启动脚本。"
    exit 1
  fi
fi

if ! probe "${BASE_URL}/api/bodies" || ! probe "${BASE_URL}/api/orbits?bodyId=earth&preset=overview-current" || ! probe "${BASE_URL}/api/search?q=earth"; then
  echo "Local API readiness check failed. Check API routes before sharing:"
  echo "  ${BASE_URL}/api/bodies"
  echo "  ${BASE_URL}/api/orbits?bodyId=earth&preset=overview-current"
  echo "  ${BASE_URL}/api/search?q=earth"
  exit 1
fi

if ! probe "${BASE_URL}/solar-system"; then
  echo "Share readiness check failed: /solar-system route is not ready."
  exit 1
fi

if [ -n "${LOCAL_TUNNEL_SUBDOMAIN}" ]; then
  LOCAL_TUNNEL_ARGS="--subdomain ${LOCAL_TUNNEL_SUBDOMAIN}"
fi

if command -v cloudflared >/dev/null 2>&1 && [ "$USE_LOCALTUNNEL" != "true" ]; then
  echo "Using cloudflared quick tunnel..."
  echo "If your app is already running at ${BASE_URL}, the share link will print below."
  exec cloudflared tunnel --url "${BASE_URL}"
fi

echo "cloudflared not found or --localtunnel requested. Using localtunnel..."
echo "If your app is already running at ${BASE_URL}, the share link will print below."
exec npx --yes localtunnel \
  --port "${PORT}" \
  --local-host "${HOST}" \
  --host "${LOCAL_TUNNEL_HOST}" \
  ${LOCAL_TUNNEL_ARGS}
