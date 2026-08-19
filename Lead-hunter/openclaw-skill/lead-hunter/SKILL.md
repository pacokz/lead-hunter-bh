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

Sempre relativo ao workspace — **não use caminho absoluto**, ele muda a cada instalação.

## Comandos
- `status` → visão geral (empresas, sem site, sites ruins, prioritários, uso da API, faixas)
- `leads [N]` → top N leads ranqueados por score (default 15) — mostra `id=` de cada um
- `lead <id>` → contexto completo de um lead (Google + auditoria + score)
- `draft <id>` → gera rascunho de abordagem (WhatsApp). **NÃO envia** — o Samuel envia.
- `demo-data <id> --site <url>` → entrega os MATERIAIS BRUTOS (dados reais + fotos baixadas + cor detectada) na pasta da demo. (Lead sem site/rede social: `demo-ig <slug> <@handle>` puxa as fotos reais do Instagram.)
- `demo-auto <id> --site <url>` → **cadeia COMPLETA sem parar**: materiais → Nanami (BRIEF) → Fundação (tokens) → você escreve o site → Revisor (até **2 correções** automáticas) → Crítico → deploy → **uma** mensagem no Discord com o link. Use quando o Samuel pedir a demo de um lead e não quiser acompanhar etapa por etapa. **Silêncio no caminho feliz**: não reporte progresso durante a cadeia. Se algo estourar (lead sem foto, BRIEF inválido, Revisor reprovando 3×, Crítico bloqueando), a cadeia **escala**: você recebe o motivo e conta pro Samuel — **não tente resolver sozinha nem recomeçar**. Quem escolhe o lead é sempre o Samuel; isto **não** varre a base.
- `demo-brief <slug>` → invoca o **Nanami** (Diretor de Arte) **por gateway** (não @menção) pra pesquisar referências e escrever `demos/<slug>/BRIEF.md`. Reinvoca o Nanami se o `validate-brief` reprovar. É a rota canônica do BRIEF — a Nobara **não** escreve o próprio BRIEF. **Ao validar, dispara automático a Fundação** (ver abaixo).
- `demo-fundacao <slug>` → invoca a **Fundação** (subagente da Nobara) por gateway pra destilar o BRIEF + prints em `demos/<slug>/tokens.css` + `motion-spec.md`. Roda **automático no fim do `demo-brief`**; este comando só re-gera sozinho. Não-bloqueante.
- `demo-revisao <slug>` → invoca o **Revisor** (subagente da Nobara) por gateway pra QA barato ANTES do Crítico: roda os gates objetivos + anti-vibe-code + anti-molde e escreve `demos/<slug>/_qa/revisao-interna.md`. Exit 0 = "PRONTO PRO CRITICO", exit 1 = "VOLTA PRA NOBORA". Também é gate no `demo-publicar`.
- `demo-render <spec.json>` → **FALLBACK DEPRECIADO** (gera site templateado a partir de uma SPEC). **NÃO é o caminho principal** — o gate visual REPROVA o resultado dele na publicação. A rota canônica é a Nobara escrever o `index.html` do ZERO (ver passo a passo abaixo). Só use em emergência (lead 100% sem material).
- `demo-similar <slug>` → compara a estrutura da demo com as anteriores e avisa se ficou MUITO PARECIDA (>75%) — pra não virar molde. Exit 1 se parecida demais.
- `demo <id> --site <url do site atual>` → (FALLBACK) gera uma PRÉVIA de site via template. Sistema PARAMETRIZADO (varia por nicho): `--theme boutique|warm|bold|classic` (par de fontes + clima) e `--anim aurora,textgen,marquee,parallax,hoverzoom,shimmer` (escolha as animações). Sem flags, usa o tema/animações padrão do segmento. Baixa as fotos reais do site (`--site`); lead sem site nenhum omite `--site`. Outros overrides: `--accent #hex` (cor da marca real do lead), `--accent2 #hex`, `--headline`, `--sobre`, `--segmento`. Salva em `demos/<slug>/`.
- `demo-publicar <slug>` → publica a prévia num link AO VIVO na Vercel e devolve a URL. O time da Vercel vem do `VERCEL_SCOPE` do ambiente (ou `--scope <time>`); **não escreva um time fixo aqui** — cada instalação tem o seu. Também **registra no backend** (vincula demo→lead via `demos/<slug>/lead.json`, move o CRM pra DEMO_PRONTA e fecha o pedido do GERAR SITE, se houver).
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
**Nobara (Criadora)** executa (escreve o `index.html` do ZERO); a **Sukuna** orquestra e resume pro Samuel.

