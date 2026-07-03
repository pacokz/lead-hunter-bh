---
name: lead-hunter
description: "Operar a plataforma Lead Hunter BH (prospecção comercial em Belo Horizonte). Use sempre que o Samuel perguntar o que está acontecendo na operação, quais leads abordar, status da prospecção, contexto de um lead, pedir um rascunho de abordagem, ou GERAR/PUBLICAR uma prévia de site (demo) pra um lead. Comandos: status, leads, lead, draft, demo, demo-publicar, crm, promote, audit-run, score-run."
metadata: { "openclaw": { "emoji": "🎯" } }
---

# Lead Hunter BH

A fábrica de prospecção roda num backend FastAPI em `http://localhost:8000` (Docker).
O **banco é a fonte da verdade**. **NUNCA invente dados** — se um comando falhar ou o
backend estiver fora do ar, avise o Samuel.

Todos os comandos são executados via Node, a partir da RAIZ do workspace (caminho relativo):

```
node skills/lead-hunter/lh.mjs <comando> [args]
```

(No Windows do Samuel o caminho absoluto é `C:\01-hermes\Lead-hunter\openclaw-skill\lead-hunter\lh.mjs`.)

## Comandos
- `status` → visão geral (empresas, sem site, sites ruins, prioritários, uso da API, faixas)
- `leads [N]` → top N leads ranqueados por score (default 15) — mostra `id=` de cada um
- `lead <id>` → contexto completo de um lead (Google + auditoria + score)
- `draft <id>` → gera rascunho de abordagem (WhatsApp). **NÃO envia** — o Samuel envia.
- `demo-data <id> --site <url>` → entrega os MATERIAIS BRUTOS (dados reais + fotos baixadas + cor detectada) pra a Criadora (Nobara). Ela **cura** (fotos, cor real pelo logo), **pesquisa referências** e escreve `demos/<slug>/BRIEF.md` ANTES da spec.
- `demo-render <spec.json>` → renderiza o site a partir da **SPEC** que a Nobara escreveu (formato em `SPEC.md`). É o caminho principal: a Nobara é diretora criativa (escreve a spec), o código monta o HTML. **GATE: recusa renderizar sem `demos/<slug>/BRIEF.md`** (materiais confirmados + referências) — `--force` pula, não recomendado.
- `demo-similar <slug>` → compara a estrutura da demo com as anteriores e avisa se ficou MUITO PARECIDA (>75%) — pra não virar molde. Exit 1 se parecida demais.
- `demo <id> --site <url do site atual>` → (FALLBACK) gera uma PRÉVIA de site via template. Sistema PARAMETRIZADO (varia por nicho): `--theme boutique|warm|bold|classic` (par de fontes + clima) e `--anim aurora,textgen,marquee,parallax,hoverzoom,shimmer` (escolha as animações). Sem flags, usa o tema/animações padrão do segmento. Baixa as fotos reais do site (`--site`); lead sem site nenhum omite `--site`. Outros overrides: `--accent #hex` (cor da marca real do lead), `--accent2 #hex`, `--headline`, `--sobre`, `--segmento`. Salva em `C:\01-hermes\Lead-hunter\demos\<slug>\`.
- `demo-publicar <slug> --scope balmor-s-projects` → publica a prévia num link AO VIVO na Vercel (ex: `fialho-odontologia.vercel.app`) e devolve a URL. Também **registra no backend** (vincula demo→lead via `demos/<slug>/lead.json`, move o CRM pra DEMO_PRONTA e fecha o pedido do GERAR SITE, se houver).
- `demo-pedidos` → lista os pedidos do botão **GERAR SITE** da interface (Samuel/José pedem por lá, com instruções e fotos do Instagram do lead). **A Sukuna checa isso no heartbeat.**
- `demo-pedido-status <id> <IN_PROGRESS|CANCELLED>` → marca que os agentes assumiram o pedido (a publicação fecha sozinho como PUBLISHED).
- `crm` → leads no pipeline comercial, agrupados por estágio
- `promote` → traz leads quentes (ALTO_POTENCIAL/PRIORIDADE) pro CRM
- `audit-run` → audita sites pendentes
- `score-run` → calcula score dos leads pendentes
- `get <path>` / `post <path> [json]` → chamada crua, pra endpoints fora dos atalhos

## Quando o Samuel perguntar "o que está acontecendo"
Rode `status` (e `leads 5` se útil) e **resuma em PT-BR, direto**: quantos leads quentes,
quais os top prioritários e o que precisa de ação (jobs com erro, leads sem abordar).

## Gerar e publicar uma demo (prévia de site)
É a maior peça de conversão: uma prévia pronta pro Samuel mandar pro dono no WhatsApp.
A demo nasce da **rota criativa** (NÃO do template) — é isso que garante que cada site é único.

**Papéis:** o **Nanami (Diretor de Arte)** pesquisa referências e escreve o BRIEF; a
**Nobara (Criadora)** executa (spec + render); a **Sukuna** orquestra e resume pro Samuel.

0. Se o trabalho veio de um **pedido da interface** (`demo-pedidos`): marque
   `demo-pedido-status <id> IN_PROGRESS`, leia as **instruções do Samuel** no pedido e
   respeite-as no BRIEF. Fotos que ele subiu são copiadas pro `img/` pelo `demo-data`
   (prefixo `upload-`) — **material real do lead, use com PRIORIDADE.**
   **Se a demo já existe, o pedido É a autorização pra REGERAR do zero** (as instruções
   e fotos novas substituem a versão antiga) — não pergunte, execute até publicar.
1. `demo-data <id> --site <url do site atual>` — baixa fotos reais + dados + cor auto-detectada.
2. **Nanami** pesquisa referências AMPLAS (WebSearch, mín. 4, cross-nicho — não por nicho) e
   escreve `demos/<slug>/BRIEF.md` seguindo `agents/diretor-de-arte/BRIEF-TEMPLATE.md`.
   **Sem BRIEF, o render é barrado.**
3. **Nobara** escreve `demos/<slug>/index.html` **DO ZERO** (skill `frontend-design`),
   reimplementando as referências do BRIEF — **estrutura, hero, animações, tipografia e
   composição PRÓPRIAS**. É **PROIBIDO** usar `render.mjs`/`demo-render` (gera site templateado).
   Antes de começar, LÊ `demos/_repetition-book.md` e **não repete nenhum padrão** de lá;
   ao terminar, **anota** o que usou (hero, layout, animações, tipografia, grid, tratamento).
4. **QA OBRIGATÓRIO (2 níveis) antes de publicar:**
   (a) `python skills/verifica-interface/check.py demos/<slug>/index.html` — bugs objetivos
       (overflow, **carrossel horizontal no mobile**, stat "0", contraste, espaço morto). Zero [ALTA].
   (b) `python skills/verifica-interface/qa-visual.py demos/<slug>/index.html` — gera screenshots;
       avalie pela rubrica `QA-VISUAL.md` e escreva `demos/<slug>/_qa/critique.json`
       (**nota craft 0–10 + blockers**). Nota < 7 ou blocker = refaz.
5. Resuma pro Samuel (negócio, referências usadas, link do arquivo). Ele revisa/aprova.
6. `demo-publicar <slug> --scope balmor-s-projects` — roda TODOS os gates (template, similaridade,
   movimento, números, check.py e o **craft score**) e só então sobe ao vivo e devolve o link.
7. Entregue o link pro Samuel. **Ele é quem manda pro lead** — você nunca envia.

> **`render.mjs` / `demo` / `demo-render` são FALLBACK de emergência** (lead 100% sem material)
> — geram esqueleto parametrizado e o **gate visual REPROVA** pra publicação. A rota padrão é
> a Nobara escrevendo o site à mão a partir das referências. Nunca dois sites com o mesmo DNA.

## Regras (alinhadas com o SOUL)
- **Outreach é MANUAL:** `draft` e `demo` só PREPARAM; quem envia/manda o link é o Samuel.
- **Cuidado com custo:** executar busca real (`post /jobs/{id}/execute`) gasta cota da
  API Google — avise o Samuel antes.
- **Nunca SQL direto.** Só estes comandos / endpoints.
