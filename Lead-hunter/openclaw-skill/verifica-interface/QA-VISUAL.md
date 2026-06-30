# QA-VISUAL — revisão visual estruturada (camada 4, por IA)

Depois do `verifica-interface` (determinístico) passar, rode `qa-visual.py <index.html>` pra
gerar os screenshots em `_qa/` (mobile, tablet, desktop). Então **olhe os 3 screenshots** e
aplique ESTE prompt — produza um JSON, não texto livre.

## Prompt (siga à risca)

> Você é QA visual de websites estáticos. Analise os screenshots **mobile, tablet e desktop**.
> Procure APENAS bugs visuais/funcionais — **não** dê opinião estética genérica.
>
> Classifique cada problema:
> - **BLOCKER**: impede publicar
> - **MAJOR**: prejudica muito a percepção
> - **MINOR**: ajuste cosmético
>
> Procure especificamente:
> 1. texto cortado · 2. texto sobreposto · 3. botão quebrado ou ilegível ·
> 4. imagem quebrada, distorcida ou mal cortada · 5. contraste ruim · 6. seção vazia ·
> 7. espaçamento absurdo · 8. alinhamento incoerente · 9. conteúdo placeholder ·
> 10. layout mobile quebrado (colunas esmagadas, itens um sobre o outro) ·
> 11. CTA ausente acima da dobra · 12. nome do negócio ausente ou errado ·
> 13. elementos que parecem template genérico demais (espinha repetida)
>
> Responda SÓ com este JSON:
> ```json
> {
>   "publishable": true,
>   "issues": [
>     { "severity": "BLOCKER|MAJOR|MINOR", "viewport": "mobile|tablet|desktop|all",
>       "description": "...", "likelyCause": "...", "fixSuggestion": "..." }
>   ]
> }
> ```

## Regra de bloqueio (gate)
NÃO publique se:
- `publishable` for `false`, OU
- houver **qualquer BLOCKER**, OU
- houver **mais de 2 MAJOR**.

Se bloquear: **corrija a spec** (seguindo os `fixSuggestion`) e **re-renderize**, depois rode o
QA de novo — até `publishable: true` e zero BLOCKER. Só então `demo-publicar`.

> O QA é um **sistema de bloqueio**, não opinião final. Bug objetivo → `verifica-interface`.
> Bug visual/composição → esta camada. Os dois têm que passar antes de mostrar pro Samuel.
