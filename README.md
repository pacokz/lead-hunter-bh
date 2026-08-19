# Lead Hunter BH

Máquina de prospecção comercial da **Balmor** para Belo Horizonte. Encontra comércios consolidados
**sem site ou com site ruim**, audita o que existe hoje, dá um **score de oportunidade
determinístico**, e — para os leads mais quentes — um time de agentes de IA **projeta e publica uma
prévia de site sob medida** que o vendedor manda pelo WhatsApp para fechar o negócio.

> **A regra que define o projeto: outreach é sempre manual.** Nenhuma mensagem sai automaticamente.
> Os agentes pesquisam, auditam, escrevem, criticam e publicam — mas quem aperta "enviar" é uma pessoa.

- **Ticket:** R$ 7.000 (site) · R$ 12.000 (site + painel de gestão)
- **Meta:** ~20 fechamentos/mês, priorizando qualidade sobre volume
- **Interface de produção:** `app.balmor.tech` (Next.js 15) sobre backend FastAPI

---

## Índice

- [Como funciona, em uma passada](#como-funciona-em-uma-passada)
- [Arquitetura](#arquitetura)
- [O elenco de agentes](#o-elenco-de-agentes)
- [A rota criativa da demo](#a-rota-criativa-da-demo-o-coração-do-produto)
- [O funil de leads](#o-funil-de-leads)
- [Score de oportunidade](#score-de-oportunidade)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Backend](#backend)
- [Interface](#interface)
- [Skills do OpenClaw](#skills-do-openclaw)
- [Operação contínua e engenharia de custo](#operação-contínua-e-engenharia-de-custo)
- [Subir o ambiente](#subir-o-ambiente)
- [Regras invioláveis](#regras-invioláveis)

---

## Como funciona, em uma passada

```
Google Places  →  Auditoria do site  →  Score 0-100  →  CRM
   (busca)         (HTTP + Playwright)   (determinístico)  │
                                                           ▼
                                           lead quente (PRIORIDADE / ALTO)
                                                           │
                                                           ▼
       ┌───────────────── ROTA CRIATIVA DA DEMO ─────────────────────┐
       │  materiais reais → BRIEF (Nanami) → tokens (Fundação)       │
       │  → site escrito do zero (Nobara) → QA (Revisor)             │
       │  → veredito independente (Crítico) → gates → Vercel         │
       └────────────────────────────┬────────────────────────────────┘
                                    ▼
                      link ao vivo + rascunho de abordagem
                                    │
                                    ▼
                   >> uma PESSOA envia pelo WhatsApp <<
```

## Arquitetura

Híbrida por necessidade: os agentes rodam **nativos** (Docker quebra browser, skills e mensageria),
o backend roda **em container**.

```
┌─ HOST (VPS Hostinger · systemd · antes: Windows nativo) ─────────┐
│  OpenClaw — runtime dos agentes (tema Jujutsu Kaisen)            │
│  Discord = console de controle · WhatsApp/IG = canal humano      │
│  Playwright para captura de referências e QA visual              │
└───────────────────────────┬──────────────────────────────────────┘
                            │ HTTP :8000 (skill lh.mjs → backend)
┌───────────────────────────▼─ DOCKER ─────────────────────────────┐
│  Backend Lead Hunter (FastAPI)                                   │
│  api · services · repositories · integrations                    │
│  + Playwright/Chromium para auditoria visual dos sites dos leads │
└───────────────────────────┬──────────────────────────────────────┘
                            │
              ┌─────────────▼─────────────┐
              │  PostgreSQL (Supabase)    │ ← fonte única da verdade (place_id)
              └───────────────────────────┘
```

**Regra de ouro da arquitetura:** agente nenhum executa SQL. Toda escrita passa pela camada de
serviços do backend, que é onde as regras de negócio vivem e podem ser testadas.

---

## O elenco de agentes

Oito agentes com papéis estritamente separados. A separação não é estética — é o mecanismo de
qualidade: **quem faz não dá a própria nota**, e cada gate é executado por alguém que não escreveu
o que está julgando.

### Time principal

| Agente | Papel | Nível de acesso | O que faz |
|---|---|---|---|
| **Sukuna** | Orquestradora | Autônoma | Coordena o time, prioriza a fila, resume o estado do negócio e reporta no Discord |
| **Yuji** | Comercial | Advice | Monta o pacote de abordagem, cuida do CRM e escreve a copy — **o humano envia** |
| **Megumi** | Diagnosticador | Advice | Pós-venda: encontra automações vendáveis no cliente fechado (upsell) |
| **Nanami** | Diretor de Arte | Operador | Pesquisa referências reais e escreve o BRIEF de cada demo |
| **Nobara** | Criadora de Demo | Operador | Escreve o site do zero (HTML/CSS/JS próprios) executando o BRIEF |

### Subagentes e juízes

| Agente | Papel | Invocado por | O que faz |
|---|---|---|---|
| **Fundação** | Sistema de design | `demo-brief` (automático) | Destila BRIEF + prints em `tokens.css` e `motion-spec.md` |
| **Revisor** | QA barato | `demo-revisao` / `demo-publicar` | Roda os gates objetivos e o teste anti-genérico antes de gastar o Crítico |
| **Crítico** | Juiz independente | `demo-publicar` (obrigatório) | **Olha os screenshots** e dá o veredito: craft, genericidade, execução do BRIEF |

**Por que o Crítico existe:** o Nanami escreveu o brief e a Nobara construiu o site — nenhum dos
dois pode se auto-avaliar. O Crítico é uma segunda cabeça, impossível de pular, invocada por
gateway pelo próprio comando de publicação. Ele julga pelos **screenshots**, não pelo código.

**O teste anti-vibe-code**, aplicado por Nobara, Revisor e Crítico:

> *"Se eu trocar o logo e o nome por um SaaS de IA qualquer, o site continua fazendo o mesmo sentido?"*
> Se sim, é genérico → reprovado, refaz.

Cada agente tem seu diretório em [`Lead-hunter/agents/`](Lead-hunter/agents/) com `SOUL.md`
(quem é e como decide), `IDENTITY.md`, `MEMORY.md` (memória em camadas) e `HEARTBEAT.md`.

---

## A rota criativa da demo (o coração do produto)

A demo é a maior peça de conversão: o dono do negócio recebe **o site dele já pronto**, com as
fotos reais dele, antes de pagar qualquer coisa. Por isso a demo **não** nasce de template — o
gerador templateado (`demo-render`) está depreciado e o gate visual reprova o resultado dele.

```
1. demo-data <id> --site <url>     fotos reais do site atual + dados + cor da marca detectada
   demo-ig <slug> <@handle>        (lead sem site: puxa as fotos reais do Instagram)
        │
2. demo-brief <slug>               NANAMI, em 2 passes:
        │                            passe 1 → escolhe 8-12 referências (refs/urls.json), amplas
        │                                      e cross-nicho: awwwards, siteinspire, mobbin
        │                            passe 2 → ref-shot.py captura os prints e ele OLHA cada um,
        │                                      citando refs/NN.png no BRIEF.md
        │                          validate-brief exige profundidade (hero_strategy, motion_tier,
        │                          stack, image_treatment) — se reprovar, o Nanami é reinvocado
        │
3. demo-fundacao <slug>            FUNDAÇÃO (automática): BRIEF + prints → tokens.css + motion-spec.md
        │
4. (a Nobara escreve o site)       index.html do ZERO. Stack livre — CSS, canvas, SVG, GSAP,
        │                          three.js/WebGL — mas o peso do motion vem do motion_tier que o
        │                          Nanami declarou (T0 estático → T3 imersivo), não do impulso dela.
        │                          Libs sempre vendoradas, nunca CDN. Antes de começar lê
        │                          _repetition-book.md e _licoes-aprendidas.md e não repete padrão.
        │
5. demo-revisao <slug>             REVISOR: check.py + qa-visual.py + anti-vibe-code + anti-molde
        │                          exit 0 = "pronto pro Crítico" · exit 1 = "volta pra prancheta"
        │
6. demo-publicar <slug>            TODOS os gates: BRIEF real · anti-template · demo-similar (>75%
        │                          parecido = barra) · movimento · números · check.py · craft score
        │                          + CRÍTICO por gateway (critique.json)
        ▼                          → deploy na Vercel + registra no backend (CRM vai pra DEMO_PRONTA)
   link ao vivo
```

`demo-auto <id> --site <url>` roda a cadeia inteira sem parar e avisa uma única vez no Discord com
o link. Se algo estoura (lead sem foto, BRIEF inválido, Revisor reprovando 3×, Crítico bloqueando),
a cadeia **escala para o humano** em vez de tentar se consertar sozinha.

**O problema que essa arquitetura resolve:** um único agente gerando sites produz sempre o mesmo
site com a cor trocada. Separar direção de arte (Nanami) de execução (Nobara) de julgamento
(Crítico), e forçar o diretor a *olhar* referências reais em vez de inferi-las, é o que faz duas
demos não se parecerem.

---

## O funil de leads

Um lead atravessa estados explícitos (`PipelineState`, em [`enums.py`](Lead-hunter/backend/app/enums.py)):

```
SEARCH_PENDING → DISCOVERED → FILTERED → AUDITED → SCORED → QUALIFIED
                                                               │
                           DEMO_PENDING → DEMO_BUILDING → DEMO_READY
                                                               │
                         OUTREACH_DRAFT → AWAITING_APPROVAL → CONTACTED
                                                               │
                             FOLLOW_UP → REPLIED → MEETING → WON / LOST
```

E, em paralelo, um estágio comercial no CRM Kanban (`CommercialStage`):
`NOVO → QUALIFICADO → DEMO_PRONTA → CONTATO_PENDENTE → CONTATADO → FOLLOW_UP → RESPONDEU → REUNIAO → GANHO/PERDIDO`.

**A auditoria do site** classifica o que o lead tem hoje (`SiteClass`): `SEM_SITE`, `FORA_DO_AR`,
`REDE_SOCIAL`, `SITE_OBSOLETO`, `SITE_FRACO`, `SITE_RAZOAVEL`, `SITE_BOM`. A classificação usa
checagem HTTP **mais** renderização real com Playwright — print desktop e mobile, overflow
horizontal, tempo de carregamento de verdade.

## Score de oportunidade

Determinístico, 0-100, em Python puro e auditável
([`score_service.py`](Lead-hunter/backend/app/services/score_service.py)). Cada componente fica
gravado no banco, então dá para explicar qualquer nota. **O agente interpreta o score; nunca o altera.**

| Componente | Peso | Lógica |
|---|---|---|
| Oportunidade do site | 40 | `SEM_SITE` = 40 · `REDE_SOCIAL` = 38 · `SITE_FRACO` = 22 · `SITE_BOM` = 2 |
| Volume de avaliações | 20 | ≥200 = 20 · ≥100 = 17 · ≥50 = 14 · ≥20 = 10 |
| Nota no Google | 15 | ≥4.7 = 15 · ≥4.3 = 12 · ≥4.0 = 9 |
| Segmento | 15 | prioridade da categoria, configurável |
| Canal de contato | 10 | telefone = 6 · Instagram = 4 |

Faixas: **≥85 PRIORIDADE** · ≥70 ALTO_POTENCIAL · ≥60 REVISAR · ≥40 BAIXO_POTENCIAL · <40 DESCARTAR.

O peso vive no combo que mais importa para o negócio: **empresa consolidada** (muita avaliação,
nota alta) **que não tem site**. Ela já tem clientes — só não tem onde eles caírem.

---

## Estrutura do repositório

```
.
├── Lead-hunter/
│   ├── agents/                 # a "alma" de cada agente (SOUL/IDENTITY/MEMORY/HEARTBEAT)
│   │   ├── diretor-de-arte/    # Nanami — + BRIEF-TEMPLATE, TOOLS, TEAM
│   │   ├── criadora/           # Nobara — + SUBAGENTES.md
│   │   ├── fundacao/           # sistema de design (tokens + motion)
│   │   ├── revisor/            # QA barato pré-Crítico
│   │   └── critico/            # juiz independente
│   ├── backend/
│   │   ├── app/
│   │   │   ├── api/routes.py   # 40 endpoints FastAPI
│   │   │   ├── models/         # SQLAlchemy — places, audit, pipeline, crm, demo, design, agents…
│   │   │   ├── schemas/        # Pydantic
│   │   │   ├── services/       # regras de negócio — ÚNICA porta de escrita
│   │   │   ├── repositories/   # acesso a dados
│   │   │   └── integrations/   # google_places · site_auditor · site_screenshotter
│   │   ├── migrations/         # Alembic
│   │   └── tests/
│   ├── frontend-v2/            # interface de produção (Next.js 15, brand kit Balmor)
│   ├── frontend/               # v1, mantida por referência
│   ├── openclaw-skill/         # o que os agentes de fato executam
│   │   ├── lead-hunter/        # lh.mjs (CLI principal) + demo, render, ref-shot, gates
│   │   ├── verifica-interface/ # check.py + qa-visual.py — gate de QA em navegador real
│   │   └── referencias/        # anti-vibe-code, design-geral, guias por nicho
│   ├── ops/                    # crons e instrumentação da operação
│   ├── demos/                  # demos geradas + _repetition-book + _licoes-aprendidas
│   ├── docs/                   # PLAYBOOK (mestre) · OVERVIEW · MIGRACAO_VPS
│   └── docker-compose.yml
├── hermes/ · bot/              # containers legado da fase inicial da software house
└── openclaw-knowledge-base.md  # notas de operação do OpenClaw
```

## Backend

FastAPI + SQLAlchemy + Alembic, PostgreSQL no Supabase. 40 endpoints agrupados em:

- **Descoberta** — `POST /campaigns`, `/jobs/{id}/execute`, `/regions`, `/categories`
- **Leads** — `GET /leads`, `/leads/ranked`, `/leads/{place_id}/context`, `/stats`
- **Auditoria e score** — `POST /leads/{place_id}/audit`, `/audits/run`, `/scores/run`, `/pipeline/run`
- **CRM** — `/crm`, `/crm/promote`, `/leads/{place_id}/crm/stage`, `/crm/owner`
- **Relacionamento** — interações, follow-ups (`/follow-ups/upcoming`, `/history`), outreach
- **Demos** — `/demos/register`, `/leads/{place_id}/demo-requests`, `/demo-requests/{id}/status`, `/demo-assets`

Serviços: `search`, `qualification`, `audit`, `score`, `crm`, `outreach`, `followup`, `campaign`,
`quota`, `logging`. O `quota_service` existe porque a Google Places API é paga: **toda chamada
verifica a cota antes**, e a busca de leads novos é disparada manualmente de propósito.

## Interface

Next.js 15 (App Router) + Tailwind + TanStack Query, em `frontend-v2`, no ar em `app.balmor.tech`.
Páginas: dashboard, leads (lista + detalhe), CRM Kanban, campanhas, demos, follow-ups, settings.

O botão **GERAR SITE** é a ponte humano→agente: o vendedor pede a demo de um lead pela interface,
escreve instruções e **sobe fotos e vídeos do Instagram do cliente**. Esse material real cai na
pasta da demo com prefixo `upload-` e o BRIEF é obrigado a usá-lo — é o que impede o site de sair
com foto de banco de imagens.

## Skills do OpenClaw

`lh.mjs` é a CLI que os agentes usam para tudo. Principais comandos:

```
status · leads [N] · lead <id> · draft <id>          leitura e abordagem
crm · promote · audit-run · score-run                pipeline comercial
demo-data · demo-ig · demo-brief · demo-fundacao     construção da demo
demo-revisao · demo-similar · demo-publicar
demo-auto                                            a cadeia completa, sem parar
demo-pedidos · demo-pedido-status                    fila do botão GERAR SITE
get <path> · post <path> [json]                      chamada crua à API
```

`verifica-interface/check.py` renderiza a página em navegador real (desktop 1280, tablet, mobile 390)
e barra: overflow horizontal, carrossel horizontal no mobile, estatística zerada, contraste
insuficiente, espaço morto, erro de console. Qualquer achado **[ALTA]** bloqueia a publicação.

## Operação contínua e engenharia de custo

Crons em [`Lead-hunter/ops/`](Lead-hunter/ops/) (systemd na VPS; antes Task Scheduler do Windows):

| Quando | Script | O que faz |
|---|---|---|
| 05h | `backup.mjs` | `pg_dump` do banco, retenção de 14 dias |
| 06h | `pipeline.mjs` | re-auditoria + re-score (custo zero de Google) |
| 07h | `relatorio.mjs` | resumo da Sukuna → Discord `#melhorias` |
| 08h + 3/3h | `heartbeat.mjs` | checa gateway, backend e banco; avisa **só se cair** |
| 22h, 3/3 dias | `analista.mjs` + `analista-prep.mjs` | lê os transcripts e propõe skills/correções |
| 3/3 dias | `notas-diarias.mjs` + `consolidacao.mjs` | memória dos agentes (nota diária → `MEMORY.md`) |
| contínuo | `pedidos-watch.mjs` | vigia a fila do GERAR SITE por código |
| contínuo | `session-guard.mjs` | mede o contexto por turno e rotaciona a sessão |

Os últimos itens são a parte mais interessante da operação, e nasceram de medição:

- **`medir.mjs`** lê o journal do OpenClaw e os transcripts e responde, por janela: quantos turnos,
  em qual modelo, quanto tempo, quanto contexto — e **quanto disso foi manutenção em vez de trabalho**.
  A medição de 30/07/2026 mostrou 86 turnos no dia, 85 em Opus, e **52% eram heartbeat e flush**.
- **`pedidos-watch.mjs`** substituiu o heartbeat que gastava um turno de LLM só para responder
  "nada pendente". Agora o mesmo comando roda por código, a custo zero, e **só acorda a Sukuna
  quando existe pedido de verdade**.
- **`session-guard.mjs`** existe porque a sessão só cresce: a Nobara chegou a ~840k tokens *por
  turno*, o que fazia cada resposta levar 4 minutos e transformava um erro transitório da API em
  perda total. O guard mede, manda destilar a memória e rotaciona a sessão.
- **Tiering por papel:** os subagentes mecânicos (Fundação, Revisor, correção) rodam em Sonnet por
  padrão, configurável por `LH_MODELO_*`. Raciocínio caro fica onde muda o resultado.

## Subir o ambiente

```bash
# 1. Backend + Playwright
cd Lead-hunter
cp .env.example .env          # DATABASE_URL, GOOGLE_API_KEY, LH_API, VERCEL_SCOPE…
docker compose up -d --build  # o entrypoint roda alembic upgrade head

curl http://localhost:8000/health      # {"status":"ok"}
curl http://localhost:8000/health/db   # {"status":"ok","database":"connected"}

# 2. Interface
cd frontend-v2 && npm install && npm run dev -- -p 3100

# 3. Agentes (nativos, fora do Docker)
#    OpenClaw com as skills de openclaw-skill/ montadas no workspace
node skills/lead-hunter/lh.mjs status
```

Variáveis que precisam estar no ambiente **de quem roda os agentes**, não só no backend:
`LH_API` (onde o backend está), `VERCEL_SCOPE` (time da Vercel para as demos) e
`DEMO_UPLOADS_DIR` (fotos que a interface sobe).

## Regras invioláveis

1. **Outreach é manual.** Os agentes preparam; a pessoa envia. Sem exceção.
2. Agente não roda SQL arbitrário — só a camada de serviços.
3. Score é determinístico. O agente interpreta, **não altera**.
4. Verificar a cota da Google antes de cada chamada e parar no limite.
5. Dedup por `place_id`. Não repetir job concluído, não auditar lead descartado.
6. Demo só para lead quente (PRIORIDADE/ALTO **e** sem site ou com site ruim).
7. Segredos (`.env`, chave Google, senha do banco, webhook do Discord) **nunca** no git.
8. Sem dado falso silencioso. Sem scraping do Google Maps — só a API oficial.
9. Quem faz não se avalia: o Crítico é independente e não pode ser pulado.

---

**Documentos mestres:** [`PLAYBOOK_IMPLEMENTACAO.md`](Lead-hunter/docs/PLAYBOOK_IMPLEMENTACAO.md)
(decisões, fases e regras) · [`OVERVIEW_PROJETO_E_OPENCLAW.md`](Lead-hunter/docs/OVERVIEW_PROJETO_E_OPENCLAW.md)
· [`MIGRACAO_VPS.md`](Lead-hunter/docs/MIGRACAO_VPS.md) ·
[`Lead-hunter/README.md`](Lead-hunter/README.md) (guia operacional do dia a dia)
