# web-stack-motion.md — Nobara pode usar QUALQUER stack

> Referência da Nobara. **Motion serve o CONCEITO — nunca o contrário.** Eu tenho liberdade
> técnica total (HTML/CSS, canvas 2D, SVG animado, **GSAP + ScrollTrigger**, **three.js/WebGL**,
> Lottie). O que decide *se* e *quanto* de motion pesado entra é o **`motion_tier` do BRIEF do
> Nanami** — não o meu impulso. Um dentista de bairro raramente pede WebGL; um estúdio de
> arquitetura ou uma marca de luxo pode pedir. Se o brief não prescreveu tier alto, o default
> é T1 (micro-interações). **3D gratuito = cara de template de IA = REPROVA.**

## Os tiers de movimento (o Nanami declara um no BRIEF)
- **T0 — static-elegant** — zero JS de motion. Tipografia, composição e foto carregam. Bom pra
  jurídico/clínico/institucional sóbrio. (CSS `:hover`/`focus` suave é permitido.)
- **T1 — micro-interações** (default) — CSS transitions, **scroll-reveal via IntersectionObserver**,
  contadores, parallax leve de 1 camada. É o que 80% dos negócios locais devem ter. Puro CSS/vanilla.
- **T2 — scroll-choreography** — **GSAP + ScrollTrigger**: seções fixadas (pin), timelines de
  revelação encadeada, parallax multicamada, horizontal-scroll *intencional* (com affordance).
  Editorial/estética/premium. Vendoro o GSAP.
- **T3 — imersivo / 3D** — **three.js/WebGL** (campo de partículas, plano-onda, gradiente-shader,
  formas flutuando), canvas 2D generativo, ou cena leve. **Só quando o conceito é espacial/
  experiencial** (arquitetura, luxo, tecnologia, eventos, produto físico). Raro. Vendoro o three.

Regra de ouro: **UM movimento grande por site.** Não empilho 3D + pin + parallax + Lottie. O
tier alto substitui a hero-strategy comum — registro no `_repetition-book.md` (uma hero WebGL é
uma categoria de hero; não repito em demos seguidas).

## COMO usar uma lib (sempre VENDORADA — nunca CDN)
As libs já estão baixadas em `demos/_stack-kit/` (o symlink `demos/` → `demos-shared`). **Copio pra
dentro da pasta da demo** — assim (a) o `demo-publicar` sobe tudo pra Vercel junto e (b) o QA, que
abre `file://`, carrega o script local (CDN falha em `file://` por CORS de módulo e depende de
terceiro no ar — proibido).

```bash
# three.js (global THREE, UMD r128)
mkdir -p demos/<slug>/vendor && cp -r demos/_stack-kit/three demos/<slug>/vendor/three
# GSAP + ScrollTrigger (globais gsap, ScrollTrigger)
cp -r demos/_stack-kit/gsap demos/<slug>/vendor/gsap
```
```html
<script src="vendor/three/three.min.js"></script>            <!-- window.THREE -->
<script src="vendor/gsap/gsap.min.js"></script>              <!-- window.gsap -->
<script src="vendor/gsap/ScrollTrigger.min.js"></script>
```
Precisa de outra lib que não está no kit? Baixo pra `vendor/` com `curl` (a VPS tem rede) e uso
local do mesmo jeito. **Nunca** deixo `<script src="https://cdn...">` no HTML final.

## GUARDRAILS (não-negociáveis — o gate e o bom-senso reprovam quem furar)
1. **`prefers-reduced-motion: reduce`** → desligo a cena pesada e mostro um **poster estático**
   (imagem/gradiente real). Obrigatório em T2/T3.
2. **A hero NUNCA nasce em branco.** Atrás do `<canvas>` fica uma imagem/gradiente real: se o
   WebGL demora, falha, ou o device é fraco, a dobra continua bonita. LCP não espera JS.
3. **Mobile:** WebGL pesado no celular = cena leve OU fallback estático. O `qa-visual` mobile
   decide — se o print do celular vier canvas preto/vazio, REPROVA.
4. **Texto e CTA vivem no DOM normal, acima do canvas** (`z-index`) — nunca dentro do WebGL.
   Conteúdo e prova social precisam existir sem JS.
5. **Init rápido:** o `qa-visual` espera ~1,2s. Inicio a animação no `load` e renderizo o
   primeiro frame já — o screenshot tem que pegar a cena viva, não um canvas vazio.
6. **Leve:** three só com primitivas (partículas/plano/shapes/shader). Sem modelos `.glb`
   pesados, sem física. Meta: cena que sobe rápido e não trava o scroll.

## O gate já aceita stack (confirmado)
- `check.py` conta `<canvas>` como mídia → hero WebGL **não** vira "espaço morto".
- `visual-gate` exige movimento e `requestAnimationFrame` satisfaz (three/GSAP usam RAF).
- Arquivos vendorados não disparam a impressão-digital de template (classes do render.mjs).
- **Erro de console reprova** (`check.py`) — cena que joga exceção no console = bug. Testo limpo.

## Receitas (padrões, não copy-paste — escrevo bespoke)
- **T3 hero-partículas (three.js):** `PerspectiveCamera` + `BufferGeometry` de pontos + material
  com a cor real da marca; roda num `<canvas>` `position:fixed/absolute` atrás da hero; poster
  `background-image` real por baixo; loop `requestAnimationFrame`; `if (reducedMotion) return` sem
  iniciar. Bom pra tech/eventos/luxo abstrato.
- **T3 gradiente-shader:** um plano com `ShaderMaterial` (ruído animado) nas cores da marca —
  hero "viva" sem foto, elegante pra marca minimal.
- **T2 scroll-cinema (GSAP):** `ScrollTrigger` com `pin` na seção de resultado/manifesto,
  `gsap.timeline` revelando linhas do texto + a foto em parallax. Premium editorial.
- **T2 contador/linha do tempo:** `ScrollTrigger.batch` revela cards em stagger; number-counter
  animado ao entrar na viewport.
- **T1 (default):** IntersectionObserver adiciona `.in` → CSS `transform/opacity` com `transition`;
  parallax leve com `translateY` no scroll. Sem lib.

**Fecho sempre:** o motion tem que fazer o dono pensar "isso é caro, é da minha marca" — não
"isso é um template genérico com um efeito ligado". Se o efeito sairia igual em qualquer site,
tiro. Se ele conta a história DESSE negócio, fica.
