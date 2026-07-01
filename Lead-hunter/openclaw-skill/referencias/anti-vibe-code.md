# ANTI-VIBE-CODE — o checklist do que uma demo da Balmor NUNCA pode parecer

Regra do Samuel: antes de publicar, a Criadora roda este checklist. Se a demo parece
"site feito por IA num fim de semana", **refaz** — a prévia é a peça de venda; se ela
parece template, o pitch inteiro morre ("esse cara só apertou um botão").

## A cara do "vibe code" / template de IA (exemplo A NÃO SEGUIR)

O padrão que denuncia na hora (estudo de 2026: dark mode permanente aparece em 34% das
páginas geradas, gradiente de fundo em 27%, grid de cards com ícone em 22%):

- **Dark mode roxo/azul** com gradiente violeta→azul no hero (a paleta padrão do
  shadcn/Vercel/v0 — o "VibeCode Purple" / indigo-500 do Tailwind)
- **Fundo preto com grid sutil** ou glow radial atrás do título
- **Inter em tudo** — título gigante bold + subtítulo cinza `text-neutral-400`
  (variações da mesma família: Space Grotesk + Instrument Serif + Geist, ou uma palavra
  em serif itálico no meio do H1 pra fingir personalidade)
- **Badge arredondado no topo** tipo "✨ Now with AI" com bordinha translúcida, em cima do H1
- **Cards com `border-white/10`, `rounded-2xl`, glassmorphism** e hover que levanta 2px
- **Glow/box-shadow COLORIDO** gigante atrás de card/botão
- **Emojis como ícones de feature** (⚡🔧🤖 em grid de 3 colunas)
- **Botão "Get Started" gradiente + "Learn more" ghost** do lado
- **Marquee de "logos de empresas" cinza** + seção FAQ em accordion no fim, sempre na mesma ordem
- **Card com borda colorida na esquerda/topo** (a listra de 3-4px roxa)
- **Contraste no limite** (cinza médio sobre preto que mal passa no WCAG)
- **Zero personalidade de marca** — dava pra ser SaaS, cripto ou barbearia com o mesmo layout

## Onde ver esse padrão ao vivo (olhe pra CALIBRAR o olho, nunca pra copiar)

- Galeria do **v0.dev** e templates do Vercel (vercel.com/templates)
- **21st.dev** e blocos de **magicui / aceternity** (o "aurora hero" roxo é a assinatura)
- Boa parte dos projetos no showcase do **Bolt.new / Lovable**
- Landing pages de projeto no **Product Hunt** feitas em fim de semana

> NUANCE IMPORTANTE: esses sites são a ORIGEM dos padrões de COMPONENTE que a gente
> porta pro render.mjs (marquee, bento, spotlight, beam). A TÉCNICA é boa — o que é
> slop é a ESTÉTICA padrão deles (roxo/dark/Inter/glass) aplicada sem conceito. Roube o
> mecanismo, nunca o visual.

## Proibido nas demos (bans duros)

1. Paleta roxo/violeta/indigo — a cor vem da MARCA REAL do lead, sempre.
2. Dark mode como default — só se a marca do lead pedir (e com contraste folgado).
3. Inter/Roboto/Arial como display — o type_system da spec já define pares com intenção.
4. Glassmorphism / blur translúcido em card.
5. Emoji como ícone de serviço/feature em grid (emoji só em `highlights`, com parcimônia, quando o tom do nicho permite).
6. Badge "✨" flutuando sobre o H1.
7. Glow colorido atrás de elemento.
8. Copy de SaaS em negócio local ("Comece agora", "Saiba mais", "Soluções completas em odontologia") — o CTA é ação real: "Agendar pelo WhatsApp".
9. Card com listra colorida na borda esquerda/topo.
10. Inglês em qualquer texto ("Get Started") — negócio local de BH fala português.

## Sinal amarelo (permitido no render, MAS só com conceito)

Steps numerados, faixa de stats, labels uppercase (eyebrow), FAQ accordion e marquee
existem na nossa biblioteca e em site de agência boa. Viram slop quando:
- aparecem TODOS juntos na mesma demo (colagem de primitivas);
- na MESMA ordem de sempre (hero → 3 cards → stats → FAQ → CTA);
- sem nada que só ESSE lead tem (foto real, bairro, nota do Google, jeito de falar do nicho).
Use no máximo 2–3 dessas primitivas por demo e quebre a ordem esperada.

## O TESTE FINAL (troca-de-logo) — roda antes de todo demo-publicar

Olhe o screenshot do qa-visual e responda honesto:
1. **Se eu trocar o nome/logo por um SaaS de IA, o site continua fazendo sentido?**
   → Se SIM, a demo é template. REFAZ (mude type_system, paleta aplicada, estrutura).
2. **O que nesta demo só existe por causa DESTE lead?** (cor do logo dele, fotos dele,
   bairro, nota, ângulo do nicho) — tem que haver pelo menos 4 respostas concretas.
3. **Um dono de negócio de 50 anos entenderia o site em 5 segundos no celular?**
4. **Eu veria esse layout numa galeria do v0/Lovable?** → Se sim, volta pra spec.

Se falhar qualquer um: ajusta a spec e re-renderiza. Publicar demo com cara de template
é pior do que atrasar a entrega.
