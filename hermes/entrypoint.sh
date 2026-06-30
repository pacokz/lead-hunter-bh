#!/usr/bin/env bash
set -e

HERMES_BIN="$(command -v hermes || echo /usr/local/bin/hermes)"
DIST=/usr/local/lib/hermes-agent/hermes_cli/web_dist/index.html

echo "Hermes: $HERMES_BIN"
"$HERMES_BIN" --version 2>/dev/null | head -n 1 || true

ARGS=(dashboard --host 0.0.0.0 --port 9119 --no-open)
# Se a UI ja foi buildada na imagem, pula o build no boot (sobe instantaneo).
if [ -f "$DIST" ]; then
  ARGS+=(--skip-build)
fi

echo "Iniciando o painel web do Hermes em http://0.0.0.0:9119 (login: ${HERMES_DASHBOARD_BASIC_AUTH_USERNAME:-admin})"
exec "$HERMES_BIN" "${ARGS[@]}"
