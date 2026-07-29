---
name: flush-memoria
description: "Destilar o que foi aprendido na sessão atual para o MEMORY.md antes da sessão ser compactada. Use quando o Samuel (ou o session-guard) pedir 'flush de memória', 'destile a sessão', 'atualize sua memória'. Também use por conta própria quando perceber que aprendeu algo que não pode ser perdido: uma decisão de design que funcionou, uma reprovação do Crítico que você não quer repetir, uma preferência do Samuel."
metadata: { "openclaw": { "emoji": "🧠" } }
---

# Flush de memória

A sessão de conversa é **descartável**. O `MEMORY.md` é o que sobrevive.

Quando esta skill é acionada, o contexto da sessão está perto do limite e vai ser
compactado. Tudo que estiver só na conversa e não no `MEMORY.md` **se perde**.

## O que fazer

1. Leia o `MEMORY.md` atual antes de escrever. Você vai **editar**, não recomeçar.
2. Releia a sessão e separe o que é **aprendizado durável** do que é **ruído da tarefa**.
3. Edite o `MEMORY.md` no lugar certo (as seções já existem — respeite-as).
4. Responda exatamente `FLUSH-OK` mais um resumo de uma linha do que você gravou.

## O que É aprendizado durável

- **Decisão de design que funcionou** — e por quê. "Grid assimétrico com foto sangrando
  na esquerda funcionou pra clínica; o Crítico deu 8.5 e o Samuel aprovou sem pedir ajuste."
- **Reprovação do Crítico** — o padrão que ela apontou, pra você não repetir. Isso é o
  mais valioso: é sua taxa de erro caindo.
- **Preferência do Samuel** — o que ele corrige em você mais de uma vez. Se ele mandou
  tirar travessão duas vezes, isso é regra, não pedido.
- **Gotcha técnico** — o comando que quebrou e a forma certa. "`demo-render` está
  depreciado e o gate visual reprova; a rota é escrever o `index.html` do zero."
- **Referência visual que rendeu** — o site/estúdio cujo padrão você conseguiu executar bem.

## O que NÃO é (não gaste linha com isso)

- Dados de um lead específico (nome, telefone, endereço) — isso vive no banco, não na sua memória.
- Narrativa cronológica do que você fez. `MEMORY.md` não é diário; as notas diárias em
  `memory/AAAA-MM-DD.md` cuidam disso.
- Conteúdo que você pode reler a qualquer momento: `SOUL.md`, `AGENTS.md`, o BRIEF de uma demo.
- Elogio genérico ("o Samuel gostou"). Sem o **motivo**, não serve pra nada.

## Formato

Uma entrada por aprendizado, curta, no imperativo ou no fato. Sem enfeite.

```markdown
## Design que funciona
- Foto sangrando na borda + tipografia serif em display ganhou nota 8.5 do Crítico
  (clínica odontológica, jul/2026). Repetir a estrutura, variar a paleta.

## O que o Crítico reprova
- Preview apontando pro domínio publicado em vez do arquivo da demo — vira blocker.
- Galeria com retrato de viagem em vez de foto do procedimento: ela cobra pertinência
  do acervo, não só qualidade da imagem.

## Samuel
- Não usa travessão. Não usa linguagem de IA. Cobra copy "amarradinha e realística".
```

## Limite

Mantenha o `MEMORY.md` **abaixo de 400 linhas**. Se passar, você não adiciona: você
**consolida**. Junte entradas que dizem a mesma coisa e apague a versão fraca. Memória
que cresce sem parar é o mesmo problema que a sessão gigante — só mais lento.
