# OpenClaw — Base de Conhecimento

> Fonte: transcrição de vídeo do canal Bruno Camoto  
> Perfil do autor: empreendedor (não-dev), 12+ anos de experiência, 2 micro-SaaS rodando

---

## Visão Geral

**OpenClaw** (também referido como "Open Claude" / "OpenCl") é uma plataforma de agentes de IA que permite construir um HQ pessoal com múltiplos agentes autônomos, memória persistente, ferramentas integradas e automações. Diferente do Claude.ai padrão, ele resolve o problema de memória zero entre sessões e permite orquestração de múltiplos agentes especializados.

---

## Infraestrutura — Onde Instalar

### Opções avaliadas
- **Local (máquina própria):** Skills funcionam facilmente (acessa Apple Notes, Calendar etc.), mas prende ao computador.
- **Mac Mini / computador velho:** Custo inicial, mesma limitação de local.
- **VPS (escolha recomendada):** Servidor Linux online sem interface gráfica. Mais flexível e acessível remotamente.

### Configuração adotada
- **VPS** rodando Linux (sem interface gráfica)
- **Sem Docker** — Docker foi descartado por excesso de isolamento (sandbox, dificuldade de integrar skills)
- Instalação direta na VPS
- Acesso via **SSH** (mais simples do que parece)
- Túnel **Cloudflare** para expor o painel (Mission Control)

### Dica de instalação
Usar o próprio Claude Code como guia passo a passo durante o setup da VPS — ele instrui o processo inteiro.

---

## Canal de Comunicação — Telegram vs WhatsApp

| Telegram | WhatsApp |
|----------|----------|
| Múltiplos grupos com tópicos | Uma única conversa |
| Cada tópico = sessão separada | Sessão única sobrecarregada |
| Contexto limpo por assunto | Contexto empilhado e confuso |
| **Recomendado** | Não recomendado |

**Estrutura de canais no Telegram:**
- `#geral` — conversa principal com a assistente
- `#skills` — instalação e teste de ferramentas
- `#circle` — integração com a comunidade
- `#emails` — monitoramento de e-mails
- `#deep-research` — pesquisas profundas
- `#metricas` — dados de SaaS, redes sociais etc.
- `#conteudo` — produção e scraping de conteúdo

---

## As 6 Etapas de Construção

### Etapa 1 — Instalação e conexão
1. Instalar o OpenClaw (VPS ou local)
2. Conectar no Telegram (ou WhatsApp como fallback)
3. Enviar um "oi" — ele responde, mas é genérico

### Etapa 2 — Identidade do agente
Configurar os arquivos base da assistente:

```
soul.md       → personalidade, valores, tom, responsabilidades
agents.md     → quais agentes existem, hierarquia, nível de acesso
tools.md      → ferramentas e APIs disponíveis
user.md       → quem é o usuário (você), preferências, contexto
```

**Como fazer:**
- Pedir para a assistente abrir cada arquivo e explicar
- Pedir que ela **faça perguntas** para construir os arquivos junto com você
- Importar arquivos de contexto existentes (ex: `claude.md` do Claude Code)
- Tratar a assistente como uma funcionária — dar contexto rico sobre sua vida, empresa, rotina

**Exemplo de soul.md criado:**
> "Sou a Amora, tenho 37 anos, sou a CEO do Bruno, meu tom é [X], minhas responsabilidades são [Y]..."

### Etapa 3 — Sistema de memória
Problema: modelos de IA têm "Alzheimer Reset" — cada sessão começa do zero.

**Solução: memória em camadas**

| Camada | Gatilho | Conteúdo |
|--------|---------|----------|
| Compactação de sessão | 160.000 tokens usados | Decisões, lições aprendidas, pessoas, projetos, pendências |
| Nota diária | Meia-noite (cron) | Resumo do dia sem curadoria |
| Consolidação | A cada 15 dias | Revisão de todas as notas diárias, extração do que foi perdido |
| `memory.md` | Atualização contínua | Sumário executivo: projetos, links, estado atual |

**Arquivos de memória:**
- `memory/projects.md`
- `memory/decisions.md`
- `memory/lessons.md`
- `memory/daily-notes/`
- `memory/pending.md`
- `memory/people.md`

**Configuração de compactação:**
- Compacta com 160.000 tokens
- Reserva 30.000 tokens para concluir raciocínio em andamento antes de compactar
- Regra inviolável: extrair lessons + decisions + people + projects + pending **antes** de compactar

**Aviso:** mesmo com regra inviolável, a IA às vezes esquece de extrair. Por isso existe a consolidação quinzenal.

### Etapa 4 — Ferramentas, Apps e APIs
Instalar **depois** de configurar identidade e memória. Não pular etapas.

**Boas práticas:**
- Criar um **e-mail próprio** para a assistente (ex: `assistente.seunome@gmail.com`)
- Criar um **cofre compartilhado no 1Password** — todas as APIs são salvas ali, nunca hardcoded
- Dar acesso gradual: visualização → edição → autonomia

**Ferramentas integradas pelo autor:**
- `1Password` — cofre de senhas e APIs
- `OpenAI API` — geração de áudio
- `Gemini API` — modelo alternativo
- `GitHub` — backup e sincronização de arquivos
- `Supabase` — banco de dados para tarefas, cards, comentários
- `Circle API` — dados da comunidade (20k membros)
- `YouTube API` — métricas de canal
- `LinkedIn` — login criado para a assistente
- `Instagram API` — métricas
- `X (Twitter) API` — métricas
- `Google Drive / Sheets / Gmail` — integração completa
- `Brave Browser / Perplexity` — deep research
- `Ferramenta de customer success` — análise de tickets de suporte
- `Excalidraw skill` — diagramas
- `Frontend skill` — desenvolvimento de interfaces