0. Se o trabalho veio de um **pedido da interface** (`demo-pedidos`): marque
   `demo-pedido-status <id> IN_PROGRESS`, leia as **instruções do Samuel** no pedido e
   respeite-as no BRIEF. Fotos que ele subiu são copiadas pro `img/` pelo `demo-data`
   (prefixo `upload-`) — **material real do lead, use com PRIORIDADE.**
   **Se a demo já existe, o pedido É a autorização pra REGERAR do zero** (as instruções
   e fotos novas substituem a versão antiga) — não pergunte, execute até publicar.
   **Antes de setar IN_PROGRESS, confira o estado do lead** (`crm`/`demo-pedidos`): se já há
   demo **PUBLISHED**, ANUNCIE que está **regenerando a demo publicada de \<lead\>** (não é lead
   novo) e siga — é só consciência de estado pra não haver ambiguidade "travou ou é rework?"
   (caso Paula Teodoro). **Não pare pra perguntar** — o pedido já autoriza.
1. `demo-data <id> --site <url do site atual>` — baixa fotos reais + dados + cor auto-detectada.
2. **`demo-brief <slug>`** invoca o **Nanami** POR GATEWAY (não @menção) — ele pesquisa referências
   AMPLAS (WebSearch, mín. 4, cross-nicho, awwwards 1º / 21st.dev pra animação) e escreve
   `demos/<slug>/BRIEF.md` (BRIEF-TEMPLATE.md). O `validate-brief` exige profundidade (hero_strategy,
   motion_tier, stack, image_treatment); se reprovar, o Nanami é reinvocado. **A Nobara NÃO escreve
   o próprio BRIEF** — quem faz direção de arte é o Nanami. Ao validar, a **Fundação** (subagente
   da Nobara) roda automático e destila o BRIEF em `demos/<slug>/tokens.css` + `motion-spec.md`.
3. **Nobara** escreve `demos/<slug>/index.html` **DO ZERO** (skill `frontend-design`), **usando o
   `tokens.css` da Fundação** (não reinventa cor/fonte; se a Fundação falhou, extrai do BRIEF na mão),
   reimplementando as referências do BRIEF — **estrutura, hero, animações, tipografia e
   composição PRÓPRIAS**. É **PROIBIDO** usar `render.mjs`/`demo-render` (gera site templateado).
   **Stack livre conforme o `motion_tier` do BRIEF** (T0 static → T1 micro-interações CSS →
   T2 GSAP/ScrollTrigger → T3 three.js/WebGL/canvas): libs vendoradas em `demos/_stack-kit/`
   (copia pra `demos/<slug>/vendor/`, **nunca CDN**), guardrails em `referencias/web-stack-motion.md`
   (reduced-motion, poster de fallback, mobile, LCP). 3D só quando o conceito é espacial — nunca decorativo.
   Antes de começar, LÊ `demos/_repetition-book.md` e **não repete nenhum padrão** de lá;
   ao terminar, **anota** o que usou (hero, layout, animações, tipografia, grid, tratamento, tier/stack).
4. **QA OBRIGATÓRIO antes de publicar:**
   (a) `python skills/verifica-interface/check.py demos/<slug>/index.html` — bugs objetivos
       (overflow, **carrossel horizontal no mobile**, stat "0", contraste, espaço morto). Zero [ALTA].
   (b) `python skills/verifica-interface/qa-visual.py demos/<slug>/index.html` — gera os screenshots
       (desktop/mobile/tablet) que o **Crítico** vai olhar. A Nobara **NÃO se dá a própria nota** —
       o craft é julgado no publicar por um juiz independente (ver passo 6).
   (c) `demo-revisao <slug>` — o **Revisor** (subagente) faz o QA barato com olhos frescos e devolve
       "PRONTO PRO CRITICO" ou "VOLTA PRA NOBORA". Corrija o que ele apontar ANTES de publicar.
5. Resuma pro Samuel (negócio, referências usadas, link do arquivo). Ele revisa/aprova.
6. `demo-publicar <slug>` — roda TODOS os gates (BRIEF real, template,
   similaridade, movimento, números, check.py, **Revisor** como triagem barata) **E chama o agente Crítico por gateway** (juiz
   independente, ≠ Nanami/Nobara) que olha os screenshots + BRIEF e escreve o veredito
   (`critique.json`: craft/genericity/brief_execution). Reprova genérico/nota baixa. Só então sobe.
7. Entregue o link pro Samuel. **Ele é quem manda pro lead** — você nunca envia.

> **`render.mjs` / `demo` / `demo-render` são FALLBACK de emergência** (lead 100% sem material)
> — geram esqueleto parametrizado e o **gate visual REPROVA** pra publicação. A rota padrão é
> a Nobara escrevendo o site à mão a partir das referências. Nunca dois sites com o mesmo DNA.

## Regras (alinhadas com o SOUL)
- **Outreach é MANUAL:** `draft` e `demo` só PREPARAM; quem envia/manda o link é o Samuel.
- **Cuidado com custo:** executar busca real (`post /jobs/{id}/execute`) gasta cota da
  API Google — avise o Samuel antes.
- **Nunca SQL direto.** Só estes comandos / endpoints.
