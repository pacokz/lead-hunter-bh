# Lead Hunter BH

O **Lead Hunter BH** e uma plataforma de prospeccao comercial para encontrar pequenos negocios em Belo Horizonte que tem potencial para comprar um site novo.

A ideia e simples: encontrar empresas reais, avaliar se elas tem uma presenca digital fraca, priorizar as melhores oportunidades e preparar um pacote de abordagem para vender site de forma personalizada.

O foco nao e volume bruto. O foco e achar bons leads.

---

## O problema

Muitos negocios locais tem boa reputacao, clientes reais e muitas avaliacoes no Google, mas tem uma presenca digital ruim:

- nao tem site;
- usam so Instagram ou Linktree;
- tem site fora do ar;
- tem site antigo, lento ou ruim no celular;
- nao tem botao claro de WhatsApp;
- nao passam confianca online.

Esses negocios sao bons candidatos para comprar um site profissional.

---

## O que o projeto faz

O Lead Hunter BH automatiza a parte de pesquisa, triagem e preparacao comercial.

O fluxo principal e:

```text
Buscar negocios no Google
  -> salvar os leads
  -> auditar o site
  -> calcular score de oportunidade
  -> colocar os melhores no CRM
  -> gerar rascunho de abordagem
  -> criar uma previa de site personalizada
  -> Samuel envia manualmente pelo WhatsApp/Instagram
```

---

## Como os leads sao encontrados

A plataforma usa a **Google Places API** para buscar negocios por categoria e regiao.

Exemplos:

- dentistas na Savassi;
- clinicas no Funcionarios;
- restaurantes em Lourdes;
- estetica no Buritis;
- oficinas em Belo Horizonte.

Cada resultado e salvo usando o `place_id` do Google, evitando duplicacao.

A plataforma coleta dados como:

- nome do negocio;
- categoria;
- endereco;
- telefone;
- site;
- nota no Google;
- quantidade de avaliacoes;
- link do Google Maps;
- localizacao;
- status do negocio.

---

## Auditoria do site

Depois que um lead e encontrado, o sistema verifica a presenca digital dele.

Ele classifica o site em categorias como:

- `SEM_SITE`
- `FORA_DO_AR`
- `REDE_SOCIAL`
- `SITE_OBSOLETO`
- `SITE_FRACO`
- `SITE_RAZOAVEL`
- `SITE_BOM`

A auditoria verifica:

- se o negocio tem site;
- se o site esta online;
- se usa HTTPS;
- se parece responsivo;
- se tem titulo e meta description;
- se tem formulario;
- se tem WhatsApp;
- se o site e apenas Instagram, Facebook ou Linktree;
- se ha links de redes sociais;
- se da para extrair o Instagram.

Alem disso, existe uma auditoria visual com Playwright, que abre o site em navegador real e tira screenshots em desktop e mobile.

Ela detecta problemas como:

- site lento;
- layout quebrado no celular;
- overflow horizontal;
- pagina vazando para os lados;
- prints desktop e mobile para revisao.

---

## Score de oportunidade

Cada lead recebe um score deterministico de 0 a 100.

O score nao e uma opiniao da IA. Ele e calculado por regras fixas.

A pontuacao considera:

- qualidade/oportunidade do site atual;
- quantidade de avaliacoes no Google;
- nota media;
- presenca de telefone ou Instagram;
- prioridade do segmento.

Exemplo de logica:

- empresa sem site ganha muitos pontos;
- empresa com muitas avaliacoes ganha pontos;
- empresa bem avaliada ganha pontos;
- empresa com telefone/Instagram e mais facil de abordar;
- segmentos mais valiosos tem peso maior.

As faixas sao:

- `PRIORIDADE`
- `ALTO_POTENCIAL`
- `REVISAR`
- `BAIXO_POTENCIAL`
- `DESCARTAR`

A ideia e encontrar negocios consolidados, com reputacao real, mas presenca digital fraca.

---

## CRM

Os melhores leads entram em um CRM visual.

O CRM tem estagios como:

