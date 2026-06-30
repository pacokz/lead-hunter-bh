# PLAYBOOK DE IMPLEMENTAÇÃO — Lead Hunter BH

> Documento mestre. Registra as decisões tomadas, dependências e a divisão das fases
> em tarefas. Fontes: `PLAYBOOK` (autoritativo), `PROJETO_SCRAPER_BH.md` (regras de
> negócio), `openclaw-knowledge-base.md` (modelo de operação dos agentes).
> Status: **Fases 1–8 implementadas e validadas.** Pendências opcionais: CRUD de
> `opportunities` e página de aprovações (ver Fase 7).

---

## 1. Visão

Plataforma de prospecção comercial em Belo Horizonte que encontra comércios
consolidados **sem site / com site ruim**, gera uma **demo de site** para os mais
quentes, e entrega ao Samuel um **pacote de abordagem pronto** para ele contatar
manualmente e fechar. Receita secundária: **automações** vendidas após a venda do site.

- **Meta:** 5 fechamentos/semana, 20/mês.
- **Ticket:** R$ 7.000 (só site) · R$ 12.000 (site + painel de gestão + bônus).
- **Foco:** qualidade, não volume (~100 leads quentes/mês bastam).

---

## 2. Decisões firmadas (substituem o PLAYBOOK onde divergem)

| Tema | Decisão |
|---|---|
| Orquestrador | **OpenClaw** (não Hermes/Nous). Hermes fica opcional. |
| Onde roda o OpenClaw | **Nativo no Windows** (NÃO Docker — quebra skills/browser/mensageria) |
| Onde roda o backend | **Docker** (FastAPI + serviços + ferramentas) |
| Banco | **Supabase (Postgres)** desde o início |
| Canal de operação | **Discord** (servidor com o sócio) — não Telegram |
| Outreach | **100% manual** — Samuel envia via WhatsApp (+55 31 99444-3916) / Instagram DM |
| Demo | **Só o site** (real, por lead quente). Painel vendido à parte, demonstrado por vídeo/prints |
| Aprovação | Encolhe (sem disparo automático). Só interno: aprovar demo, gasto de API acima do teto |
| Google Places | **Places API (New) — Text Search**. Proibido: lib `googlemaps`, Legacy, scraping do Maps |
| Score | Determinístico em Python. Agente interpreta, não altera |
| Escopo | Ambição completa do PLAYBOOK, executada em fases |

**Em aberto:** confirmar se o OpenClaw fala MCP como cliente. Se sim → MCP server;
se não → skill do OpenClaw chama a API REST local. Não bloqueia as Fases 1–2.

---

## 3. Arquitetura

```
┌─ HOST (Windows, nativo) ───────────────────────┐
│  OpenClaw — 8 agentes (orquestração)           │
│  Discord (controle) · WhatsApp/IG (Samuel)     │
└───────────────┬────────────────────────────────┘
                │ HTTP localhost:8000 (skill → backend)
┌───────────────▼─ DOCKER ───────────────────────┐
│  Backend Lead Hunter (FastAPI)                  │
│  api / services / repositories / integrations   │
└───────────────┬────────────────────────────────┘
                │
        ┌───────▼────────┐
        │ Supabase (PG)  │  ← fonte única de verdade (place_id)
        └────────────────┘
```

Regra: agentes só escrevem pelo **camada de serviços**. Nunca SQL arbitrário.

---

## 4. Os 8 agentes (Samuel batiza os nomes)

| # | Papel | Nível | Função |
|---|---|---|---|
| 1 | Orquestradora | Autônoma | coordena, reporta no Discord |
| 2 | Caçadora | Operador | busca Places, dedup |
| 3 | Auditora | Operador | audita site + captura @ Instagram |
| 4 | Analista | Operador | score, pitch, prioriza |
| 5 | Curadora | Operador | 5 refs de design por nicho (cache) |
| 6 | Criadora de Demo | Operador | site HTML (só leads quentes) |
| 7 | Comercial | Advice | monta pacote + CRM (Samuel envia) |
| 8 | Diagnosticador | Advice | pós-call: acha automações pra vender |

