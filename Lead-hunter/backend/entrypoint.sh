#!/bin/sh
set -e

# Na primeira subida o banco está vazio e ainda não há migration.
# Autogera a migration inicial a partir dos models e aplica.
if [ -z "$(find migrations/versions -name '*.py' ! -name '__init__.py' 2>/dev/null)" ]; then
  echo "[entrypoint] Nenhuma migration encontrada — autogerando schema inicial..."
  alembic revision --autogenerate -m "initial schema"
fi

echo "[entrypoint] Aplicando migrations..."
alembic upgrade head

echo "[entrypoint] Subindo a API em :8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
