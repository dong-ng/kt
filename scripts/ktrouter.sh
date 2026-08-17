#!/usr/bin/env bash
# ==============================================================================
# KTRouter - Lightweight Native Launcher (Bun Standalone)
# ==============================================================================

DIR="/Users/admin/Documents/Code/router/ktrouter"
export PORT="${PORT:-3008}"
export HOSTNAME="${KT_HOSTNAME:-127.0.0.1}"
export NODE_ENV="production"

BUN_BIN="${HOME}/.bun/bin/bun"
if ! command -v bun &> /dev/null && [ -f "$BUN_BIN" ]; then
  export PATH="${HOME}/.bun/bin:$PATH"
fi

if [ -f "$DIR/.next/standalone/custom-server.js" ]; then
  cd "$DIR/.next/standalone"
  exec bun custom-server.js "$@"
elif [ -f "$DIR/.next/standalone/server.js" ]; then
  cd "$DIR/.next/standalone"
  exec bun server.js "$@"
else
  echo "[ktrouter] Standalone build not found. Running npm start..."
  cd "$DIR" && exec npm start "$@"
fi
