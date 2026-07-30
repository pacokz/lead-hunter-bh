---
id: lLhkMOGU-1
missionId: lLhkMOGUaEQ8
titulo: Decisão de arquitetura: isolamento de sessão dos agentes
status: aberto
---

# Decisão de arquitetura: isolamento de sessão dos agentes

Preciso da sua opinião técnica. **NÃO altere código** — analise e recomende. Responda em português.

## Contexto do sistema

Projeto Lead Hunter BH (`C:\01-hermes`). **Produção roda numa VPS Linux** (`root@187.127.41.79`), não no Windows local — o OpenClaw local está congelado desde 30/jun e não atende o Discord.

Orquestrador: OpenClaw v2026.6.10 (`/usr/lib/node_modules/openclaw`), agentes com `agentRuntime: claude-cli` — cada turno é um subprocesso `claude -p --resume <sessionId>`.

Agentes: Sukuna (main), Yuji (comercial), Megumi (diagnosticador), **Nobara** (criadora), **Nanami** (diretor-arte), **Crítico**, e dois subagentes novos da Nobara: **Fundação** e **Revisor**.

Fluxo de uma demo, orquestrado por código em `Lead-hunter/openclaw-skill/lead-hunter/lh.mjs`:
```
demo-data (materiais reais)
  → demo-brief: Nanami escreve o BRIEF (2 passes, com screenshots reais de referências)
  → auto-chain: Fundação destila tokens.css + motion-spec.md
  → Nobara escreve index.html do zero
  → demo-revisao: Revisor faz QA barato
  → demo-publicar: gates objetivos + Crítico independente + deploy Vercel
```

## O problema

Duas pessoas (Samuel e o sócio) falam com a Nobara no **mesmo canal do Discord**. A sessão do OpenClaw é por canal: `agent:criadora:discord:channel:1520797308600455168`. Resultado: **uma fila só**.

Evidência real de hoje:
- 13:37 — pedi a ela republicar a demo `grupo-odontologico-carlos`
- 13:46 — o sócio pediu trabalho de logo no `heal-studio-ortodontia`
- Resultado: `index.html` do Carlos parado desde 13:24; HEAL reescrito às 13:52
- Log do gateway: `queueDepth=1 reason=queued_behind_active_work`

A republicação do Carlos **não falhou nem foi cancelada** — ela simplesmente não voltou.

Agrava: acabei de implementar `demo-auto <place_id>`, que dirige a Nobara em passos (escreve → corrige até 2× → publica) chamando `openclaw agent --agent criadora --session-key <key> --message ...`. Se um pedido humano chega no meio, entra na mesma sessão/fila e pode intercalar contexto.

## As duas opções

**(A) Sessão por trabalho** — cada demo numa session-key própria, ex. `agent:criadora:demo:<slug>`. O `openclaw agent` aceita `--session-key` arbitrária.

**(B) Canal por pessoa** — Samuel e sócio em canais distintos do Discord, gerando session keys distintas.

## Restrições que tornam a escolha não-óbvia

**1. Entrega no Discord exige TRÊS flags.** Pra Nobara responder no Discord: `--deliver`, `--reply-to channel:<id>` e `--reply-account nobara`. Sem `--reply-to` dá `Discord recipient is required`; sem `--reply-account` a mensagem sai pelo bot do **Sukuna** (aconteceu de verdade). Hoje o código deriva o destino do sufixo da própria session-key (`agent:criadora:discord:channel:<id>` → `channel:<id>`). Numa chave tipo `agent:criadora:demo:<slug>` **não existe destino derivável** — teria que ser passado explicitamente. Esse detalhe já causou um bug silencioso: o aviso automático rodava, a agente acordava e trabalhava, mas nada chegava no Discord.

**2. Contexto e custo.** Cada sessão claude-cli acumula contexto e é retomada via `claudeCliSessionId` em `~/.openclaw/agents/<id>/sessions/sessions.json`. Uma sessão da Nobara chegou a **840k tokens por turno** (4 min por resposta; qualquer 529 transitório da API matava o trabalho inteiro). Existe um cron `ops/session-guard.mjs` (a cada 15 min) que mede o contexto e, acima do limite (100k geral, 65k para Fundação/Revisor), manda o agente destilar a memória (skill `flush-memoria`) e rotaciona com `openclaw agent -m /reset`. **Mais sessões = mais superfície pro guard cobrir.**

**3. Memória.** Aprendizado durável vive em `MEMORY.md` por agente, alimentado pelo flush e por um cron de notas diárias a cada 3 dias.

**4. Os humanos precisam continuar conversando com ela naturalmente no Discord.**

## O que eu quero de você

Uma recomendação clara entre **(A)**, **(B)**, um **híbrido**, ou uma terceira opção que eu não enxerguei. Avalie explicitamente:

- isolamento de **fila** (um pedido não atropelar outro)
- isolamento de **contexto** (não misturar dois trabalhos na mesma sessão)
- como a **mensagem final chega no Discord** em cada caso
- impacto no **session-guard / custo de contexto**
- **modos de falha** de cada uma: o que quebra, e como se percebe que quebrou

