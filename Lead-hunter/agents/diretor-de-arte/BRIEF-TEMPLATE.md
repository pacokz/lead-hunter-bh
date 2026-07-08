# BRIEF — <Nome do lead> (`<slug>`)

> Modelo que o **Nanami** preenche por lead e salva em `demos/<slug>/BRIEF.md`.
> A Nobara **escreve o site do zero** a partir daqui. Não deixe campo em branco — se não se aplica,
> escreva "n/a" com o motivo. O objetivo do documento é: **impossível sair igual ao anterior.**

## 1. Diagnóstico do lead
- **O que o negócio vende:**
- **Público principal:**
- **Percepção desejada:** (premium · acessível · técnico · acolhedor · ousado · tradicional…)
- **Conversão principal do site:** (WhatsApp · formulário · agendamento · orçamento · visita · compra)

## 2. Hierarquia de mensagem
- **Mensagem principal do hero (headline):**
- **Prova de confiança mais importante:** (nota Google, nº reviews, anos, prêmio, nome do dono…)
- **Objeção que o site precisa vencer:** (preço? confiança? distância? medo?)
- **CTA principal:**  |  **CTA secundário:**

## 3. Conceito
- **A grande ideia visual em 1 linha:**

## 4. Cor real da marca
- **Cor(es) validada(s) olhando o LOGO/assets** (não a auto-detectada): `#______`
- **Como confirmei:** (logo do site / print do Instagram / assets enviados pelo Samuel)

## 5. Fotos curadas
| Foto | Entra em (seção) | Por quê | Descartei | Motivo do descarte |
|------|------------------|---------|-----------|--------------------|
|      |                  |         |           |                    |

## 6. Referências (mínimo 3, com URL) — o "roubo"
| # | URL (site real) | Nicho de origem | O que eu ROUBO daqui (concreto) |
|---|-----------------|-----------------|---------------------------------|
| 1 |                 |                 |                                 |
| 2 |                 |                 |                                 |
| 3 |                 |                 |                                 |

> Regra: pelo menos 1 referência de **fora do nicho** do lead. Roubo = algo nomeável
> (um tipo de hero, uma seção, um par tipográfico, um tratamento de imagem), não "o clima".

## 6b. Estratégia visual — DECLARE antes de codar (o coração do craft)
- **`hero_strategy`** — a decisão dominante da hero (escolha UMA, diferente das últimas):
  `typographic` · `editorial` · `full-bleed` (produto/ambiente) · `split-assimétrico` ·
  `manifesto` · `diagnóstico-visual` · outra.
- **`primary_visual_move`** — o gesto visual que carrega o site, em 1 frase.
- **`image_treatment`** — COMO a imagem entra, **materialmente diferente das últimas N demos**.
  ⛔ NÃO repita "foto decorativa em moldura ao lado do texto" — **arco, círculo, blob e card
  arredondado contam como a MESMA categoria**. Ex. de alternativas: full-bleed atrás do texto,
  duotone, colagem editorial, máscara tipográfica na foto, sem retrato, grid de detalhes.
- **Por que diferente das últimas** (hero + imagem, citando o livro de repetições): …
- **`motion_tier`** — EU (diretor) decido o nível de movimento; a Nobara constrói com a stack que
  o tier pede (guia dela em `referencias/web-stack-motion.md`). **Declare numa linha própria e
  literal — `motion_tier: T2` — porque os GATES leem exatamente isso** (visual-gate dispensa
  movimento se T0; demo-publicar bloqueia three.js fora de T3 e GSAP fora de T2+). Escolha UM e justifique:
  - `T0 static-elegant` — sem JS de motion (jurídico/clínico sóbrio).
  - `T1 micro-interações` — **default**: scroll-reveal, contadores, parallax leve (CSS/vanilla).
  - `T2 scroll-choreography` — GSAP + ScrollTrigger: pin, timelines, parallax multicamada (premium/editorial).
  - `T3 imersivo/3D` — three.js/WebGL ou canvas generativo **só quando o conceito é espacial/
    experiencial** (arquitetura, luxo, tech, eventos). Raro — não peça 3D decorativo "porque é bonito".
- **`stack`** — o que a Nobara deve usar de fato: `css-only` · `gsap` · `three.js` · `canvas2d` ·
  `svg-anim` · `lottie`. Coerente com o tier. **UM movimento grande por site**, não empilhar.
- **Efeito-âncora do motion** — descreva a UMA interação que carrega o site (o "roubo" de motion de
  uma ref) e por que ela conta a história DESTE negócio (se sairia igual em qualquer site, não peça).

