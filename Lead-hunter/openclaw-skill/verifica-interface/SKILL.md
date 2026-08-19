---
name: verifica-interface
description: "Portao de QA VISUAL: verifica ERROS DE INTERFACE/layout num site ou demo HTML — overflow horizontal (pagina rolando de lado), imagens quebradas, erros de JavaScript no console, secoes vazias e cabecalho quebrando. Renderiza em DESKTOP e MOBILE num navegador real. USE OBRIGATORIAMENTE como ultimo passo DEPOIS de gerar ou editar uma demo de site e ANTES de publicar (demo-publicar) ou de mostrar pro Samuel. Acione quando: acabou de rodar o comando `demo`; editou o HTML de um site/demo; vai publicar uma previa; ou o Samuel pedir pra checar se um site tem bug de layout/visual/responsividade. Retorna os problemas por severidade ALTA/MEDIA/BAIXA — corrija ALTA e MEDIA antes de publicar; ALTA e bloqueante."
metadata: { "openclaw": { "emoji": "🔍" } }
---

# Verifica Interface — QA visual de demo

Renderiza o site num **navegador real** (desktop 1280 + mobile 390) e detecta erros de
interface que nao da pra ver so lendo o codigo. É o **portao de qualidade** antes de publicar.

## Como rodar
A partir da RAIZ do workspace (caminho relativo — funciona em qualquer instalação):
```
python skills/verifica-interface/check.py "<caminho do index.html>"
```
Exemplo: `python skills/verifica-interface/check.py demos/<slug>/index.html`

(Em Linux o executável costuma ser `python3`.)

## O que ele verifica (desktop + mobile)
- **Overflow horizontal** — a pagina rola de lado (algo estoura a largura) → **[ALTA]**, bloqueante
- **Imagens quebradas** — `<img>` que nao carregou → **[ALTA]**
- **Erros de JavaScript** no console → **[MEDIA]**
- **Secoes vazias / sem altura** → **[MEDIA]**
- **Cabecalho alto demais** — nome longo quebrando/sobrepondo o topo → **[BAIXA]**

## Como agir com o resultado
- Saida **"OK"** → interface limpa, pode `demo-publicar`.
- Achou **[ALTA]** ou **[MEDIA]** → **corrija** (ajuste/regere a demo) e **rode de novo** ate sair limpo. NUNCA publique com [ALTA].
- **[BAIXA]** → avalie; geralmente da pra publicar, mas vale melhorar.

Requisitos: Python + Playwright (ja instalados no host). Exit 0 = limpo, 1 = achou problema.
