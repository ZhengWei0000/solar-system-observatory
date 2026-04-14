#!/usr/bin/env sh
set -eu

BRANCH="${1:-main}"
REMOTE_NAME="${2:-origin}"
REMOTE_URL="${3:-}"

if [ ! -f ".git/config" ]; then
  echo "This folder is not a git repository."
  exit 1
fi

if [ -z "${REMOTE_URL}" ]; then
  CURRENT_REMOTE="$(git remote get-url "${REMOTE_NAME}" 2>/dev/null || true)"
  if [ -z "${CURRENT_REMOTE}" ]; then
    echo "Usage: ./scripts/push-to-github.sh <branch> <remote-name> <remote-url>"
    echo "Example: ./scripts/push-to-github.sh main origin https://github.com/ZhengWei0000/solar-system-observatory.git"
    echo "Current remote-url is empty. Provide it explicitly or set it first: git remote add origin <url>"
    exit 1
  fi
  REMOTE_URL="${CURRENT_REMOTE}"
fi

if [ -z "$(git remote get-url "${REMOTE_NAME}" 2>/dev/null || true)" ]; then
  git remote add "${REMOTE_NAME}" "${REMOTE_URL}"
fi

if [ -n "${GITHUB_TOKEN:-}" ] && printf '%s' "${REMOTE_URL}" | grep -q '^https://'; then
  AUTH_URL="$(printf '%s' "${REMOTE_URL}" | sed "s#https://#https://x-access-token:${GITHUB_TOKEN}@#")"
  echo "Using GH_TOKEN authentication with HTTPS..."
  git remote set-url "${REMOTE_NAME}" "${AUTH_URL}"
  git push -u "${REMOTE_NAME}" "${BRANCH}"
  git remote set-url "${REMOTE_NAME}" "${REMOTE_URL}"
  exit 0
fi

echo "No GITHUB_TOKEN found or remote is not HTTPS with token-compatible URL."
echo "Trying normal git push..."
echo "If pushed in non-interactive mode, use:"
echo "  export GITHUB_TOKEN=<your_pat>"
echo "  ./scripts/push-to-github.sh ${BRANCH} ${REMOTE_NAME} ${REMOTE_URL}"
git push -u "${REMOTE_NAME}" "${BRANCH}"
