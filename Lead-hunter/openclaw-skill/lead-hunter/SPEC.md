# SPEC — o formato que a Nobara escreve (e o `render.mjs` renderiza)

A Nobara é a **diretora criativa**: ela escreve uma **SPEC em JSON** (decisões pequenas) e
roda `demo-render <spec.json>`. O código monta o HTML. **Nunca escreva o HTML inteiro** —
escreva a spec. Cada lead = decisões diferentes = site diferente.

## Estrutura geral
```json
{
  "meta": { ...dados reais do lead... },
  "art_direction": { ...direção de arte... },
  "sections": [ { "type": "...", "variant": "...", "props": { ... } }, ... ]
}
```

## meta (dados reais — vêm do `demo-data`)
- `nome` (obrigatório) · `slug` (ex: "fialho-odontologia") · `bairro` · `phone` ·
  `whatsapp` (link wa.me) · `descricao` (meta description) · `ogImage` (caminho de foto)

## art_direction (a sua direção criativa)
- `concept`: 1 linha do conceito (ex: "clínica boutique de alto padrão, luxo discreto")
- `type_system`: **um** de — `serif-editorial`, `serif-high-contrast`, `serif-classic`,
  `grotesk-swiss`, `grotesk-bold`, `mono-industrial`, `rounded-warm`
- `palette`: `{ "brand": "#hex" }` (cor REAL da marca do lead). Opcional: `deep`, `bg`,
  `ink`, `surface`, `line`, `mode:"dark"`. Se só der `brand`, o resto é derivado.
- `animations`: subconjunto de `["aurora","textgen","shimmer","parallax","gradient","spotlight","tilt","beam","progress","float"]`.
  (reveal no scroll, contadores, ticker, hover e o slider do before/after já são automáticos.)
  - `gradient` — brilho de gradiente animado no H1 (ignorado se `textgen` também estiver ligado)
  - `spotlight` — luz que segue o mouse nos cards/bento (estilo 21st.dev)
  - `tilt` — inclinação 3D sutil nos cards ao passar o mouse
  - `beam` — borda animada girando no CTA (band/split)
  - `progress` — barra fina de progresso de scroll no topo
  - `float` — badges do hero flutuam devagar
  Regra de bom gosto: escolha **2–4** animações que casem com o conceito; nunca ligue todas.
  Tudo respeita `prefers-reduced-motion` automaticamente.

## sections — escolha, ordene e componha (a variedade vem DAQUI)
Cada item: `{ "type", "variant", "props": {} }`. Tipos e variantes disponíveis:

| type | variants | props principais |
|---|---|---|
| `header` | (única) | `sub`, `cta` |
| `hero` | `split` · `editorial` · `fullbleed` · `centered` | `eyebrow`, `headline`, `sub`, `cta`, `cta2`, `rating`, `reviews`, `image` |
| `ticker` | (única) | `items: []` (palavras que correm) |
| `manifesto` | (única) | `eyebrow`, `quote` (frase forte da marca) |
| `about` | (única) | `eyebrow`, `text` (frase grande), `body`, `image` |
| `services` | `zigzag` · `list` · `cards` | `title`, `intro`, `items:[{title, desc, image?, icon?}]` |
| `feature` | (única) | `eyebrow`, `title`, `body`, `image`, `cta?`, `reverse?` (imagem à direita) |
| `steps` | (única) | `eyebrow`, `title`, `items:[{title, desc}]` (processo numerado "Como funciona") |
| `stats` | (`style:"band"` ou `"plain"`) | `items:[{count?, suffix?, value?, label}]` |
| `testimonial` | `single` · `cards` · `marquee` | single: `quote`, `author`, `rating?` · cards/marquee: `title`, `items:[{quote, author}]` (marquee = fileira infinita que corre, pausa no hover) |
| `gallery` | `collage` · `grid` · `strip` · `masonry` | `eyebrow`, `title`, `images:[]`, `soft?` |
| `bento` | (única) | `title`, `intro?`, `items:[{kind:"image"\|"stat"\|"quote"\|"text"\|"cta", ...}]` (3–6 tiles; grid editorial estilo 21st.dev — misture 1 foto + stat + quote + texto) |
| `beforeafter` | (única) | `before`, `after` (fotos), `beforeLabel?`, `afterLabel?`, `title`, `intro?` — slider interativo; ótimo pra estética/harmonização/odonto |
| `team` | (única) | `title`, `intro?`, `items:[{image, name, role}]` |
| `logos` | (única) | `title?` (ex: "Convênios aceitos"), `items:[]` (chips de texto: selos, convênios, associações) |
| `highlights` | (única) | `items:[{icon, label}]` — faixa fina de sinais de confiança (ex: "Estacionamento", "Emergência 24h") |
| `faq` | (única) | `eyebrow`, `title`, `items:[{q, a}]` (accordion nativo) |
| `banner` | (única) | `text` (faixa fina colorida), `cta?` |
| `cta` | `band` · `fullbleed` · `split` | `eyebrow`, `title`, `sub`, `cta`, `image?` (fullbleed) |
| `contact` | (única) | `eyebrow`, `title`, `address`, `phone`, `hours?` |
| `footer` | (única) | `sub`, `address`, `phone` |

Notas:
- `stats.items`: use `count` (número que conta na animação) OU `value` (texto fixo, ex "Savassi").
- `services.zigzag`: itens **com `image`** viram linhas grandes alternadas; itens **sem image** viram mini-grid.
- Em `cta`/`hero` `fullbleed`, passe `image` (vira fundo full-bleed com overlay).

## Regras (inviolável)
- **Copy honesta**, **fotos/nome reais**, **prova social do Google** em destaque, **rodapé Balmor** (o footer já põe).
- **Varie a ESTRUTURA por lead** — ordem das seções, variantes, quais seções entram. Dois leads do mesmo nicho NÃO podem ter a mesma espinha.
- Hero acima da dobra **sempre** com nome + CTA. WhatsApp do lead nos CTAs.

## Exemplo completo (Fialho Odontologia)
Ver `demos/fialho-odontologia/spec.json` no repo — é um exemplo real e válido (hero editorial,
ticker, manifesto, services zigzag, stats band, gallery collage, cta band, contact, footer).

## Fluxo
1. `demo-data <id> --site <url>` → pega meta + fotos + cor (MATERIAIS BRUTOS, não confirmados).
2. **BRIEF antes da spec** — cure as fotos, confirme a cor REAL pelo logo, **pesquise referências**
   (1+ do nicho e 1+ de fora do nicho que casa com a direção de arte) e escreva
   `demos/<slug>/BRIEF.md`. **O `demo-render` recusa renderizar sem o BRIEF.md.**
3. Escreva a spec (este formato) num arquivo `demos/<slug>/spec.json`.
4. `demo-similar <slug>` → garante estrutura diferente das demos anteriores.
5. `demo-render demos/<slug>/spec.json` → gera o `index.html`.
6. `verifica-interface` (gate, 4 viewports) + `qa-visual` + `design-critique` + checklist da skill
   `web-design-guidelines` → corrija até limpo E bonito.
7. `demo-publicar <slug> --scope balmor-s-projects` (o gate barra bug [ALTA]).
