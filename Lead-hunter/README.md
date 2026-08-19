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
┌─ HOST (VPS, nativo — antes Windows) ───────────┐
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
| Diretor de Arte | **Nanami** | Operador | pesquisa referências reais e escreve o `BRIEF.md` da demo |
| Criadora de Demo | **Nobara** | Operador | escreve o site do ZERO executando o BRIEF (só leads quentes) |

Subagentes e juízes da rota da demo (invocados por gateway, não por @menção):

| Agente | Invocado por | Função |
|---|---|---|
| **Fundação** | `demo-brief` (automático) | destila BRIEF + prints em `tokens.css` + `motion-spec.md` |
| **Revisor** | `demo-revisao` / `demo-publicar` | QA barato ANTES do Crítico (gates + anti-vibe-code + anti-molde) |
| **Crítico** | `demo-publicar` (obrigatório) | juiz **independente**: olha os screenshots e dá o veredito (`critique.json`) |

> **Quem faz não dá a própria nota.** O Nanami escreveu o brief e a Nobara construiu o site —
> por isso o Crítico é um agente separado e não pode ser pulado.
>
> Caçadora, Auditora, Analista e Curadora rodam como **skills/serviços** do backend
> (busca Places, auditoria, score, refs de design) orquestrados pela Sukuna.
>
> A "alma" de cada agente fica em [`agents/`](agents/) (`SOUL.md`, `IDENTITY.md`, `MEMORY.md`,
> `HEARTBEAT.md`).

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
cd frontend-v2
npm install
npm run dev -- -p 3100     # porta 3000 fica com outro app do Samuel
```

Abre em **http://localhost:3100**.

### 3. OpenClaw (nativo, fora do Docker)

Os agentes rodam **nativos** (Docker quebra skills/browser/mensageria). A skill `lead-hunter`
(`openclaw-skill/lead-hunter/lh.mjs`) fala com o backend na URL do `LH_API` (default
`http://localhost:8000`). Ex.: `node skills/lead-hunter/lh.mjs status`.

O ambiente dos agentes precisa de `LH_API`, `VERCEL_SCOPE` (time da Vercel onde a demo é
publicada) e `DEMO_UPLOADS_DIR` — ver `.env.example`.

---

## Operação contínua (`ops/`)

Crons agendados na VPS (**systemd**; no Windows era o Task Scheduler, prefixo `LeadHunter `):

| Hora | Script | O que faz |
|---|---|---|
| 05h | `backup.mjs` | `pg_dump` do banco, retém 14 dias |
| 06h | `pipeline.mjs` | re-auditoria + re-score (sem custo Google) |
| 07h | `relatorio.mjs` | resumo da Sukuna (`claude -p`) → Discord #melhorias |
| 08h + 3/3h | `heartbeat.mjs` | checa gateway/backend/db, alerta no Discord só se cair |
| 22h | `analista.mjs` | lê transcripts (últimos 3 dias), propõe skills/fixes |
| 3/3 dias | `notas-diarias.mjs` + `consolidacao.mjs` | memória dos agentes (nota diária → MEMORY.md) |
| contínuo | `pedidos-watch.mjs` | vigia a fila do GERAR SITE **por código** — só acorda a Sukuna se houver pedido |
| contínuo | `session-guard.mjs` | mede o contexto por turno, manda destilar a memória e rotaciona a sessão |
| sob demanda | `medir.mjs` | consumo por janela: turnos, modelo, tempo, contexto e % de manutenção |

> Webhook do Discord fica em `ops/.webhook.txt` (**fora do git**).

---

## Estrutura

```
Lead-hunter/
├── agents/                 # alma dos agentes (diretor-de-arte, criadora, fundacao, revisor, critico)
├── backend/
│   ├── app/
│   │   ├── api/            # rotas FastAPI
│   │   ├── models/         # SQLAlchemy (33 tabelas)
│   │   ├── schemas/        # Pydantic
│   │   ├── services/       # regras de negócio (única porta de escrita)
│   │   └── integrations/   # Google Places, site_auditor, site_screenshotter (Playwright)
│   ├── migrations/         # Alembic
│   └── tests/              # 51/51 passando
├── frontend-v2/            # interface de PRODUÇÃO (Next.js 15 + brand kit Balmor) — app.balmor.tech
├── frontend/               # v1, mantida por referência
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
