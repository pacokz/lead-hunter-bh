---
name: lead-hunter
description: "Operar a plataforma Lead Hunter BH (prospecção comercial em Belo Horizonte). Use sempre que o Samuel perguntar o que está acontecendo na operação, quais leads abordar, status da prospecção, contexto de um lead, pedir um rascunho de abordagem, ou GERAR/PUBLICAR uma prévia de site (demo) pra um lead. Comandos: status, leads, lead, draft, demo, demo-publicar, crm, promote, audit-run, score-run."
metadata: { "openclaw": { "emoji": "🎯" } }
---

# Lead Hunter BH

A fábrica de prospecção roda num backend FastAPI em `http://localhost:8000` (Docker).
O **banco é a fonte da verdade**. **NUNCA invente dados** — se um comando falhar ou o
backend estiver fora do ar, avise o Samuel.

Todos os comandos são executados via Node:

```
node "C:\01-hermes\Lead-hunter\openclaw-skill\lead-hunter\lh.mjs" <comando> [args]
```

## Comandos
- `status` → visão geral (empresas, sem site, sites ruins, prioritários, uso da API, faixas)
- `leads [N]` → top N leads ranqueados por score (default 15) — mostra `id=` de cada um
- `lead <id>` → contexto completo de um lead (Google + auditoria + score)
- `draft <id>` → gera rascunho de abordagem (WhatsApp). **NÃO envia** — o Samuel envia.
- `demo-data <id> --site <url>` → entrega os MATERIAIS (dados reais + fotos baixadas + cor da marca) pra a Criadora (Nobara) **escrever a SPEC**.
- `demo-render <spec.json>` → renderiza o site a partir da **SPEC** que a Nobara escreveu (formato em `SPEC.md`). É o caminho principal: a Nobara é diretora criativa (escreve a spec), o código monta o HTML.
- `demo-similar <slug>` → compara a estrutura da demo com as anteriores e avisa se ficou MUITO PARECIDA (>75%) — pra não virar molde. Exit 1 se parecida demais.
- `demo <id> --site <url do site atual>` → (FALLBACK) gera uma PRÉVIA de site via template. Sistema PARAMETRIZADO (varia por nicho): `--theme boutique|warm|bold|classic` (par de fontes + clima) e `--anim aurora,textgen,marquee,parallax,hoverzoom,shimmer` (escolha as animações). Sem flags, usa o tema/animações padrão do segmento. Baixa as fotos reais do site (`--site`); lead sem site nenhum omite `--site`. Outros overrides: `--accent #hex` (cor da marca real do lead), `--accent2 #hex`, `--headline`, `--sobre`, `--segmento`. Salva em `C:\01-hermes\Lead-hunter\demos\<slug>\`.
- `demo-publicar <slug> --scope balmor-s-projects` → publica a prévia num link AO VIVO na Vercel (ex: `fialho-odontologia.vercel.app`) e devolve a URL.
- `crm` → leads no pipeline comercial, agrupados por estágio
- `promote` → traz leads quentes (ALTO_POTENCIAL/PRIORIDADE) pro CRM
- `audit-run` → audita sites pendentes
- `score-run` → calcula score dos leads pendentes
- `get <path>` / `post <path> [json]` → chamada crua, pra endpoints fora dos atalhos

## Quando o Samuel perguntar "o que está acontecendo"
Rode `status` (e `leads 5` se útil) e **resuma em PT-BR, direto**: quantos leads quentes,
quais os top prioritários e o que precisa de ação (jobs com erro, leads sem abordar).

## Gerar e publicar uma demo (prévia de site)
É a maior peça de conversão: uma prévia de site pronta pro Samuel mandar pro dono no WhatsApp.
1. `demo <id> --site <url do site atual dele>` — gera local e baixa as fotos reais do site dele.
2. Resuma pro Samuel (negócio, se pegou fotos, link do arquivo). Ele revisa/aprova.
3. `demo-publicar <slug> --scope balmor-s-projects` — sobe ao vivo e devolve o link.
4. Entregue o link pro Samuel. **Ele é quem manda pro lead** — você nunca envia.

## Regras (alinhadas com o SOUL)
- **Outreach é MANUAL:** `draft` e `demo` só PREPARAM; quem envia/manda o link é o Samuel.
- **Cuidado com custo:** executar busca real (`post /jobs/{id}/execute`) gasta cota da
  API Google — avise o Samuel antes.
- **Nunca SQL direto.** Só estes comandos / endpoints.