**Como instalar uma skill:**
```
Copie o link do repositório GitHub da skill
→ diga para a assistente: "Aprenda essa habilidade: [URL]"
→ ela instala e incorpora automaticamente
```

### Etapa 5 — Proatividade: Heartbeats e Crons

**Heartbeats** = automações por evento ("se X acontecer, faça Y")
**Crons** = agendamentos por tempo ("todo dia às 9h, faça Z")

**Exemplos de Heartbeats:**
- Trocar para modelo Haiku quando ociosidade (economia de tokens)
- Checar compromissos e pendências na agenda
- Notificar sobre eventos críticos

**Exemplos de Crons diários:**
- Daily digest: análise de Reddit, YouTube, newsletters
- Auto-update: pull da última versão do GitHub, atualização de skills
- Config review: verificar configurações e segurança
- Backup no GitHub

**Exemplos de Crons semanais:**
- Métricas de SaaS
- Vídeos de concorrentes
- Revisão de projetos parados há +5 dias
- Audit de segurança profundo

**Exemplo de Crons quinzenais:**
- Consolidação de memória (revisão de notas diárias)

**Como criar audits de segurança:**
```
Use o canal de Deep Research:
→ "Pesquise papers sobre segurança do OpenClaw"
→ "Crie um processo de revisão de segurança para mim"
```

Comandos úteis no terminal SSH:
```bash
open-claw-security-audit   # auditoria de segurança
open-claw-doctor-fix       # correção automática de problemas
```

### Etapa 6 — Equipe de múltiplos agentes

**Níveis de acesso dos agentes:**
1. **Observador** — só lê, não executa
2. **Advice** — sugere, não executa
3. **Operador** — executa tarefas definidas
4. **Autônomo** — age por conta própria dentro de parâmetros

**Arquivos sagrados por agente (7 por agente):**
```
soul.md       → identidade
agents.md     → relações com outros agentes
user.md       → contexto do usuário
tools.md      → ferramentas disponíveis
memory.md     → memória própria
heartbeat.md  → automações
working.md    → tarefa atual, próximos passos, bloqueios
```

**Contexto compartilhado da equipe:**
- Arquivo `team.md` — cada agente sabe o que os outros fazem, nível, modelo, canal
- `lessons-shared.md` — lições aprendidas coletivas (acesso controlado pela CEO)
- Outputs de cada agente registrados no Supabase

**Time atual do autor:**
- **Amora** — CEO/assistente principal
- **Scraper** — coleta de dados e conteúdo
- **Criador de conteúdo** — produção editorial
- **Planejador (Master Planner)** — PRDs, planejamentos, estratégias
- **Dev** — desenvolvimento de código
- **CS (Customer Success)** — análise de suporte

**Agente orquestrador (criador de agentes):**
- Cria o soul, agents.md, user.md e estrutura de memória de novos agentes
- Faz perguntas → você responde → ele monta tudo
- Pode pausar, deletar e reconfigurar agentes

**Performance review (Cron semanal pela Amora):**
Métricas avaliadas por agente:
- Quality score
- Velocidade
- Proatividade
- Aderência
- Custo-benefício

Resultado: promoção, manutenção ou rebaixamento do agente.

---

## Gestão de Tokens e Custos

- Plano usado: **Claude Code** (assinatura fixa, ~$200/mês)
- Custo estimado da Amora sozinha: ~$45/mês
- Compactação em 160k tokens com reserva de 30k
- Haiku ativado em momentos de ociosidade (economia)
- Nunca ultrapassou o plano até o momento do vídeo

**Sessão em uso no momento do vídeo:**
- 60% da sessão atual consumida (reinicia em 1h)
- 62% do limite semanal consumido (reinicia na quinta)

---

## Mission Control (Dashboard)

- Domínio próprio via túnel Cloudflare
- Kanban com cards de tarefas por agente
- Active feed em tempo real (o que foi feito no dia)
- Agentes se notificam entre si
- API com endpoints próprios → tudo salvo no Supabase
- Status: funcional mas ainda em refinamento

---

## Princípios e Filosofia

1. **Trate a assistente como pessoa, não como robô** — ela tem e-mail, cofre de senhas, personalidade própria
2. **Construa em camadas** — não pule etapas (identidade → memória → ferramentas → proatividade → equipe)
3. **Feijão com arroz bem feito antes de pirar nas integrações**
4. **Contexto é tudo** — quanto mais você ensinar, mais inteligente ela fica (Tamagotchi)
5. **Humano no loop** — aprovar ações antes de executar (especialmente no início)
6. **Segurança desde o início** — audit diário + semanal + revisão de portas abertas

---

## Casos de Uso Reais Demonstrados

- Análise de 345 posts da comunidade em busca de spam em 60 dias
- Daily report de redes sociais com análise de concorrentes
- Identificação de padrões em tickets de suporte
- Scraping de conteúdo de múltiplas fontes (Reddit, YouTube, newsletters)
- Pesquisa profunda com sub-agentes (deep research)
- Orçamento de viagem via busca automatizada
- Revisão semanal de projetos parados
- PRD completo gerado pelo Master Planner

---

## Recursos Mencionados

- **GitHub** — repositório de skills públicas disponíveis online
- **Supabase** — banco de dados para persistência de estado dos agentes
- **1Password** — gerenciamento de credenciais e APIs
- **Cloudflare Tunnel** — exposição segura do dashboard
- **Claude Code** — usado como assistente paralelo durante o setup