- novo;
- qualificado;
- demo pronta;
- contato pendente;
- contatado;
- follow-up;
- respondeu;
- reuniao;
- ganho;
- perdido.

O Samuel move os leads manualmente conforme a conversa evolui.

A plataforma tambem permite:

- registrar interacoes;
- agendar follow-ups;
- marcar follow-up como concluido;
- ver uma agenda global de proximos contatos.

---

## Abordagem comercial

O sistema gera rascunhos de abordagem para WhatsApp.

Mas ele **nao envia nada automaticamente**.

O Samuel revisa, ajusta e envia manualmente.

Exemplo de abordagem:

> Ola! Tudo bem? Encontrei a clinica de voces aqui em BH, vi que tem muitas avaliacoes no Google e percebi que o site atual poderia passar mais confianca. Montei uma previa de como ficaria um site novo para voces. Posso te mostrar?

O objetivo e facilitar a preparacao, nao automatizar spam.

---

## Demos personalizadas de site

Uma parte central do projeto e gerar uma previa de site para leads quentes.

Em vez de mandar uma proposta generica, o Samuel consegue mandar algo como:

> "Fiz uma previa de como poderia ficar o site da sua clinica."

Isso aumenta muito a percepcao de valor.

As demos usam:

- nome real do negocio;
- telefone real;
- endereco real;
- nota e avaliacoes do Google;
- fotos reais quando disponiveis;
- cor da marca quando detectada;
- estilo visual adaptado ao segmento.

---

## Arquitetura das demos

A arquitetura escolhida e **SPEC -> RENDER**.

Ou seja:

1. A agente criativa, chamada Nobara, escreve uma spec JSON com as decisoes criativas.
2. Um renderizador em Node transforma essa spec em HTML.
3. O site passa por QA visual.
4. Se estiver aprovado, pode ser publicado na Vercel.

A Nobara nao precisa escrever o HTML inteiro do zero.

Ela define coisas como:

- conceito visual;
- paleta;
- tipografia;
- ordem das secoes;
- estilo do hero;
- quais fotos usar;
- copy;
- depoimentos;
- servicos;
- CTA;
- galeria;
- FAQ;
- contato.

Isso evita estourar limite de output do agente e deixa o resultado mais confiavel.

---

## QA das demos

Antes de publicar uma demo, ela passa por um verificador visual.

Esse QA abre a pagina em navegador real e verifica:

- desktop;
- mobile;
- imagens quebradas;
- erro de JavaScript;
- texto placeholder;
- CTA sem link;
- overflow horizontal;
- secoes vazias;
- contraste ruim;
- elementos sobrepostos.

Se encontrar problema grave, a publicacao e bloqueada.

A ideia e evitar mandar para um lead uma previa bonita, mas quebrada no celular.

---

## Frontend

O projeto tem um painel web em Next.js.

Telas principais:

- dashboard geral;
- lista de leads;
- detalhe do lead;
- campanhas;
- jobs de busca;
- configuracoes;
- CRM;
- follow-ups.

No detalhe do lead e possivel ver:

- dados do Google;
- score;
- componentes do score;
- auditoria do site;
- problemas encontrados;
- screenshots desktop/mobile;
- rascunhos de abordagem;
- follow-ups.

---

## Backend

O backend e em FastAPI com Postgres.

Ele cuida de:

- campanhas de busca;
- jobs da Google Places API;
- persistencia dos leads;
- deduplicacao;
- controle de cota;
- auditoria de site;
- score;
- CRM;
- outreach;
- follow-ups;
- logs operacionais.

O banco e a fonte da verdade.

Os agentes nao devem escrever SQL direto. Eles operam por comandos e endpoints controlados.

---

## Stack tecnica

Principais tecnologias:

- FastAPI;
- PostgreSQL;
- SQLAlchemy;
- Alembic;
- Docker;
- Next.js 15;
- React 19;
- Tailwind;
- TanStack Query;
- Playwright;
- Google Places API New;
- Node.js para CLI/renderizacao de demos;
- Vercel para publicar previas.

---

# Estrutura OpenClaw