## 7. Direção de arte — tipografia LIVRE
- **Tipografia:** par **display + body** escolhido LIVREMENTE — **qualquer fonte real**
  (Google Fonts, Fontshare, etc.), ancorado numa referência. Diga os NOMES e o porquê.
  Ex.: display "Fraunces" (serif editorial de contraste) + body "Inter Tight".
  **NÃO se limite a um conjunto fixo** — cada site pede uma tipografia diferente da dos últimos.
- **Tratamento tipográfico:** peso do display, tamanho do hero, UPPERCASE/tracking, itálico,
  mono pra dado? (o que dá personalidade)
- **Paleta:** brand `#___` · deep `#___` · bg `#___` · ink `#___` · surface `#___` · acento `#___`
- **Modo:** claro | escuro

## 8. Direção de componentes (pra nada cair no default)
- **Botões:** sólido | outline | pill | quadrado | com ícone | grande | discreto
- **Cards:** com borda | sem borda | imagem dominante | editorial | glass | lista densa
- **Navegação:** minimal | sticky | lateral | transparente no hero
- **Galeria:** grid | carrossel | mosaico | antes/depois | editorial
- **Animação & movimento (LIVRE, no nível do `motion_tier` da §6b — nada de `shine`/`ticker`
  padrão):** descreva as interações REAIS a construir, ancoradas numa referência. Conforme o tier:
  T1 = reveal por scroll, parallax leve, contador, hover-zoom, texto que "monta" (CSS/vanilla);
  T2 = scroll-narrative com pin, timeline encadeada, parallax multicamada (GSAP); T3 = hero
  WebGL/canvas (partículas, plano-onda, shader nas cores da marca). Escolha o **efeito-âncora** +
  1–2 apoios que casem com o conceito — **diferentes dos últimos sites** (livro de repetições).

## 9. Direção responsiva (mobile)
- **Como o hero vira no mobile:** (empilha? imagem vira topo/fundo? texto encurta?)
- **Imagens podem ser cortadas ou precisam aparecer inteiras?**
- **Prioridade de conteúdo no mobile:** (o que sobe, o que desce, o que some)

## 10. Mapa visual por seção (o esqueleto)
> A ordem e a composição são o coração do anti-molde. Preencha seção a seção.

| Ordem | Seção (type) | Variante | Objetivo | Imagem | Direção de copy | Referência que inspirou |
|-------|--------------|----------|----------|--------|-----------------|-------------------------|
| 1     | header       |          |          |        |                 |                         |
| 2     | hero         |          |          |        |                 |                         |
| …     |              |          |          |        |                 |                         |

- **Por que ESTE esqueleto** (ancorado nas referências) e **como difere dos últimos demos:**

## 11. Restrições (o que NÃO fazer)
- [ ] Não usar gradiente genérico.
- [ ] Não usar cards demais.
- [ ] Não usar hero centralizado se os últimos demos já usaram.
- [ ] Não usar foto fraca no topo.
- [ ] Outras (por lead):

## 12. Checklist de aceitação (o brief só vai pra Nobara se tudo ✓)
- [ ] Mínimo 3 referências reais com URL.
- [ ] Cada referência tem um roubo concreto e nomeado **+ uma instrução de implementação**
      (COMO reconstruir aquele elemento neste site — a Nobara tem que SEGUIR E REMODELAR a ref,
      não só pegar "o clima").
- [ ] Pelo menos 1 referência de fora do nicho.
- [ ] **`hero_strategy` declarado** e diferente de TODOS no livro (`demos/_repetition-book.md`).
- [ ] **`image_treatment` materialmente diferente** das últimas N — NÃO repetir "foto em moldura
      ao lado do texto" (arco/círculo/blob/card = mesma categoria banida por ora).
- [ ] **`motion_tier` + `stack` declarados** e coerentes com o conceito (T3/three.js só com
      justificativa espacial real — nunca 3D decorativo). Há **efeito-âncora prescrito**; se T2/T3,
      lembrar a Nobara dos guardrails (reduced-motion, poster de fallback, mobile, LCP).
- [ ] **Sem scroll horizontal no mobile** que pareça bug (só carrossel com affordance clara:
      cards parciais, snap, setas/dots — e sem estourar a página).
- [ ] Tipografia livre e diferente da dos últimos sites.
- [ ] O esqueleto é claramente diferente dos últimos demos.
- [ ] A cor foi validada por logo/assets (não a auto-detectada).
- [ ] As fotos escolhidas estão justificadas.
- [ ] Números (avaliações, anos etc.) **consistentes** em todo o site.
- [ ] O CTA principal aparece no hero E no final.
