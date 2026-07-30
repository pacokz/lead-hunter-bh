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

## Como invocar (gateway, headless — igual o `demo-brief` faz com o Nanami)

```bash
openclaw agent --agent fundacao --json --timeout 600 --message \
  "Fundação: destile o BRIEF do demo '<slug>'. Leia demos/<slug>/BRIEF.md e OLHE demos/<slug>/refs/*.png. Escreva demos/<slug>/tokens.css + demos/<slug>/motion-spec.md conforme seu SOUL. Responda so 'fundacao pronta'."

openclaw agent --agent revisor --json --timeout 600 --message \
  "Revisor: revise o demo '<slug>'. Leia BRIEF + index.html, rode os gates objetivos, teste anti-vibe-code e anti-molde. Escreva demos/<slug>/_qa/revisao-interna.md e responda 'PRONTO PRO CRITICO' ou 'VOLTA PRA NOBORA' + o porque."
```

## Regras
- **Por-lead, descartável.** `tokens.css` nasce do zero por lead e morre com a demo — nunca reusar
  entre leads (reuso = template → `visual-gate`/Crítico reprovam).
- **Fronteiras:** Fundação não constrói site; Revisor não edita nem dá nota final; a Nobara constrói
  e corrige; o Crítico julga.
- **Modelo:** os dois herdam a cadeia de fallback do default (sem `model` no `openclaw.json`).
