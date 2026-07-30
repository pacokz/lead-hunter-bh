# Cota da conta — o gargalo real da operação

> Escrito em 30/07/2026, depois de a operação ficar **2 horas congelada** (15:48→17:50 UTC) sem
> ninguém entender o porquê.

## O que aconteceu

A cadeia de uma demo morreu com:

```
FallbackSummaryError: All models failed (3):
  anthropic/claude-opus-4-8: You've hit your session limit · resets 5:50pm (UTC)
  anthropic/claude-opus-4-7: idem
  anthropic/claude-sonnet-4-6: idem
```

**Limite de sessão é da CONTA, não do modelo.** A cadeia de fallback protege contra indisponibilidade
de um modelo específico (comprovado no mesmo dia: um 529 no opus-4-8 caiu pro 4-7 e completou em 11s),
mas contra teto de conta ela é inútil — só soma latência e queima tentativa.

Medido no journal daquele dia: **21 tentativas falhas até o reset, 14 delas fallback redundante.**

## Os números que importam

Do dia inteiro, até 18:02 UTC:

```
108 execuções · 86 sucessos · 22 falhas
manutenção:  45/86 = 52,3%   (32 heartbeats + 13 flushes)
trabalho:    41/86 = 47,7%
por modelo:  85 Opus 4.8 · 1 Opus 4.7 · 0 Sonnet
```

Duas conclusões:

1. **Mais da metade do consumo era manutenção**, não produção.
2. **O tiering de modelo existia no papel e não na prática** — praticamente tudo em Opus.

Custo real de uma demo completa: **~16 turnos** (12 funcionais + 4 flushes da própria demo), não os
~10 que se supunha.

## A regra operacional

**A cota é uma janela móvel de 5 horas, não um orçamento mensal.** Portanto:

- Uma demo comercial isolada cabe numa janela.
- **Uma demo + testes/regressões pesados na mesma janela NÃO cabem.** Foi exatamente essa combinação
  que estourou a conta em 30/07.
- "20 demos/mês" só é viável se **distribuídas** — cerca de uma por dia útil, sem desenvolvimento
  pesado concorrente.

Antes de rodar bateria de testes ou regressão que dispare agentes, verifique se há demo comercial em
andamento ou prevista para a mesma janela. Se houver, espere.

## O que o código faz agora

`openclaw-skill/lead-hunter/quota.mjs` — circuit breaker:

- reconhece o erro de limite de conta na saída do `openclaw agent`;
- extrai o horário de reset informado pelo próprio provedor (sem horário, assume janela de 5h);
- grava `~/logs-ops/quota-state.json` e **impede novas chamadas** até o reset;
- fecha o circuito sozinho se a conta responder antes do previsto.

Está ligado em **todos** os pontos que chamam agente no `lh.mjs` (Nanami ×2, Fundação, Revisor,
Crítico, aviso da Nobara) e no `ops/session-guard.mjs` — que pula o ciclo inteiro, porque rotacionar
sessão exige flush, e flush exige cota.

Efeito prático: em vez de 21 tentativas condenadas espalhadas por 2 horas, o sistema falha **uma vez**,
registra até quando, e para.

## O que ainda falta (não implementado)

- **Admission controller**: antes de começar uma demo, reservar capacidade para o caminho nominal +
  1 correção + Crítico. Hoje o breaker é reativo — evita desperdício depois do estouro, mas não
  impede começar uma demo que não vai ter fôlego para terminar.
- **Telemetria de consumo ponderado** com alerta em 60/75/90%, para avisar antes do teto.
- **Tiering preventivo** (Fundação/Revisor em Sonnet, correções localizadas em modelo menor).
- **Pool de capacidade separado** para jobs headless, para uma fábrica de demos não derrubar o canal
  de conversa dos donos.
