# SUBAGENTES.md — A equipe interna da Nobara

> A Nobara **orquestra**, mas o trabalho pesado roda na sessão do subagente (não na dela — é o
> que impede a sessão dela de inchar). Cada subagente é headless: chamado por gateway, entrega um
> arquivo, encerra. Todos estão no `session-guard` e nos crons de memória.

## Os dois subagentes

| Agente | id | Faz | Lê | Escreve |
|---|---|---|---|---|
| 🎨 **Fundação** | `fundacao` | destila o BRIEF em vocabulário visual concreto (tokens + motion) | `demos/<slug>/BRIEF.md` + `refs/*.png` | `demos/<slug>/tokens.css` + `demos/<slug>/motion-spec.md` |
| 🔎 **Revisor** | `revisor` | QA barato ANTES do Crítico (gates + anti-vibe + anti-molde) | `demos/<slug>/index.html` + `BRIEF.md` | `demos/<slug>/_qa/revisao-interna.md` + veredito |

## O fluxo da Nobara com a equipe

```
BRIEF pronto (Nanami)
  └─► [1] invoca a Fundação ──► tokens.css + motion-spec.md
          └─► Nobara ESCREVE o index.html do zero usando tokens.css (não reinventa cor/fonte)
                └─► [2] invoca o Revisor ──► revisao-interna.md (PRONTO / VOLTA)
                        ├─ VOLTA ► Nobara corrige e re-invoca o Revisor
                        └─ PRONTO ► demo-publicar (Crítico independente + gates + deploy)
```

## Como é invocado (wiring B — no `lh.mjs`, determinístico, não depende da Nobora lembrar)

Os dois são disparados por gateway pelo próprio `lh.mjs` (igual o `demo-brief` faz com o Nanami) —
o trabalho pesado roda na sessão do subagente, não na da Nobora.

- **Fundação:** roda **automático no fim do `demo-brief`** (auto-chain). Assim que o BRIEF valida,
  a Fundação gera `tokens.css` + `motion-spec.md` e só então a Nobara é avisada. Não-bloqueante:
  se falhar, a Nobara extrai os tokens do BRIEF na mão. Re-rodar sozinho: `demo-fundacao <slug>`.
- **Revisor:** a Nobara roda `demo-revisao <slug>` depois de escrever o site (sai ≠ 0 se "VOLTA").
  E é **gate no `demo-publicar`**: roda antes do Crítico — bloqueia em "VOLTA PRA NOBORA",
  segue em erro de infra (o Crítico ainda julga depois). `--force` ignora.

```bash
demo-brief <slug>       # Nanami escreve o BRIEF  →  auto-chain: Fundação gera tokens.css + motion-spec.md
demo-fundacao <slug>    # (opcional) re-gera os tokens sozinho
demo-revisao <slug>     # Revisor: QA barato; "PRONTO PRO CRITICO" (exit 0) ou "VOLTA PRA NOBORA" (exit 1)
demo-publicar <slug>    # gates: brief → check.py → visual-gate → REVISOR → Crítico → deploy
```

## Regras
- **Por-lead, descartável.** `tokens.css` nasce do zero por lead e morre com a demo — nunca reusar
  entre leads (reuso = template → `visual-gate`/Crítico reprovam).
- **Fronteiras:** Fundação não constrói site; Revisor não edita nem dá nota final; a Nobara constrói
  e corrige; o Crítico julga.
- **Modelo:** os dois herdam a cadeia de fallback do default (sem `model` no `openclaw.json`).
