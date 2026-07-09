#!/usr/bin/env node
// validate-brief.mjs — gate do BRIEF (P0-2). O BRIEF do Nanami é o contrato que impede site
// templateado; antes a exigência morava no demo-render (depreciado) e o demo-publicar não checava
// nada. Aqui garantimos que existe um BRIEF DE VERDADE (não o template em branco) antes de publicar.
// Uso: node skills/lead-hunter/validate-brief.mjs <slug>
// Exit 0 = passou | Exit 1 = REPROVADO (falta BRIEF ou está vazio/incompleto).

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", "demos"); // mesma pasta compartilhada dos demos
const slug = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!slug) { console.error("uso: validate-brief <slug>"); process.exit(2); }

const p = resolve(ROOT, slug, "BRIEF.md");
if (!existsSync(p)) {
  console.error(`BRIEF AUSENTE — falta ${p}. O Nanami tem que escrever o BRIEF (BRIEF-TEMPLATE.md) ANTES da publicacao.`);
  process.exit(1);
}
const t = readFileSync(p, "utf8");
const fails = [];

// (1) referencias reais — o "roubo": >=3 URLs http(s). O template em branco tem 0.
const urls = (t.match(/https?:\/\/[^\s)\]|]+/gi) || []).filter((u) => !/example\.com/i.test(u));
if (urls.length < 3) fails.push(`so ${urls.length} referencia(s) com URL real (min. 3). Sem o "roubo" concreto o site sai generico.`);

// (2) cor real validada — >=1 hex de 6 digitos. O template tem placeholder "#______" (nao casa).
const hexes = (t.match(/#[0-9a-fA-F]{6}\b/g) || []);
if (hexes.length < 1) fails.push("nenhuma cor da marca validada (#rrggbb) — o placeholder #______ nao conta.");

// (3) conteudo real — nao pode ser o template praticamente vazio.
const filled = t.replace(/\s+/g, " ").trim();
if (filled.length < 700) fails.push(`BRIEF curto demais (${filled.length} chars) — parece o template em branco.`);
// linhas de tabela ainda vazias (| ... |    |    |) sao sinal de template nao preenchido
const emptyRows = (t.match(/^\|[^\n]*\|\s*\|\s*\|\s*$/gm) || []).length;
if (emptyRows >= 3) fails.push(`${emptyRows} linha(s) de tabela em branco — preencha (fotos/refs/mapa de secoes).`);

// (4) PROFUNDIDADE DE CONCEITO (hard) — o que separa BRIEF de direcao de arte de BRIEF raso.
// Os campos estrategicos tem que estar DECLARADOS COM VALOR (nao so o rotulo do template vazio).
if (!/motion[_ ]?tier\s*[:=]\s*`?\s*T[0-3]\b/i.test(t))
  fails.push("motion_tier nao declarado no formato canonico 'motion_tier: Tn' (T0..T3). Os gates leem isso.");
if (!/hero[_ ]?strategy\s*[:=]\s*`?\s*\S{3,}/i.test(t))
  fails.push("hero_strategy nao declarado COM VALOR (ex: 'hero_strategy: manifesto'). Sem estrategia de hero o site sai generico.");
if (!/\bstack\s*[:=]\s*`?\s*\S{3,}/i.test(t))
  fails.push("stack nao declarada (ex: 'stack: css-only' ou 'stack: gsap') — coerente com o motion_tier.");
if (!/image[_ ]?treatment/i.test(t))
  fails.push("image_treatment nao declarado — COMO a imagem entra (materialmente diferente das ultimas).");
if (!/primary[_ ]?visual[_ ]?move/i.test(t))
  fails.push("primary_visual_move nao declarado — o gesto visual que carrega o site.");

if (fails.length) {
  console.error("BRIEF INCOMPLETO — publicacao bloqueada:\n- " + fails.join("\n- "));
  console.error("Peca ao Nanami pra completar o BRIEF (BRIEF-TEMPLATE.md, passe o checklist de aceitacao).");
  process.exit(1);
}
console.log(`BRIEF: ${urls.length} refs, cor ${hexes[0]} ✓`);
process.exit(0);
