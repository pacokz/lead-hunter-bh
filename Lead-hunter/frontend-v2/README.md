# Lead Hunter BH — Frontend v2 (UI/UX completa)

Redesign completo da interface do Lead Hunter, com a identidade visual **Balmor**
(Space Grotesk + Inter, roxo `#7C3AED`, sidebar carvão `#0D0D0D`). Ferramenta
interna pra dois operadores fixos (Samuel e José) — toda ação é atribuída ao
operador ativo (seletor na topbar).

> **Dados 100% mock.** O backend FastAPI NÃO é consumido — `lib/api.ts` estuba
> os contratos (cada função comenta o endpoint real equivalente) contra um store
> em memória (`lib/mock/store.ts`). Pra ligar no backend real, troque o corpo das
> funções por `fetch()` mantendo as assinaturas; os hooks TanStack Query
> (`lib/queries.ts`) e as telas não mudam.

## Rodar

```bash
npm install
npm run dev     # http://localhost:3200
npm run build && npm start
```

Porta 3200 pra não conflitar com o frontend atual (3100) nem com outros apps (3000).

## Estrutura

```
app/                    # rotas (App Router)
  page.tsx              # Dashboard
  leads/                # lista ranqueada + detalhe (score, auditoria, abordagem)
  crm/                  # kanban 10 estágios com drag & drop nativo
  follow-ups/           # agenda global (atrasados/hoje/próximos)
  demos/                # prévias com gate de QA (publicar trava com BLOCKER/craft<7)
  campaigns/            # busca Places por categoria+região, jobs e cota
  settings/             # cota, pesos do score, segmentos, regiões
components/
  ui/                   # design system (Button, Badge, Card, Table, Dialog, Toast...)
  domain/               # badges semânticos, avatar de operador, SiteShot (thumb mock)
  layout/               # sidebar Balmor, topbar com seletor de operador
lib/
  types.ts              # contratos espelhando o backend
  domain.ts             # mapas de cor/label por enum + regras (bandas, gate de QA)
  api.ts                # API estubada (latência simulada, mutações persistem na sessão)
  queries.ts            # hooks TanStack Query + invalidação
  mock/store.ts         # dataset fictício coerente (score derivado das regras reais)
```

## Regras de produto respeitadas na UI

- **Outreach manual**: rascunhos têm botão copiar; não existe "enviar".
- **Score determinístico**: exibido com componentes explicados; sem edição manual.
- **Gate de QA**: botão Publicar desabilita com BLOCKER ou craft score < 7.
- **Atribuição**: promover, mover estágio, interação, follow-up e demo registram o operador.
