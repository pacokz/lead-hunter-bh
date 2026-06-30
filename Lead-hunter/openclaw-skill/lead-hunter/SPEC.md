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
- `animations`: subconjunto de `["aurora","textgen","shimmer","parallax"]`.
  (reveal no scroll, contadores, ticker e hover já são automáticos.)

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
| `testimonial` | `single` · `cards` | single: `quote`, `author`, `rating?` · cards: `title`, `items:[{quote, author}]` |
| `gallery` | `collage` · `grid` · `strip` | `eyebrow`, `title`, `images:[]`, `soft?` |
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
1. `demo-data <id> --site <url>` → pega meta + fotos + cor.
2. Escreva a spec (este formato) num arquivo `demos/<slug>/spec.json`.
3. `demo-render demos/<slug>/spec.json` → gera o `index.html`.
4. `verifica-interface` (gate) + `design-critique` → corrija até limpo.
5. `demo-publicar <slug> --scope balmor-s-projects` (o gate barra bug [ALTA]).