Se quiser inspecionar: `Lead-hunter/openclaw-skill/lead-hunter/lh.mjs` (funções `avisarNobara`, `demo-auto`, `demo-brief`) e `Lead-hunter/ops/session-guard.mjs`. Você tem SSH como root na VPS se quiser ver a config real (`~/.openclaw/openclaw.json` do usuário `hermes`).

Quando terminar, chame `mcp__overclock__handoff_submit({summary, status:'done', artifacts})` como última ação — não apenas imprima a resposta e pare.

---
Worker contract (mandatory, in order):
1. pwd — confirm the repo.
2. Read the pointed item (+ parent item if a slice, for context).
3. Execute strictly within the item's file scope.
4. Write the result back into the item (Correção/notas + session id).
5. Commit with pathspec citing the item ID — this commit is PRE-AUTHORIZED by this contract; do not ask permission, do not wait to be asked.
6. handoff_submit as your last action.

## Resultado

<!-- worker: escreva o resultado aqui, depois handoff_submit({ briefId: "lLhkMOGU-1", summary, status }) -->

### Recomendação

Adotar um **híbrido orientado a trabalho**:

1. Manter as sessões naturais do Discord para conversa humana, uma por canal, como já ocorre.
2. Executar cada `demo-auto` numa **sessão efêmera própria por execução**, não apenas por slug: por exemplo `agent:criadora:demo:<slug>:<run-id>`.
3. Separar a identidade de execução da rota de resposta. No início do job, registrar explicitamente `replyChannel=discord`, `replyTo=channel:<id>` e `replyAccount=nobara`; usar esses valores na mensagem terminal. Nunca inferir o destinatário da `session-key` nem procurar a sessão de Discord “mais recente”.

Portanto, **A é a base da solução**. B pode melhorar a organização das conversas entre Samuel e o sócio, mas não resolve o problema arquitetural da automação e não deve ser o mecanismo de isolamento dos jobs.

### Por que não escolher somente B

Dois canais geram duas filas e dois contextos, então um pedido de Samuel deixa de bloquear um pedido do sócio. Porém, o `demo-auto` de uma pessoa ainda disputa a mesma fila com qualquer mensagem humana enviada por ela naquele canal. Além disso, `avisarNobara` procura hoje a sessão Discord atualizada mais recentemente. Com dois canais, tanto o contexto usado pelo job quanto o destinatário final passam a depender de quem falou por último; o aviso pode ir para a pessoa errada.

B também fragmenta o histórico da Nobara em duas conversas longas e não elimina crescimento de contexto. O `session-guard` atual só observa a entrada mais recentemente atualizada de cada agente, logo já não administraria corretamente as duas sessões.

### Avaliação explícita

| Critério | A: sessão por trabalho | B: canal por pessoa | Híbrido recomendado |
|---|---|---|---|
| Isolamento de fila | Isola jobs entre si e das conversas, desde que a fila do OpenClaw seja realmente indexada pela chave. A instalação indica lanes “session-keyed”; convém validar com dois jobs sintéticos antes do rollout. | Isola Samuel do sócio, mas não isola automação de conversa dentro do mesmo canal. | Isola jobs por `run-id` e preserva filas conversacionais separadas. |
| Isolamento de contexto | Forte: cada execução começa limpa e não recebe pedidos humanos. Usar só `<slug>` não basta, pois republicações acumulam contexto e duas execuções simultâneas do mesmo slug colidem. | Parcial: separa pessoas, mas mistura todos os trabalhos e conversas de cada pessoa. | Forte nos jobs; o aprendizado durável continua no `MEMORY.md`, não no transcript do job. |
| Entrega no Discord | A chave não contém destino. A entrega precisa receber explicitamente as três informações: `--deliver`, `--reply-to channel:<id>` e `--reply-account nobara` (idealmente também `--reply-channel discord`). | É fácil derivar o canal da chave, mas essa conveniência acopla transporte e execução e o seletor “mais recente” pode escolher o canal errado. | A rota é capturada na criação do job e reutilizada no estado terminal. O job silencioso não entrega etapas; sucesso ou falha entrega uma única mensagem ao canal de origem. |
| Contexto/custo | Cada job começa barato, mas cria mais registros/transcripts. Sem ciclo de vida, vira vazamento de sessões. | Poucas sessões, porém longas e caras; preserva o risco de voltar a centenas de milhares de tokens. | Contexto curto por job, sessões terminais resetadas/arquivadas e uma sessão conversacional por canal sob limite. |
| Memória | Sessões novas leem a memória durável do agente, mas flushes concorrentes no mesmo `MEMORY.md` podem disputar escrita. | O aprendizado fica espalhado em transcripts; o `MEMORY.md` continua comum. | Jobs são efêmeros. Aprendizados do job devem ser consolidados de forma serializada numa memória comum, com lock/atomicidade, e não por vários flushes simultâneos. |

### Impacto obrigatório no `session-guard`

Não é seguro ativar A em produção mantendo o guard como está. A inspeção de `session-guard.mjs` mostra que:

