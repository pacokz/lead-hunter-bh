#!/usr/bin/env node
// visual-gate.mjs — gate VISUAL anti-template + anti-repetição.
// Roda no index.html RENDERIZADO (não nos nomes de seção). Falha se:
//   (A) usou a biblioteca render.mjs (fingerprint de template), OU
//   (B) ficou visualmente parecido demais com um demo ANTERIOR (classes/anim/fontes/layout).
// Uso: node skills/lead-hunter/visual-gate.mjs <slug> [--max <pct>]
// Exit 0 = passou | Exit 1 = REPROVADO (a Nobara TEM que refazer diferente).

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "demos"); // mesma pasta (compartilhada) dos demos
const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const _mi = args.indexOf("--max");
const maxPct = _mi >= 0 && Number.isFinite(Number(args[_mi + 1])) ? Number(args[_mi + 1]) : 15; // teto de similaridade (%)

if (!slug) { console.error("uso: visual-gate <slug> [--max <pct>]"); process.exit(2); }

// ── FINGERPRINT do render.mjs (se QUALQUER um aparecer, ela usou o template = REPROVA) ──
const TEMPLATE_MARKERS = [
  "hero-frame", "hero-copy", "hero-badge", "site-head", "hero-split", "hero-editorial",
  "@keyframes shine", "@keyframes tk", 'class="wrap', "aurora", "shine", "data-textgen",
];

function readHtml(s) {
  const p = resolve(ROOT, s, "index.html");
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

// extrai a "impressão digital visual" de um HTML: classes, keyframes, fontes, tags estruturais
function fingerprint(html) {
  const classes = new Set();
  for (const m of html.matchAll(/class="([^"]+)"/g))
    for (const c of m[1].split(/\s+/)) if (c) classes.add(c.toLowerCase());
  const keyframes = new Set([...html.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1].toLowerCase()));
  const fonts = new Set([...html.matchAll(/font-family:\s*([^;"}]+)/gi)].map((m) => m[1].trim().toLowerCase().slice(0, 40)));
  const anims = new Set([...html.matchAll(/animation(?:-name)?:\s*([\w-]+)/gi)].map((m) => m[1].toLowerCase()));
  return { classes, keyframes, fonts, anims };
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const target = readHtml(slug);
if (!target) { console.error(`index.html não encontrado em demos/${slug}/ — renderize/escreva antes.`); process.exit(2); }

// ── GATE A: usou o template? ──
const usedTemplate = TEMPLATE_MARKERS.filter((m) => target.includes(m));
if (usedTemplate.length) {
  console.error("❌ REPROVADO — SITE TEMPLATEADO (render.mjs). Marcadores encontrados:");
  console.error("   " + usedTemplate.join(", "));
  console.error("Escreva o HTML/CSS do ZERO (skill frontend-design), sem os componentes do render.mjs.");
  process.exit(1);
}

// ── GATE B: parecido demais com algum demo anterior? ──
const fp = fingerprint(target);
const others = readdirSync(ROOT).filter((d) => d !== slug && !d.startsWith("_") && existsSync(resolve(ROOT, d, "index.html")));
let worst = { slug: null, pct: 0, shared: [] };
for (const o of others) {
  const ofp = fingerprint(readHtml(o));
  // similaridade visual = média ponderada das impressões digitais
  const sim = (
    jaccard(fp.classes, ofp.classes) * 0.5 +
    jaccard(fp.keyframes, ofp.keyframes) * 0.2 +
    jaccard(fp.fonts, ofp.fonts) * 0.15 +
    jaccard(fp.anims, ofp.anims) * 0.15
  ) * 100;
  if (sim > worst.pct) {
    const shared = [...fp.classes].filter((c) => ofp.classes.has(c)).slice(0, 15);
    worst = { slug: o, pct: sim, shared };
  }
}

console.log(`Similaridade visual máxima: ${worst.pct.toFixed(1)}% (com "${worst.slug || "—"}") | teto: ${maxPct}%`);
if (worst.pct > maxPct) {
  console.error(`\n❌ REPROVADO — PARECIDO DEMAIS com "${worst.slug}" (${worst.pct.toFixed(1)}% > ${maxPct}%).`);
  console.error(`Classes/estruturas repetidas: ${worst.shared.join(", ")}`);
  console.error("Mude a HERO, as animações, a tipografia e a composição — outro conceito visual. Consulte o livro de repetições.");
  process.exit(1);
}

// ── GATE C: tem MOVIMENTO? (animação obrigatória — nada de site estático) ──
const motion = {
  keyframes: /@keyframes/i.test(target),
  observer: /IntersectionObserver/i.test(target),
  raf: /requestAnimationFrame/i.test(target),
  scrollAnim: /scroll(?:Y|-behavior|Timeline|-linked)|data-(?:reveal|parallax|anim)/i.test(target),
};
if (!Object.values(motion).some(Boolean)) {
  console.error("❌ REPROVADO — SITE SEM MOVIMENTO. O BRIEF exige animação: adicione reais");
  console.error("   (scroll-reveal, parallax, marquee, contador que sobe, hover ricos) — não pode sair estático.");
  process.exit(1);
}

// ── GATE D: números CONSISTENTES (ex.: nº de avaliações não pode divergir no site) ──
const reviewNums = [...target.matchAll(/([\d.]{1,7})\s*(?:avalia|review)/gi)]
  .map((m) => m[1].replace(/\D/g, "")).filter(Boolean);
const distinctReviews = [...new Set(reviewNums)];
if (distinctReviews.length > 1) {
  console.error(`❌ REPROVADO — Nº DE AVALIAÇÕES INCONSISTENTE no site: ${distinctReviews.join(" vs ")}.`);
  console.error("   Use o MESMO valor em todo lugar (hero, faixa de números, footer).");
  process.exit(1);
}

console.log(`✅ PASSOU — site bespoke (sem template), com movimento, números consistentes e distinto dos anteriores.`);