Cada agente terá os arquivos da KB: `soul/agents/user/tools/memory/heartbeat/working.md`
+ `team.md` compartilhado.

---

## 5. Funil

```
~600 buscadas → ~200 qualificadas → ~100 quentes → você aborda → 20 fecham
                (nota/reviews/cat)   (demo gerada só aqui)        (manual)
```

---

## 6. Banco de dados

~30 tabelas, agrupadas em: Configuração · Google Places · Pipeline & Score ·
Auditoria · Referências de design · Demonstrações · Agentes · CRM ·
Diagnóstico & automação · Controle. Esquema detalhado validado (ver seção 9).

Enums-chave: `pipeline_state`, `site_class`, `score_band`, `commercial_stage`,
`agent_access`, `contact_channel`.

---

## 7. Estrutura de pastas

```
Lead-hunter/
├── backend/
│   ├── app/
│   │   ├── api/            # rotas FastAPI
│   │   ├── models/         # SQLAlchemy
│   │   ├── schemas/        # Pydantic
│   │   ├── repositories/   # acesso a dados
│   │   ├── services/       # regras (única porta de escrita)
│   │   └── integrations/   # Google Places, Playwright
│   ├── migrations/         # Alembic
│   └── tests/
├── agents/                 # config dos 8 agentes OpenClaw (soul.md etc.)
├── mcp_server/             # OU skills do OpenClaw (decidir após teste MCP)
├── scripts/
├── data/
├── docs/
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 8. Fases → tarefas

### Fase 1 — Fundação  ✅ **CONCLUÍDA E VALIDADA**
- [x] Esqueleto do backend (FastAPI) + Docker (Postgres local; troca p/ Supabase via DATABASE_URL)
- [x] `.env.example` (sem chaves reais)
- [x] Models SQLAlchemy de todas as 33 tabelas
- [x] Enums (pipeline_state, site_class, score_band, commercial_stage, agent_access, etc.)
- [x] Migrations Alembic (autogerada na 1ª subida — `dfc1e5ac617e_initial_schema`)
- [x] Camada de logs (operation_logs / agent_errors via `services/logging_service.py`)
- [x] Testes da fundação — 10/10 passando (enums, registro de models, /health)
- [x] **Sem chamada real ao Google. Sem dados falsos silenciosos.**

> Validação: `docker compose up` cria 34 tabelas (33 + alembic_version);
> `/health` e `/health/db` respondem `ok`. Pendente só apontar a `DATABASE_URL` ao Supabase.

### Fase 2 — Google Places  ✅ **CONCLUÍDA E VALIDADA**
- [x] `categories` / `regions` seed (10+10) · `qualification_rules` (regra padrão) — `app/seeds.py`
- [x] Serviço de cota (`quota_service`: checa limite diário/mensal antes; registra `api_usage`)
- [x] Integração Text Search (New) com `X-Goog-FieldMask` (`integrations/google_places.py`, HTTPX, retries)
- [x] Geração de `search_jobs` (termo×região×página) + execução (`campaign_service`, `search_service`)
- [x] Persistência em `places` com dedup por `place_id` (upsert) + avanço de `lead_pipeline`
- [x] Paginação via `nextPageToken` (migration `0002_page_token`) respeitando `max_pages`
- [x] Filtro de qualificação → `lead_pipeline` (`qualification_service`)
- [x] API: `POST /campaigns`, `GET /campaigns`, `GET /campaigns/{id}/jobs`, `POST /jobs/{id}/execute`, `GET /leads`
- [x] Testes — **27/27 passando** (Google mockado, sem chamada real)

> Validação: migrations encadeadas (head `0002_page_token`); seeds OK; `POST /campaigns`
> gera 6 jobs (2 termos × 3 regiões); `/jobs/{id}/execute` recusa sem `GOOGLE_PLACES_API_KEY`.
> Pendente: chave do Google + projeto no GCP para teste de busca REAL.

### Fase 3 — Interface inicial  ✅ **NÚCLEO CONCLUÍDO E VALIDADO** (jobs/settings pendentes)
- [x] Next.js 15 (App Router) + Tailwind + TanStack Query + lucide — em `frontend/`
- [x] `/` Dashboard (stats cards + breakdowns), `/leads` (tabela ranqueada + filtros), `/leads/[placeId]` (detalhe: Google + score com componentes + auditoria + issues), `/campaigns` (lista + criar)
- [x] Backend: CORS (regex localhost), `GET /stats`, `GET /leads/{id}/context`
- [x] Build de produção passa; validado por screenshots (Playwright) — 3 telas renderizam dados reais, zero erro de runtime
- [x] Páginas `/search-jobs` (lista jobs + executar) e `/settings` (parâmetros + categorias + regiões)
- [x] `/crm` Kanban (10 estágios, mover lead, promover quentes)
- [x] Backend extra: `GET /jobs`, `GET /settings`, `GET/POST /categories`, `GET/POST /regions`
- [x] Rodar: backend `docker compose up -d`; frontend `cd frontend && npm run dev -- -p 3100` (3000 ocupada por outro app do Samuel)

### Fase 4 — Auditoria  ✅ **BÁSICA CONCLUÍDA E VALIDADA** (Playwright deferido)
- [x] HTTPX + BeautifulSoup · classificação `site_class` (`integrations/site_auditor.py`)
- [x] Detecção REDE_SOCIAL (site = IG/linktree) + WhatsApp + redes sociais
- [x] Captura de @ Instagram → `places.instagram_handle`
- [x] `audit_service` (persiste, gera issues, avança pipeline; não audita descartado)
- [x] API: `POST /leads/{id}/audit`, `POST /audits/run`
- [x] Testes — **38/38 passando** (HTTP mockado)
- [x] **Fase 4b — CONCLUÍDA:** Playwright na imagem (oficial `mcr.microsoft.com/playwright/python`),
  captura desktop(1440)/mobile(390) full-page + detecção de overflow no mobile + tempo de carga real.
  `integrations/site_screenshotter.py`, persiste em `site_screenshots`, servido em `/screenshots`
  (volume `./backend`). Sob demanda: `POST /leads/{id}/audit?screenshots=true` (bulk `/audits/run`
  segue sem print, leve). Skill: `lh.mjs audit <id>`. Validado no Le Deux (desktop+mobile reais,
  flagou "lento_visual" 22s que o HTTP não pegava).
- [x] Auditoria visual no front — **embutida no detalhe do lead** (`/leads/[placeId]`), não em página
  separada (print importa por lead, na hora de decidir abordar): botão "Rodar auditoria visual" +
  galeria desktop/mobile com lightbox; `/context` já devolve `screenshots`. Validado por screenshot.

> Validação: 20 leads reais de Savassi auditados → 8 SEM_SITE, 4 FORA_DO_AR, 1 REDE_SOCIAL,
> 6 SITE_BOM, 1 SITE_RAZOAVEL. 13/20 são prospects.

### Fase 5 — Score e pipeline  ✅ **SCORE CONCLUÍDO E VALIDADO**
- [x] Score determinístico 0–100 (`score_service`): site_oportunidade(40) + reviews(20) + nota(15) + contato(10) + segmento(15)
- [x] Componentes auditáveis em `lead_score_components` (somam o score)
- [x] Faixas: DESCARTAR/BAIXO/REVISAR/ALTO/PRIORIDADE; pipeline → SCORED
- [x] API: `POST /leads/{id}/score`, `POST /scores/run`, `GET /leads/ranked`
- [x] Carimbo de categoria da campanha no lead (search_service) p/ segmento
- [x] Testes — **44/44 passando**
- [ ] Página `/leads/[placeId]` (Fase 3 — interface)

> Validação: 20 leads reais ranqueados → #1 Fialho (90, sem site, 241 rev), #2 Grupo Carlos
> Teodorico (86, site morto, 780 rev); SITE_BOM afunda mesmo com muitos reviews.
> INSIGHT: rodar qualificação ANTES do score (descarta <20 reviews) — ajuste do orquestrador.

### Fase 6 — OpenClaw + ferramentas
- [ ] Instalar OpenClaw nativo · conectar Discord
- [ ] Criar Orquestradora (identidade → memória)
- [ ] Expor ferramentas (MCP ou skill→API) · permissões
- [ ] Demais agentes + níveis de acesso · testes de integração

### Fase 7 — Demos + CRM  ✅ **CRM + OUTREACH CONCLUÍDOS** (geração de demo = OpenClaw)
- [x] CRM: `crm_service` (promover leads ALTO/PRIORIDADE, mover estágio) + Kanban `/crm`
- [x] Outreach: `outreach_service` (rascunho determinístico por template/site_class) + seção no detalhe do lead (gerar + copiar)
- [x] API: `POST /crm/promote`, `GET /crm`, `POST /leads/{id}/crm/stage`, `POST/GET /leads/{id}/outreach`
- [x] Testes — **51/51 passando**
- [x] Validado: 13 leads quentes promovidos ao CRM; copy real gerada p/ Fialho Odontologia
- [ ] **Pendente (agente, vem com OpenClaw Fase 6):** geração do HTML da demo (Criadora), Curadora de refs, skill de imagens, Diagnosticador
- [x] **Follow-ups + interações — CONCLUÍDO:** `followup_service` + migration `0003_followup_fields`
  (follow_ups ganhou `note`/`done`/`done_at`). API: `GET/POST /leads/{id}/interactions`,
  `GET/POST /leads/{id}/follow-ups`, `POST /follow-ups/{id}/done`, `DELETE /follow-ups/{id}`,
  `GET /follow-ups/upcoming` (agenda global). Front: painel no detalhe do lead (agendar/concluir/
  excluir follow-up + registrar contato) e página `/follow-ups` (agenda, atrasados em vermelho).
  Validado por screenshot end-to-end.
- [ ] **Backlog — só quando houver demanda real (decisão 30/06):** opportunities CRUD
  (upsell do Megumi) e página de aprovações. Não construir antes de ter o problema:
  o upsell ainda não tem cliente fechado pra rastrear, e as aprovações que sobraram
  (demo, gasto de API acima do teto) já acontecem no Discord. YAGNI — reavaliar quando
  surgir o caso de uso concreto ("preciso registrar a automação prometida ao cliente X").

### Fase 8 — Operação contínua  ✅ **CONCLUÍDA** (busca diária = manual por causa da cota Google)
- [x] Crons via Task Scheduler do Windows (scripts em `ops/`):
  - [x] **Backup** 05h — `pg_dump` do `leadhunter`, retém 14
  - [x] **Pipeline** 06h — re-auditoria + re-score (sem custo Google)
  - [x] **Relatório** 07h — Sukuna (`claude -p`) → webhook #melhorias
  - [x] **Heartbeat** 08h + a cada 3h — gateway/backend/db, alerta no #melhorias só se cair
  - [x] **Analista de Melhorias** 22h — condensa transcripts e propõe skills/fixes (aprovação do Samuel)
- [ ] Busca diária de novos leads: **deixada manual/semanal de propósito** (gasta cota da API Google)

---

## 9. Regras invioláveis

1. Nunca expor a chave do Google no frontend.
2. Agentes não rodam SQL arbitrário — só camada de serviços.
3. Verificar cota antes de cada chamada; parar ao atingir o limite.
4. Dedup por `place_id`; não repetir job concluído.
5. Outreach é manual; nada é enviado automaticamente.
6. Score é determinístico; agente interpreta, não altera.
7. Não auditar lead já descartado (economia).
8. Demo só para leads quentes (PRIORIDADE/ALTO + sem site/site ruim).
9. Sem dados falsos silenciosos. Sem scraping do Google Maps.
10. Não avançar de fase sem validação do Samuel.
```
