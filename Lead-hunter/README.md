# Lead Hunter BH

Plataforma de prospecção comercial em Belo Horizonte. Encontra comércios sem site /
com site ruim, gera demos e entrega pacotes de abordagem prontos.

> Orquestração pelo **OpenClaw** (nativo no host). Backend e banco no **Docker**.
> Documento mestre: [`docs/PLAYBOOK_IMPLEMENTACAO.md`](docs/PLAYBOOK_IMPLEMENTACAO.md).

## Status

**Fase 1 — Fundação** (em validação): backend FastAPI, Postgres, models, enums,
migrations Alembic, camada de logs e testes. Sem chamada real ao Google ainda.

## Pré-requisitos

- Docker Desktop rodando

## Subir (Postgres local + backend)

```bash
cd Lead-hunter
docker compose up -d --build
```

Na primeira subida o backend autogera a migration inicial a partir dos models e
cria todas as tabelas no Postgres.

Verificar:

```bash
curl http://localhost:8000/health        # {"status":"ok"}
curl http://localhost:8000/health/db     # {"status":"ok","database":"connected"}
```

## Rodar os testes

```bash
docker compose run --rm backend pytest -q
```

## Migrar para o Supabase (depois)

O banco é Postgres dos dois lados. Para apontar ao Supabase, basta trocar
`DATABASE_URL` (no `docker-compose.yml` ou via `.env`) pela connection string do
Supabase e rodar `alembic upgrade head`. O schema é idêntico.

## Estrutura

```
backend/
├── app/
│   ├── api/  models/  schemas/  repositories/  services/  integrations/
│   ├── config.py  database.py  enums.py  main.py
├── migrations/        # Alembic
└── tests/
```