- `bindingAtual()` ordena as entradas e retorna somente a sessão mais recente do agente;
- estado e cooldown são indexados apenas por `agentId`, não por `sessionKey`;
- flush e `/reset` são chamados sem `--session-key`, portanto podem operar na sessão default/mais recente, não necessariamente naquela que excedeu o limite;
- a validação pós-reset consulta novamente apenas a entrada mais recente;
- `ocupado()` usa um `pgrep` global e adia todo o guard quando qualquer `claude -p` está ativo.

O guard precisa passar a enumerar todas as sessões com binding, medir e agir por `(agentId, sessionKey)`, chamar flush/reset explicitamente na mesma chave e manter cooldown por chave. Sessões de job devem ter política própria: limite menor, TTL e encerramento no estado terminal. O guard nunca deve resetar uma lane ativa. Para evitar corrida no `MEMORY.md`, flush/consolidação deve usar exclusão mútua por agente ou uma única sessão consolidadora.

Isso aumenta a superfície operacional, mas de modo controlável: limitar a concorrência da Nobara, reter apenas metadados e logs por prazo definido e remover/resetar bindings terminais. O ganho é que o custo de cada turno deixa de crescer indefinidamente.

### Modos de falha e observabilidade

**A — sessão por trabalho**

- Rota ausente ou uma das flags de entrega faltando: o site pode ficar pronto e ninguém ser avisado. Detectar por estado `completed_but_undelivered`, captura de `stdout/stderr` e confirmação explícita de entrega; exit code zero sozinho não basta.
- Chave digitada de forma diferente entre etapas: nasce outra sessão, perde-se contexto e o fluxo parece “esquecer”. Detectar registrando `run-id`, chave canônica e etapa em toda chamada.
- Sessões órfãs ou caras: o job termina/falha, mas o binding permanece. Detectar por inventário de sessões com idade, tokens, estado do job e alerta de TTL.
- Dois jobs para o mesmo slug: a fila fica isolada, mas o filesystem não; ambos podem editar `demos/<slug>/index.html`. Impedir com lock por slug/idempotency key.
- Limite global de processos/API: filas distintas não eliminam rate limit ou limite de concorrência. Detectar separando métricas de “queued na lane”, “aguardando semáforo global”, 429/529 e timeout.

**B — canal por pessoa**

- Pedido humano e automação da mesma pessoa continuam serializados/intercaláveis. Aparece novamente como `queued_behind_active_work` na chave daquele canal.
- O canal mais recente pode receber o job ou a resposta de outro solicitante. Detectar comparando `requestedBy/replyTo` persistidos com o destino efetivo; não há correção confiável se o destino continuar sendo inferido.
- Uma sessão cresce e o guard só enxerga a outra. Detectar enumerando todas as entradas, não só a mais recente.
- Trabalho iniciado num canal e cobrado no outro fragmenta contexto e pode causar duplicação; um `job-id` compartilhado precisa ser a fonte de verdade.

**Híbrido**

- O principal risco é perder o vínculo `job -> solicitante -> rota`. Tornar esse vínculo obrigatório e persistente antes de iniciar qualquer etapa; sem rota válida, o job deve falhar cedo.
- A mensagem final pode falhar depois de o deploy ter sucesso. Entrega deve ser uma etapa terminal reexecutável e idempotente, com retries limitados e alerta alternativo.
- O job pode morrer entre etapas. Persistir uma máquina de estados (`queued/running/<etapa>/succeeded/failed/delivery_pending/delivered`) e ter watchdog por ausência de progresso.

### Desenho operacional sugerido

O comando que inicia o trabalho deve criar um envelope imutável semelhante a:

```text
jobId, slug, requestedBy, jobSessionKey,
replyChannel=discord, replyTo=channel:<id>, replyAccount=nobara,
createdAt, currentStage, status
```

Todas as chamadas agenticas da Nobara usam `jobSessionKey`. Passos intermediários usam a mesma chave sem `--deliver`. A etapa terminal usa a rota explícita registrada; jamais consulta “último canal ativo”. Se possível, a notificação final pode ser enviada diretamente pelo adaptador do Discord, sem gastar mais um turno agentico; se precisar sair pela Nobara, usar a sessão do job com as flags explícitas.

Fazer o rollout em três gates:

1. Primeiro, tornar destino e identidade do job explícitos e adicionar estados/observabilidade.
2. Depois, adaptar o guard e validar em staging que duas chaves distintas executam sem compartilhar fila/contexto e que o reset atinge apenas a chave pedida.
3. Só então habilitar concorrência, inicialmente baixa, com lock por slug e teste real de entrega por cada conta/canal.

### Decisão final

**Escolher A por execução, combinada com sessões conversacionais normais e rota de Discord explícita — o híbrido acima.** Não escolher B como solução principal. E não habilitar múltiplas sessões de job antes de corrigir conceitualmente a cobertura do `session-guard`; do contrário, o sistema troca uma fila única visível por várias sessões caras e silenciosamente desgovernadas.

Sessão do worker: `CODEX_THREAD_ID=019fb359-50c3-72f1-b51a-aec06862b2de`, `OVERCLOCK_PANE_ID=pane-292`.
