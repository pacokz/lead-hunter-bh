# Lead Hunter BH

Plataforma de prospecção comercial em Belo Horizonte. Encontra comércios
consolidados **sem site / com site ruim**, audita e dá um **score de oportunidade**,
gera **demos de site** para os mais quentes e entrega um **pacote de abordagem
pronto** — que o Samuel envia **manualmente** (WhatsApp/Instagram) para fechar.

> **Documento mestre:** [`docs/PLAYBOOK_IMPLEMENTACAO.md`](docs/PLAYBOOK_IMPLEMENTACAO.md) —
> decisões, fases e regras invioláveis. Este README é o guia operacional do dia a dia.

- **Meta:** ~20 fechamentos/mês (foco em qualidade, não volume).
- **Ticket:** R$ 7.000 (site) · R$ 12.000 (site + painel de gestão).
- **Receita secundária:** automações vendidas após a venda do site.

---

## Arquitetura

```
┌─ HOST (Windows, nativo) ───────────────────────┐
│  OpenClaw — agentes (orquestração, tema JJK)   │
│  Discord (controle) · WhatsApp/IG (Samuel)     │
└───────────────┬────────────────────────────────┘
                │ HTTP localhost:8000 (skill → backend)
┌───────────────▼─ DOCKER ───────────────────────┐
│  Backend Lead Hunter (FastAPI)                  │
│  api / services / repositories / integrations   │
│  + Playwright (Chromium) para auditoria visual  │
└───────────────┬────────────────────────────────┘
                │
        ┌───────▼────────┐
        │  Supabase (PG) │  ← fonte única de verdade (place_id)
        └────────────────┘
```

**Regra de ouro:** agentes só escrevem pela **camada de serviços**. Nunca SQL arbitrário.

### Os agentes (OpenClaw, tema Jujutsu Kaisen)

| Papel | Agente | Nível | Função |
|---|---|---|---|
| Orquestradora | **Sukuna** | Autônoma | coordena, prioriza, reporta no Discord |
| Comercial | **Yuji** | Advice | monta pacote + CRM + copy (Samuel envia) |
| Diagnosticador | **Megumi** | Advice | pós-venda: acha automações pra vender (upsell) |
| Criadora de Demo | **Nobara** | Operador | gera o site HTML (só leads quentes) |

> Caçadora, Auditora, Analista e Curadora rodam como **skills/serviços** do backend
> (busca Places, auditoria, score, refs de design) orquestrados pela Sukuna.

---

## Status — Fases 1 a 8 concluídas

| Fase | O que entrega | Status |
|---|---|---|
| 1 · Fundação | FastAPI, 33 models, enums, migrations Alembic, logs, testes | ✅ |
| 2 · Google Places | Text Search (New), cota, dedup por `place_id`, qualificação | ✅ |
| 3 · Interface | Next.js 15: dashboard, leads, CRM, jobs, settings, follow-ups | ✅ |
| 4 · Auditoria | HTTP (`site_class`) + **Playwright** (print desktop/mobile, overflow, tempo real) | ✅ |
| 5 · Score | determinístico 0–100, faixas, componentes auditáveis, ranking | ✅ |
| 6 · OpenClaw | agentes nativos + Discord + skills→API + memória em camadas | ✅ |
| 7 · Demos + CRM | CRM Kanban, outreach (rascunho), follow-ups + interações, demo-skill | ✅ |
| 8 · Operação | crons (backup, pipeline, relatório, heartbeat, analista de melhorias) | ✅ |

**Pendências opcionais (não bloqueiam vender):** CRUD de `opportunities` (upsell do
Megumi) e página de aprovações. A **busca diária de novos leads é manual de propósito**
(gasta cota da Google Places API).

---

## Subir o ambiente

### 1. Backend + Playwright (Docker)

```bash
cd Lead-hunter
docker compose up -d --build
```

Na subida o `entrypoint.sh` roda `alembic upgrade head` contra o **Supabase**
(connection string em `.env` → `DATABASE_URL`). Verificar:

```bash
curl http://localhost:8000/health        # {"status":"ok"}
curl http://localhost:8000/health/db     # {"status":"ok","database":"connected"}
```

### 2. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev -- -p 3100     # porta 3000 fica com outro app do Samuel
```

Abre em **http://localhost:3100**.

### 3. OpenClaw (nativo no Windows)

Os agentes rodam **nativos** (não em Docker — Docker quebra skills/browser/mensageria).
A skill `lead-hunter` (`openclaw-skill/lead-hunter/lh.mjs`) fala com o backend em
`localhost:8000`. Ex.: `node lh.mjs audit <place_id>`.

---

## Operação contínua (`ops/`)

Crons agendados no **Task Scheduler do Windows** (prefixo `LeadHunter `):

| Hora | Script | O que faz |
|---|---|---|
| 05h | `backup.mjs` | `pg_dump` do banco, retém 14 dias |
| 06h | `pipeline.mjs` | re-auditoria + re-score (sem custo Google) |
| 07h | `relatorio.mjs` | resumo da Sukuna (`claude -p`) → Discord #melhorias |
| 08h + 3/3h | `heartbeat.mjs` | checa gateway/backend/db, alerta no Discord só se cair |
| 22h | `analista.mjs` | lê transcripts (últimos 3 dias), propõe skills/fixes |
| 3/3 dias | `notas-diarias.mjs` + `consolidacao.mjs` | memória dos agentes (nota diária → MEMORY.md) |

> Webhook do Discord fica em `ops/.webhook.txt` (**fora do git**).

---

## Estrutura

```
Lead-hunter/
├── backend/
│   ├── app/
│   │   ├── api/            # rotas FastAPI
│   │   ├── models/         # SQLAlchemy (33 tabelas)
│   │   ├── schemas/        # Pydantic
│   │   ├── services/       # regras de negócio (única porta de escrita)
│   │   └── integrations/   # Google Places, site_auditor, site_screenshotter (Playwright)
│   ├── migrations/         # Alembic
│   └── tests/              # 51/51 passando
├── frontend/               # Next.js 15 (App Router) + Tailwind + TanStack Query
├── openclaw-skill/         # skills do OpenClaw (lead-hunter, demo, verifica-interface)
├── ops/                    # crons de operação (Node .mjs)
├── demos/                  # demos de site geradas (HTML)
├── docs/                   # PLAYBOOK (mestre) + OVERVIEW
├── .env.example
└── docker-compose.yml
```

---

## Regras invioláveis (resumo — completo no PLAYBOOK §9)

1. **Outreach é manual.** Nada é enviado automaticamente — agentes só preparam.
2. Agentes não rodam SQL arbitrário — só a camada de serviços.
3. Score é determinístico; o agente interpreta, **não altera**.
4. Verificar cota da Google antes de cada chamada; parar no limite.
5. Dedup por `place_id`; não repetir job concluído; não auditar lead descartado.
6. Demo só para leads quentes (PRIORIDADE/ALTO + sem site/site ruim).
7. Segredos (`.env`, chave Google, senha Supabase, webhook) **nunca** no git/frontend.
8. Sem dados falsos silenciosos. Sem scraping do Google Maps.
```
