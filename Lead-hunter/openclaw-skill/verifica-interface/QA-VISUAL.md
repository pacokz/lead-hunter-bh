# QA-VISUAL — revisão visual estruturada (camada 4, por IA) + CRAFT SCORE

Depois do `verifica-interface` (check.py, determinístico) passar, rode `qa-visual.py <index.html>`
pra gerar os screenshots em `_qa/` (mobile, tablet, desktop). Então **olhe os 3 screenshots** e
produza o arquivo **`_qa/critique.json`** (o `demo-publicar` LÊ esse arquivo e bloqueia se faltar,
tiver blocker, ou nota < 7). Dois níveis, como manda o Codex:

## Nível 1 — BLOCKERS (bug objetivo → reprova direto)
Olhando mobile/tablet/desktop, tem algum destes? (cada um é um blocker)
1. texto cortado/sobreposto · 2. botão quebrado/ilegível · 3. imagem quebrada/distorcida/mal
cortada · 4. contraste ruim · 5. seção vazia · 6. **placeholder / stat "0" / número faltando** ·
7. **mobile quebrado** (colunas esmagadas, itens um sobre o outro, **arrasta pro lado**) ·
8. CTA ausente acima da dobra · 9. nome do negócio ausente/errado · 10. **cheiro de template**
(hero em moldura repetida, mesma animação de sempre).

## Nível 2 — CRAFT SCORE (0–10) — reprova se < 7
Dê UMA nota 0–10 avaliando (seja duro; 7 é o mínimo pra mostrar pro cliente):
- **Hierarquia** — tem uma decisão dominante clara? o olho sabe pra onde ir?
- **Espaçamento** — respiro proposital OU espaço morto/tudo espalhado?
- **Composição** — elementos ancorados e coesos OU flutuando soltos?
- **Originalidade** — parece feito sob medida OU molde recolorido?
- **Conversão/contexto (3º eixo)** — serve ESTE negócio? (ex.: nutri = confiança, acolhimento,
  método claro, prova social honesta, CTA certo — não é odonto recolorido).
Liste em `craft_issues` o que puxou a nota pra baixo (concreto, acionável).

## Saída OBRIGATÓRIA — escreva `demos/<slug>/_qa/critique.json`
```json
{
  "score": 8,
  "publishable": true,
  "blockers": [],
  "craft_issues": ["hero com muito espaço morto no mobile", "..."],
  "hero_strategy": "type-led",
  "image_treatment": "full-bleed atrás do texto"
}
```

## Regra de bloqueio (o `demo-publicar` aplica)
NÃO publica se: `blockers` não-vazio **OU** `score < 7`. Se bloquear: **corrija o HTML/CSS**
(não a spec — o site é escrito à mão), re-renderize, rode o QA de novo, até zero blocker e
`score >= 7`. Só então `demo-publicar`.

> Bug objetivo → `check.py` (nível 1, dentes). Craft/composição/contexto → esta camada (nível 2).
> Os dois têm que passar antes de mostrar pro Samuel. Craft não é opinião solta: é nota que barra.
