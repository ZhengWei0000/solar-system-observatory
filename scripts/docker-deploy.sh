#!/usr/bin/env sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not found. Install Docker Engine on this host first."
  exit 1
fi

IMAGE_NAME="${IMAGE_NAME:-solar-system-observatory}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
CONTAINER_NAME="${CONTAINER_NAME:-solar-system-observatory}"
SITE_PORT="${SITE_PORT:-3000}"

if [ ! -f "deploy/.env.production" ]; then
  echo "deploy/.env.production not found."
  echo "Copy from deploy/.env.example and edit values first."
  cp deploy/.env.example deploy/.env.production
  echo "created deploy/.env.production, please update it and rerun."
  exit 1
fi

SITE_URL=$(grep '^NEXT_PUBLIC_SITE_URL=' deploy/.env.production | tail -n 1 | cut -d= -f2-)

echo "Building docker image: ${IMAGE_NAME}:${IMAGE_TAG}"
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

echo "Removing existing container if it exists..."
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo "Starting container..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  --env-file deploy/.env.production \
  -p "${SITE_PORT}:3000" \
  "${IMAGE_NAME}:${IMAGE_TAG}"

echo "Health check..."
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${SITE_PORT}/api/health" >/dev/null; then
    echo "Container is healthy."
    break
  fi
  echo "Waiting for health..."
  sleep 2
  if [ "$i" -eq 30 ]; then
    break
  fi
done

if ! curl -fsS "http://127.0.0.1:${SITE_PORT}/api/health" >/dev/null; then
  echo "Health check timeout. Check logs: docker logs ${CONTAINER_NAME}"
  exit 1
fi

echo "Done. Direct endpoint: http://localhost:${SITE_PORT}"
echo "Public endpoint tip: configure DNS to your domain and put an HTTPS reverse proxy in front if needed."
if [ -n "$SITE_URL" ]; then
  echo "Target site url: $SITE_URL"
fi