O OpenClaw entra como a camada de **orquestracao por agentes**.

Ele nao substitui o backend. O backend continua sendo a fonte da verdade. O OpenClaw opera a plataforma por comandos e ferramentas controladas.

A divisao correta e:

```text
OpenClaw
  -> agentes inteligentes
  -> chamam skills/comandos
  -> comandos chamam backend FastAPI
  -> backend aplica regras e salva no Postgres
```

Ou seja: o agente decide o que fazer, mas quem executa mudancas reais e o sistema deterministico.

---

## Por que usar OpenClaw

O OpenClaw serve para transformar a operacao em uma equipe de agentes especializados.

Em vez de um unico bot tentar fazer tudo, cada agente tem um papel:

- buscar leads;
- auditar sites;
- analisar oportunidades;
- criar demos;
- preparar abordagem;
- revisar qualidade;
- gerar relatorios;
- sugerir melhorias.

Isso deixa a operacao mais parecida com uma pequena equipe comercial/tecnica automatizada.

---

## Principio tecnico principal

A regra mais importante:

```text
Agente nao escreve direto no banco.
Agente nao inventa dado.
Agente nao envia mensagem automaticamente.
Agente chama ferramentas controladas.
```

Isso evita:

- dados falsos;
- SQL perigoso;
- duplicacao;
- envio indevido para leads;
- gasto acidental de API;
- demos publicadas com bug.

---

## Backend como fonte da verdade

O Postgres guarda:

- leads;
- campanhas;
- jobs;
- auditorias;
- scores;
- CRM;
- follow-ups;
- interacoes;
- demos;
- logs;
- erros de agentes;
- uso de API;
- configuracoes.

O OpenClaw nunca deveria "lembrar" sozinho o estado real da operacao.

Se o Samuel pergunta "quais leads atacar hoje?", o agente deve consultar o backend.

Se o Samuel pergunta "qual o status da operacao?", o agente deve rodar o comando de status.

Se o Samuel pede contexto de um lead, o agente deve puxar `/leads/{id}/context`.

---

## Skill principal: lead-hunter

A principal skill do OpenClaw e `lead-hunter`.

Ela expoe comandos Node para operar o backend:

```bash
node C:\01-hermes\Lead-hunter\openclaw-skill\lead-hunter\lh.mjs <comando>
```

Comandos importantes:

- `status`: mostra visao geral da operacao;
- `leads [N]`: mostra top leads ranqueados;
- `lead <id>`: mostra contexto completo de um lead;
- `draft <id>`: gera rascunho de abordagem;
- `crm`: lista leads no pipeline comercial;
- `promote`: promove leads quentes para o CRM;
- `audit-run`: audita leads pendentes;
- `score-run`: calcula score de leads pendentes;
- `audit <id>`: roda auditoria com screenshot visual;
- `demo-data <id>`: coleta dados, fotos e cor da marca para criar demo;
- `demo-render <spec.json>`: renderiza demo a partir de SPEC;
- `demo-similar <slug>`: compara estrutura com demos anteriores;
- `demo-publicar <slug>`: roda QA e publica na Vercel;
- `get <path>` e `post <path>`: acesso controlado a endpoints do backend.

Essa skill e o "controle remoto" da operacao.

---

## Skill de QA visual: verifica-interface

A segunda skill importante e `verifica-interface`.

Ela e um portao de qualidade para demos.

Ela roda:

```bash
python C:\01-hermes\Lead-hunter\openclaw-skill\verifica-interface\check.py <index.html ou URL>
```

Ela abre a pagina em Chromium real e verifica:

- desktop;
- mobile;
- overflow horizontal;
- imagens quebradas;
- erro JS;
- placeholder;
- contraste ruim;
- CTA sem link;
- secoes vazias;
- elementos sobrepostos.

O `demo-publicar` usa esse QA como gate.

Se tiver problema `ALTA`, a publicacao e bloqueada.

---

## Agentes planejados

A arquitetura preve 8 agentes.

### 1. Orquestradora

Coordena a operacao.

Responsabilidades:

- checar status;
- dizer o que precisa ser feito;
- priorizar proximos passos;
- gerar relatorios;
- chamar outros agentes;
- reportar no Discord.

### 2. Cacadora

Cuida da busca de novos leads.

Responsabilidades:

- criar campanhas;
- gerar jobs por categoria/regiao;
- executar buscas quando autorizado;
- respeitar cota da Google API;
- evitar duplicacao por `place_id`.

### 3. Auditora

Analisa presenca digital dos leads.

Responsabilidades:

- rodar auditoria de site;
- detectar sem site/site ruim/site fora do ar;
- capturar Instagram;
- tirar prints desktop/mobile;
- registrar problemas encontrados.

### 4. Analista

Interpreta o score e prioriza leads.

Responsabilidades:

- ler ranking;
- explicar por que um lead e bom;
- sugerir quais atacar primeiro;
- detectar leads que valem demo;
- nao alterar score manualmente.

### 5. Curadora

Coleta e organiza referencias de design.

Responsabilidades:

- buscar referencias por nicho;
- identificar padroes visuais;
- alimentar a criadora de demos;
- evitar que as demos fiquem com cara de template.

### 6. Criadora de Demo - Nobara

E a diretora criativa.

Responsabilidades:

- ler dados reais do lead;
- usar fotos reais quando existirem;
- escrever a SPEC JSON;
- escolher estrutura, secoes, tipografia, paleta e copy;
- rodar render;
- passar no QA;
- gerar demo unica para o lead.

Importante: a Nobara nao deve escrever um HTML gigante do zero como fluxo principal. Ela deve escrever uma SPEC compacta.

### 7. Comercial

Ajuda na abordagem.

Responsabilidades:

- gerar rascunhos;
- adaptar copy;
- sugerir argumentos;
- preparar pacote comercial;
- manter CRM organizado.

O envio continua manual pelo Samuel.

### 8. Diagnosticador

Atua depois de uma conversa ou cliente ganho.

Responsabilidades:

- entender operacao do cliente;
- identificar oportunidades de automacao;
- sugerir upsells;
- alimentar diagnosticos e oportunidades comerciais.

---

## Como os agentes interagem com o sistema

O caminho correto e:

```text
Agente OpenClaw
  -> skill/comando
  -> CLI Node ou script Python
  -> API FastAPI
  -> service layer
  -> Postgres
```

Exemplo:

```text
Samuel: "quais leads atacar hoje?"
  -> Orquestradora roda `lh status`
  -> Orquestradora roda `lh leads 5`
  -> Ela resume os melhores leads
```

Exemplo:

```text
Samuel: "gera uma demo para esse lead"
  -> Nobara roda `demo-data <id>`
  -> Nobara escreve `spec.json`
  -> Nobara roda `demo-render`
  -> sistema roda `verifica-interface`
  -> Nobara corrige se necessario
  -> `demo-publicar` publica na Vercel
```

Exemplo:

```text
Samuel: "esse lead respondeu"
  -> Comercial registra interacao
  -> agenda follow-up
  -> move card no CRM
```

---

## Por que nao deixar o agente fazer tudo sozinho

O projeto evita que a IA tenha controle irrestrito.

Isso e proposital.

IA e boa para:

- interpretar contexto;
- escrever copy;
- escolher estrategia;
- criar direcao visual;
- resumir dados;
- priorizar oportunidades.

IA e ruim para:

- manter consistencia de banco;
- respeitar cota;
- nao duplicar dados;
- emitir HTML gigante sem erro;
- garantir responsividade;
- decidir sozinha quando publicar;
- enviar mensagem comercial sem supervisao.

Por isso, a arquitetura separa:

```text
IA = cerebro operacional/criativo
Codigo = execucao confiavel
Banco = fonte da verdade
QA = gate de seguranca
Samuel = decisao comercial final
```

---

## Estrutura tecnica das demos no OpenClaw

A parte de demos foi uma decisao importante.

Inicialmente, a ideia era a IA escrever o HTML inteiro de uma pagina completa.

Isso falhou porque o runtime `claude-cli` tem limite de output por turno. Um site inteiro de 25-35KB pode estourar esse limite.

