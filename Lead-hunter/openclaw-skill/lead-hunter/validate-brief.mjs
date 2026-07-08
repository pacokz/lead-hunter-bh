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

// (soft) motion_tier declarado — nao bloqueia (campo novo), mas avisa.
const hasTier = /motion[_ ]?tier[^\n]*\bT[0-3]\b/i.test(t) || /\bT[0-3]\b\s*(static|micro|scroll|imersiv|3d)/i.test(t);
if (!hasTier) console.error("AVISO: motion_tier nao declarado no BRIEF (T0..T3). O Nanami deveria escolher o nivel de movimento.");

if (fails.length) {
  console.error("BRIEF INCOMPLETO — publicacao bloqueada:\n- " + fails.join("\n- "));
  console.error("Peca ao Nanami pra completar o BRIEF (BRIEF-TEMPLATE.md, passe o checklist de aceitacao).");
  process.exit(1);
}
console.log(`BRIEF: ${urls.length} refs, cor ${hexes[0]} ✓`);
process.exit(0);
