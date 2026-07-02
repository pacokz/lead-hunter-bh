# Lead Hunter BH — Frontend v2

Redesign completo da interface do Lead Hunter com a identidade visual **Balmor**
(Space Grotesk + Inter, roxo `#7C3AED`, sidebar carvão `#0D0D0D`), **conectado ao
backend real** (FastAPI + Supabase) — em produção no `app.balmor.tech`.

## Arquitetura de dados

O navegador chama `/backend-api/*` (mesma origem) e o Next repassa pro backend via
rewrite (`next.config.mjs`, `BACKEND_ORIGIN` default `http://localhost:8000`) —
sem CORS e sem expor o backend na internet.

- `lib/api.ts` — cliente da API real (endpoints FastAPI)
- `lib/types.ts` — contratos crus do backend + tipos de visão
- `lib/queries.ts` — hooks TanStack Query + invalidação
- `lib/domain.ts` — mapas de cor/label por enum (bandas, site_class, estágios, jobs)

## Rodar

```bash
npm install
npm run dev     # http://localhost:3200 (precisa de backend em localhost:8000)
npm run build && npm start
```

⚠️ Não suba o backend Docker local apontando pro Supabase compartilhado (briga com a
produção — pool). Teste na VPS ou com Postgres local.

## Telas

| Rota | O quê |
|---|---|
| `/` | Dashboard: métricas, leads prioritários, agenda, cota |
| `/leads` | Tabela ranqueada + abas Todos/A contatar/Contatados + filtros + promover qualificados |
| `/leads/[id]` | Score com componentes, auditoria (fatos + problemas), abordagem (copiar), CRM, atividade |
| `/crm` | Kanban 10 estágios com drag & drop |
| `/follow-ups` | Agenda global (atrasados/hoje/próximos) |
| `/campaigns` | Campanhas + jobs sob demanda + cota + "Processar agora" (pipeline) |
| `/settings` | Cota, critérios de qualificação (read-only), segmentos e regiões |
| `/demos` | Informativa — demos são geradas pelos agentes (Nanami/Nobara) via Discord |

## Regras de produto respeitadas na UI

- **Outreach manual**: rascunhos têm botão copiar; não existe "enviar".
- **Score determinístico**: exibido com componentes explicados; sem edição manual.
- **Cota**: jobs bloqueiam quando a cota diária esgota; pipeline (auditar+pontuar) é grátis.

## Deploy (VPS)

```bash
git push origin master
ssh root@187.127.41.79 "cd /root/hermes && git pull && cd Lead-hunter/frontend-v2 && npm install && npm run build && systemctl restart frontend-v2"
```

`frontend-v2.service` roda na porta 3100 (túnel Cloudflare `app.balmor.tech`).
Rollback pro frontend antigo: `systemctl disable --now frontend-v2 && systemctl enable --now frontend`.