A solucao foi:

```text
SPEC -> RENDER
```

Ou seja:

- Nobara escreve uma SPEC pequena;
- o renderizador Node gera o HTML final;
- o QA valida o resultado.

A SPEC contem:

- dados reais do lead;
- conceito de arte;
- tipografia;
- paleta;
- animacoes;
- secoes;
- variantes;
- imagens;
- textos;
- CTAs.

O renderizador contem uma biblioteca de secoes:

- header;
- hero split/editorial/fullbleed/centered;
- ticker;
- manifesto;
- about;
- services;
- feature;
- steps;
- stats;
- testimonial;
- gallery;
- FAQ;
- banner;
- CTA;
- contact;
- footer.

A variedade vem da combinacao entre:

- ordem das secoes;
- variantes;
- paleta;
- tipografia;
- fotos;
- copy;
- densidade;
- ritmo visual.

Tambem existe `demo-similar`, que compara a estrutura da demo nova com demos antigas para evitar que tudo fique parecido.

---

## Publicacao

As demos ficam em:

```text
C:\01-hermes\Lead-hunter\demos\<slug>\
```

Cada demo pode ter:

- `spec.json`;
- `index.html`;
- pasta `img/`;
- prints de QA.

Para publicar:

```bash
lh demo-publicar <slug> --scope balmor-s-projects
```

Antes de subir, o comando roda o QA visual.

Se o QA encontrar bug bloqueante, a publicacao nao acontece.

---

## Discord e operacao diaria

O projeto tambem tem scripts operacionais para rodar em rotina:

- backup do banco;
- pipeline diario de auditoria e score;
- heartbeat dos servicos;
- relatorio diario;
- analista de melhorias.

A ideia e que o Discord seja o canal de comando/relatorio com o Samuel e o socio.

O OpenClaw opera; o backend guarda; o Discord informa.

---

## Regras inviolaveis

As regras mais importantes do projeto:

1. Nunca expor chave do Google no frontend.
2. Nunca fazer scraping do Google Maps.
3. Usar Google Places API New.
4. Verificar cota antes de chamada paga.
5. Deduplicar por `place_id`.
6. Agente nao roda SQL direto.
7. Score e deterministico.
8. Outreach e manual.
9. Demo so para lead quente.
10. Publicacao passa por QA.
11. Nunca inventar dado.
12. Se o backend estiver fora, avisar em vez de improvisar.

---

## O que ja existe

Ja foi construido:

- backend FastAPI;
- banco Postgres;
- migrations;
- modelos principais;
- integracao Google Places;
- controle de cota;
- auditoria de site;
- auditoria visual com screenshots;
- score deterministico;
- ranking de leads;
- dashboard;
- tela de leads;
- detalhe do lead;
- CRM;
- follow-ups;
- rascunho de abordagem;
- renderizador de demos por spec;
- demos iniciais;
- QA visual das demos;
- scripts operacionais;
- skill principal do OpenClaw;
- skill de QA visual.

---

## O que ainda esta em evolucao

Ainda faltam ou estao em amadurecimento:

- fluxo final dos agentes no OpenClaw;
- geracao automatica de imagens quando o lead nao tem fotos reais;
- curadoria automatica de referencias por nicho;
- diagnostico de automacoes pos-venda;
- tela de aprovacoes;
- CRUD completo de oportunidades comerciais;
- endurecer o pipeline completo de demo ate publicacao;
- transformar a operacao multiagente em rotina estavel.

---

## Resumo em uma frase

O **Lead Hunter BH** e uma fabrica semi-automatizada de prospeccao: encontra negocios locais com presenca digital fraca, ranqueia as melhores oportunidades, prepara abordagem personalizada e gera previas de site para ajudar o Samuel a fechar clientes com mais contexto e mais impacto.

O **OpenClaw** e a camada de agentes que opera essa fabrica: ele consulta o backend, chama ferramentas controladas, coordena tarefas e usa IA onde ela e forte, mas deixa dados, score, QA e publicacao sob regras deterministicas.
