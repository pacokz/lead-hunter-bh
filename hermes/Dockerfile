# Hermes Agent (Nous Research) rodando em container Linux.
# Instalado pelo script oficial: https://hermes-agent.nousresearch.com/install.sh
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    HERMES_HOME=/data \
    PATH="/usr/local/bin:/root/.local/bin:/root/.hermes/bin:${PATH}"

# Dependencias de sistema que o instalador do Hermes precisa
# (git, build tools, libffi, ripgrep para busca, ffmpeg para audio/TTS,
#  xz-utils para extrair o Node, ca-certificates para HTTPS).
RUN apt-get update && apt-get install -y --no-install-recommends \
      git curl ca-certificates xz-utils \
      build-essential python3 python3-dev python3-venv libffi-dev \
      ripgrep ffmpeg procps \
    && rm -rf /var/lib/apt/lists/*

# Instala o Hermes Agent em modo nao-interativo.
# Isso baixa uv (Python), Node.js 22 e o Playwright Chromium.
RUN curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --non-interactive

# Pre-builda a UI do painel web (web_dist) ainda na imagem, para o container
# subir instantaneo (sem buildar Vite a cada boot). Sobe o dashboard em
# loopback so para gerar os assets, espera o index.html e encerra.
RUN bash -c 'hermes dashboard --host 127.0.0.1 --port 9119 --no-open & \
      PID=$!; \
      for i in $(seq 1 240); do \
        [ -f /usr/local/lib/hermes-agent/hermes_cli/web_dist/index.html ] && break; \
        sleep 1; \
      done; \
      kill $PID 2>/dev/null || true; wait $PID 2>/dev/null || true; \
      test -f /usr/local/lib/hermes-agent/hermes_cli/web_dist/index.html'

# Config e credenciais ficam em HERMES_HOME (/data), persistido por volume.
WORKDIR /data

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
