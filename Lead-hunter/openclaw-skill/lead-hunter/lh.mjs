#!/usr/bin/env node
// Lead Hunter BH — cliente CLI pra Sukuna operar o backend (FastAPI em localhost:8000).
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, unlinkSync, statSync, copyFileSync, appendFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { spawnSync, spawn } from "child_process";
import { gerarDemo, slugify, waLink, bairro } from "./demo.mjs";
import { renderSpec } from "./render.mjs";
const BASE = process.env.LH_API || "http://localhost:8000";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "demos");
const PY = process.platform === "win32" ? "python" : "python3"; // VPS Linux so tem python3
// uploads do GERAR SITE (fotos/videos que o Samuel sobe pela interface, por place_id)
const UPLOADS = process.env.DEMO_UPLOADS_DIR
  || (process.platform === "win32" ? resolve(ROOT, "..", "demo-uploads") : "/home/hermes/.openclaw/demo-uploads");

// A Nobara dispara o demo-brief com nohup e ENCERRA o turno dela. Nada no OpenClaw notifica
// conclusao de processo destacado, e o HEARTBEAT.md dela e vazio de proposito — ou seja, sem isto
// aqui ela nunca sabe que o BRIEF ficou pronto e o "te aviso" nunca acontece.
// Desacoplado (detached + unref): o demo-brief termina na hora, sem esperar ela escrever o site.
// entregar=false: roda o turno da Nobara SEM postar no Discord. E o que deixa a cadeia do
// demo-auto trabalhar em silencio — o Samuel so e chamado quando a demo esta no ar (ou escalou).
function avisarNobara(texto, { entregar = true } = {}) {
  let key = null;
  try {
    const ls = spawnSync("openclaw", ["sessions", "list", "--agent", "criadora", "--json"], { encoding: "utf8", timeout: 60000 });
    const j = JSON.parse(ls.stdout || "{}");
    const arr = Array.isArray(j) ? j : j.sessions || [];
    key = arr
      .map((s) => ({ k: s.key || s.sessionKey || "", u: Number(s.updatedAt || s.lastActivityAt || 0) }))
      .filter((s) => s.k.startsWith("agent:criadora:discord:"))
      .sort((a, b) => b.u - a.u)[0]?.k || null;
  } catch {}
  // Sem sessao do Discord nao ha pra onde entregar: avisa no log em vez de falhar silenciosamente.
  if (!key) {
    console.error("AVISO: nao achei a sessao de Discord da Nobara — ela NAO vai ser notificada. Chame ela na mao.");
    return;
  }
  // --deliver EXIGE destinatario explicito, senao morre com "Discord recipient is required" e o
  // turno roda sem entregar nada no Discord. O destinatario e o sufixo da chave de sessao:
  // agent:criadora:discord:channel:<id>  ->  channel:<id>
  const destino = key.replace(/^agent:criadora:discord:/, "");
  if (entregar && !/^(channel|user):/.test(destino)) {
    console.error(`AVISO: chave de sessao inesperada ("${key}") — nao consegui derivar o destinatario. Chame a Nobara na mao.`);
    return;
  }
  // --reply-account tambem e obrigatorio: sem ele a entrega sai pela conta DEFAULT (bot do Sukuna),
  // e o Samuel recebe um aviso da Nobara assinado por outro agente.
  const args = ["agent", "--agent", "criadora", "--session-key", key, "--message", texto, "--timeout", "1800"];
  if (entregar) args.push("--reply-to", destino, "--reply-account", "nobara", "--deliver");
  // Nao usar detached+stdio:ignore aqui: a CLI sai com codigo 0 MESMO quando a entrega falha,
  // entao a unica forma de saber e ler a saida. Sem isso a falha e invisivel (foi o que aconteceu
  // em 30/07/2026: log dizia "notificada", nada chegou no Discord).
  try {
    const r = spawnSync("openclaw", args, { encoding: "utf8", timeout: 1_860_000 });
    const saida = `${r.stdout || ""}${r.stderr || ""}`;
    if (/GatewayClientRequestError|recipient is required|Error:/i.test(saida)) {
      console.error(`FALHA ao falar com a Nobara${entregar ? ` (${destino})` : ""}:\n${saida.trim().slice(0, 400)}`);
      return;
    }
    console.log(entregar ? `Nobara notificada e resposta entregue no Discord (${destino}).` : "Nobara executou o passo (sem postar no Discord).");
  } catch (e) {
    console.error(`FALHA ao notificar a Nobara: ${e.message}`);
  }
}

function semAcento(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// GATE OBJETIVO de conversao e contato. Nasceu de dois furos REAIS que passaram pelo Critico
// em 30/07/2026 no grupo-odontologico-carlos e so foram pegos por revisao humana:
//   1. CTA principal em href="https://wa.me/" SEM numero — o botao de conversao caia na pagina
//      generica do WhatsApp;
//   2. footer sem endereco e sem telefone, sumindo com a prova de "lugar real" — que num negocio
//      local estabelecido e o ativo mais forte do lead.
// Sao checagens deterministicas (grep), nao julgamento: e o que permite tirar o humano do meio
// sem baixar a guarda. O Revisor/Critico continuam julgando o resto.
async function gateConversaoContato(slug, dir) {
  const blocks = [];
  const html = readFileSync(resolve(dir, "index.html"), "utf8");

  const waSemNumero = [...html.matchAll(/href="[^"]*wa\.me\/([^"]*)"/gi)]
    .filter((m) => (m[1].match(/\d/g) || []).length < 10);
  if (waSemNumero.length) blocks.push(`CTA de WhatsApp sem numero (href="...wa.me/${waSemNumero[0][1].slice(0, 20)}") — o botao de conversao nao leva a lugar nenhum`);

  const mortos = (html.match(/href="(#?)"/g) || []).length;
  if (mortos) blocks.push(`${mortos} link(s) com href vazio ou "#" — CTA morto`);

  // Telefone e endereco vem do banco (o lead.json so guarda place_id/nome/slug).
  let place = null;
  try {
    const lead = JSON.parse(readFileSync(resolve(dir, "lead.json"), "utf8"));
    if (lead.place_id) place = (await api("GET", `/leads/${lead.place_id}/context`)).place;
  } catch {}
  if (!place) {
    console.log("Gate de contato: sem dados do lead no banco — pulado (nao da pra exigir o que nao temos).");
    return blocks;
  }

  const digitos = String(place.phone || "").replace(/\D/g, "");
  if (digitos.length >= 10) {
    const flexivel = new RegExp(digitos.split("").join("\\D*"));
    if (!flexivel.test(html)) blocks.push(`telefone real do lead (${place.phone}) nao aparece no site`);
  }
  const rua = String(place.address || "").split(",")[0].replace(/^(r\.|rua|av\.|avenida|al\.|alameda|pra[cç]a)\s*/i, "").trim();
  if (rua.length >= 6 && !semAcento(html).includes(semAcento(rua))) {
    blocks.push(`endereco real do lead ("${rua}") nao aparece no site — some a prova de lugar real`);
  }
  return blocks;
}

// Invoca a FUNDACAO (subagente da Nobara) por gateway: destila o BRIEF + prints em
// tokens.css + motion-spec.md. Deterministico — chamado no fim do demo-brief e como comando.
// Ate 2 tentativas. Retorna true se os dois arquivos foram escritos.
function rodarFundacao(slug, dir) {
  const tokensPath = resolve(dir, "tokens.css");
  const motionPath = resolve(dir, "motion-spec.md");
  const prompt = `Voce e a Fundacao (subagente da Nobara). Destile o BRIEF do demo "${slug}" em vocabulario visual concreto, como diz seu SOUL.\n`
    + `Leia demos/${slug}/BRIEF.md (foco §6b motion, §7 tipografia+paleta, §8 componentes) e OLHE os prints em demos/${slug}/refs/*.png que o Nanami citou.\n`
    + `Escreva DOIS arquivos e nada mais:\n`
    + `- demos/${slug}/tokens.css — custom properties (:root{--...}), 8-12 cores com a regra de uso em comentario, escada tipografica de 5 passos, 6 de espacamento, 3 raios + pill, elevacao. UM acento com UMA funcao. Claro+escuro se o BRIEF pedir.\n`
    + `- demos/${slug}/motion-spec.md — o motion_tier, a stack, o efeito-ancora e os guardrails (reduced-motion, poster de fallback, mobile, LCP), tudo derivado do BRIEF.\n`
    + `NAO invente cor/fonte fora do BRIEF. NAO gere HTML nem componentes (isso e da Nobara). Responda so "fundacao pronta".`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    console.log(`Fundacao: invocando por gateway (tentativa ${attempt}) pra destilar os tokens de "${slug}" ...`);
    spawnSync("openclaw", ["agent", "--agent", "fundacao", "--message", prompt, "--json", "--timeout", "600"], { encoding: "utf8", timeout: 660000 });
    if (existsSync(tokensPath) && existsSync(motionPath)) {
      console.log(`✅ Fundacao pronta: ${tokensPath} + ${motionPath}`);
      return true;
    }
    console.error(`Fundacao nao entregou os dois arquivos (tentativa ${attempt}): tokens.css=${existsSync(tokensPath)} motion-spec.md=${existsSync(motionPath)}`);
  }
  console.error("Fundacao FALHOU em 2 tentativas. Nao e bloqueante: a Nobara pode extrair os tokens na mao do BRIEF — mas avise.");
  return false;
}

// Invoca o REVISOR (subagente da Nobara) por gateway: QA barato ANTES do Critico.
// Escreve _qa/revisao-interna.md terminando em "PRONTO PRO CRITICO" ou "VOLTA PRA NOBORA".
// Veredito sempre fresco (o index.html pode ter mudado). Retorna {pronto} ou {erro}.
function rodarRevisor(slug, dir) {
  const revPath = resolve(dir, "_qa", "revisao-interna.md");
  mkdirSync(resolve(dir, "_qa"), { recursive: true });
  try { unlinkSync(revPath); } catch {}
  const prompt = `Voce e o Revisor (subagente da Nobara). Revise o demo "${slug}" como diz seu SOUL — QA barato ANTES do Critico.\n`
    + `Leia demos/${slug}/BRIEF.md e demos/${slug}/index.html. Rode os gates objetivos por bash (check.py e qa-visual.py em openclaw-skill/verifica-interface/), faca o teste anti-vibe-code e o anti-molde (demos/_repetition-book.md), e confira fidelidade ao BRIEF (motion_tier respeitado, marca real usada, nao "xucro").\n`
    + `Escreva demos/${slug}/_qa/revisao-interna.md com os achados [ALTA]/[MEDIA] (arquivo:linha) e TERMINE o arquivo com uma linha literal: "PRONTO PRO CRITICO" ou "VOLTA PRA NOBORA".\n`
    + `NAO edite o index.html (a correcao e da Nobara). Responda so o veredito.`;
  console.log(`Revisor: invocando por gateway pra revisar "${slug}" ...`);
  spawnSync("openclaw", ["agent", "--agent", "revisor", "--message", prompt, "--json", "--timeout", "600"], { encoding: "utf8", timeout: 660000 });
  if (!existsSync(revPath)) return { erro: "o Revisor nao escreveu _qa/revisao-interna.md" };
  const txt = readFileSync(revPath, "utf8");
  const ultimo = (txt.match(/PRONTO PRO CRITICO|VOLTA PRA NOB\w+/gi) || []).pop();
  if (!ultimo) return { erro: "revisao-interna.md sem veredito legivel (nem PRONTO nem VOLTA)" };
  return { pronto: /PRONTO/i.test(ultimo), texto: txt };
}

// parser simples de flags --chave valor / --chave=valor
function parseFlags(arr) {
  const flags = {}; const rest = [];
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq > -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else { flags[a.slice(2)] = arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[++i] : true; }
    } else rest.push(a);
  }
  return { flags, rest };
}

// ── Score de similaridade: pra duas demos não saírem com a mesma estrutura ──
// LICAO (lucca-machado, 2026-07-01): trocar so o type_system mascarava a espinha repetida
// (formula antiga dava 46% pra estruturas quase identicas). Agora: espinha (LCS) pesa mais,
// Jaccard pega o "mesmo conjunto de secoes", hero repetido vs a demo anterior BLOQUEIA,
// e o demo-render roda o check SOZINHO (nao depende da disciplina de rodar demo-similar).
const CATALOG = ["hero:split","hero:editorial","hero:fullbleed","hero:centered","ticker","manifesto","about",
  "services:zigzag","services:list","services:cards","feature","steps","stats",
  "testimonial:single","testimonial:cards","testimonial:marquee",
  "gallery:collage","gallery:grid","gallery:strip","gallery:masonry",
  "bento","beforeafter","team","logos","highlights","faq","banner","cta:band","cta:fullbleed","cta:split"];
function signature(spec) {
  return {
    ts: (spec.art_direction && spec.art_direction.type_system) || "",
    secs: (spec.sections || []).map((s) => s.type + (s.variant ? ":" + s.variant : "")),
  };
}
const heroOf = (sig) => sig.secs.find((s) => s.startsWith("hero:")) || null;
function lcsLen(a, b) {
  const n = b.length; const dp = Array(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) { const tmp = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]); prev = tmp; }
  }
  return dp[n];
}
function similarity(a, b) {
  const lcs = lcsLen(a.secs, b.secs) / Math.max(a.secs.length, b.secs.length, 1);
  const sa = new Set(a.secs), sb = new Set(b.secs);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const jac = inter / Math.max(new Set([...sa, ...sb]).size, 1);
  return { score: (a.ts === b.ts ? 0.25 : 0) + 0.45 * lcs + 0.3 * jac, lcs };
}
// Analisa a spec de <slug> contra todas as outras demos (ignora pastas _teste*).
// Retorna { blocks: [motivos bloqueantes], warns: [], neverUsed: [], worst: {slug, pct} }
function analyzeVariety(slug) {
  const specPath = resolve(ROOT, slug, "spec.json");
  if (!existsSync(specPath)) return { error: `spec.json nao encontrada em demos/${slug}/` };
  let sig;
  try { sig = signature(JSON.parse(readFileSync(specPath, "utf8"))); }
  catch (e) { return { error: "spec invalida: " + e.message }; }
  const others = [];
  for (const d of readdirSync(ROOT, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name === slug || d.name.startsWith("_")) continue;
    const sp = resolve(ROOT, d.name, "spec.json");
    if (!existsSync(sp)) continue;
    try {
      const st = statSync(sp);
      others.push({ slug: d.name, sig: signature(JSON.parse(readFileSync(sp, "utf8"))), mtime: st.mtimeMs });
    } catch {}
  }
  others.sort((x, y) => y.mtime - x.mtime);
  const blocks = [], warns = [];
  let worst = { slug: null, pct: 0 };
  for (const o of others) {
    const { score, lcs } = similarity(sig, o.sig);
    if (score > worst.pct / 100) worst = { slug: o.slug, pct: Math.round(score * 100) };
    if (score >= 0.62) blocks.push(`estrutura ${Math.round(score * 100)}% parecida com "${o.slug}"`);
    else if (lcs >= 0.7) blocks.push(`ESPINHA quase identica a "${o.slug}" (${Math.round(lcs * 100)}% da sequencia de secoes em comum) — trocar so o type_system NAO conta como variedade`);
  }
  const myHero = heroOf(sig);
  if (myHero && others.length && heroOf(others[0].sig) === myHero)
    blocks.push(`hero "${myHero}" e o MESMO da demo anterior ("${others[0].slug}") — rode entre as 4 variantes (split/editorial/fullbleed/centered)`);
  const usedEver = new Set(others.flatMap((o) => o.sig.secs));
  const neverUsed = CATALOG.filter((x) => !usedEver.has(x) && !sig.secs.includes(x));
  const usedByMeNew = sig.secs.filter((x) => !usedEver.has(x));
  if (others.length >= 2 && usedByMeNew.length === 0)
    warns.push("esta spec nao usa NENHUMA secao/variante que ja nao apareceu nas outras demos — inclua pelo menos 1 diferente");
  return { blocks, warns, neverUsed, worst };
}

// Baixa as imagens reais do site atual do lead pra pasta da demo.
// Heuristica: pega a MAIOR versao de cada imagem, prefere fotos (.jpg) e ignora pequenas (logos/icones).
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};
const baseKey = (u) => u.split("?")[0].replace(/-\d+x\d+(\.\w+)$/i, "$1");
const widthOf = (u) => { const m = u.match(/-(\d+)x\d+\.\w+(?:$|\?)/i); return m ? +m[1] : 99999; };

// ── Cor da marca: extrai a cor real do site do lead (pra não usar a cor padrao do segmento) ──
function hexToRgb(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h, s, l = (mx + mn) / 2;
  if (mx === mn) { h = s = 0; } else { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; }
  return [h, s, l];
}
function hslToHex(h, s, l) {
  let r, g, b; if (s === 0) { r = g = b = l; } else {
    const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    r = f(h + 1 / 3); g = f(h); b = f(h - 1 / 3);
  }
  const to = (x) => ("0" + Math.round(x * 255).toString(16)).slice(-2);
  return "#" + to(r) + to(g) + to(b);
}
function isBrandColor(hex) { const [h, s, l] = rgbToHsl(...hexToRgb(hex)); return s > 0.18 && l > 0.18 && l < 0.72; }
function darken(hex, factor) { let [h, s, l] = rgbToHsl(...hexToRgb(hex)); return hslToHex(h, Math.min(1, s * 1.05), Math.max(0.12, l * factor)); }
// cores-padrão de PLATAFORMA (não são a cor da marca) — não confiar nelas
const PLATFORM_DEFAULTS = new Set([
  "#116dff", "#3899ec",                          // Wix
  "#0d6efd", "#007bff",                          // Bootstrap
  "#25d366", "#128c7e", "#075e54", "#34af23",    // WhatsApp (botão flutuante)
  "#1877f2", "#3b5998",                          // Facebook
]);
const realColor = (hex) => isBrandColor(hex) && !PLATFORM_DEFAULTS.has(hex.toLowerCase());
function extractBrandColor(html) {
  const tc = html.match(/theme-color["'][^>]*content=["'](#[0-9a-fA-F]{6})["']/i) || html.match(/content=["'](#[0-9a-fA-F]{6})["'][^>]*theme-color/i);
  if (tc && realColor(tc[1])) return tc[1].toLowerCase();
  const counts = {};
  for (const m of html.matchAll(/#([0-9a-fA-F]{6})\b/g)) { const hex = "#" + m[1].toLowerCase(); if (realColor(hex)) counts[hex] = (counts[hex] || 0) + 1; }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0] : null;
}

// fetch com timeout — site FORA_DO_AR/lento NUNCA pode travar a geração da demo.
async function fetchT(url, ms = 9000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(url, { headers: BROWSER_HEADERS, signal: ac.signal }); }
  finally { clearTimeout(t); }
}

// Tenta DESCOBRIR o site do lead pelo nome (palpites de domínio) — pra não declarar "sem site" cedo demais.
const GENERIC_WORDS = new Set(["odontologia", "odontologica", "clinica", "dentista", "saude", "estetica", "instituto", "grupo", "centro", "consultorio"]);
async function descobrirSite(nome) {
  if (!nome) return null;
  const words = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !["dra", "dr", "de", "da", "do"].includes(w));
  if (!words.length) return null;
  const bases = new Set();
  bases.add(words.join(""));                                   // todas as palavras juntas
  if (words.length >= 2) bases.add([...words].reverse().join("")); // invertidas (ex: odontologiafialho)
  for (const w of words) if (w.length > 4 && !GENERIC_WORDS.has(w)) bases.add(w); // palavra-chave sozinha
  for (const b of bases) for (const tld of [".com.br", ".com"]) {
    const url = `https://${b}${tld}`;
    try {
      const r = await fetchT(url, 5000);
      if (!r.ok) continue;
      const html = (await r.text()).toLowerCase();
      if (words.some((w) => !GENERIC_WORDS.has(w) && html.includes(w)) &&
          !/domínio à venda|domain (is )?for sale|domain parking|registro\.br/i.test(html)) {
        return r.url || url;
      }
    } catch {}
  }
  return null;
}

async function scrapeImages(siteUrl, destDir, max = 8) {
  mkdirSync(resolve(destDir, "img"), { recursive: true });
  // limpa fotos de raspagens anteriores (pra nao misturar)
  try { for (const f of readdirSync(resolve(destDir, "img"))) if (/^foto-/i.test(f)) unlinkSync(resolve(destDir, "img", f)); } catch {}
  // cor da marca (best-effort via HTML simples)
  let html = null, color = null;
  try {
    const r = await fetchT(siteUrl, 9000);
    if (r.ok) { html = await r.text(); color = extractBrandColor(html); }
  } catch {}
  // 1) CAMINHO PRINCIPAL: scraper headless (pega fotos lazy-load de Wix/JS que o fetch perde)
  try {
    const py = resolve(dirname(fileURLToPath(import.meta.url)), "scrape-images.py");
    spawnSync(PY, [py, siteUrl, destDir, String(max)], { encoding: "utf8", timeout: 90000 });
  } catch {}
  const head = readdirSync(resolve(destDir, "img"))
    .filter((f) => /^foto-\d+\.jpg$/i.test(f))
    .sort((a, b) => (parseInt(a.match(/\d+/)) || 0) - (parseInt(b.match(/\d+/)) || 0));
  if (head.length) {
    const pool = head.map((f) => "img/" + f);
    return { hero: pool[0], galeria: pool.slice(1, 7), total: pool.length, color };
  }
  // 2) FALLBACK: metodo fetch (sites estaticos simples)
  if (!html) {
    console.error(`Aviso: site fora do ar ou lento (${siteUrl}) — demo SEM fotos do site.`);
    return { hero: null, galeria: [] };
  }
  // todas as URLs de imagem do HTML (cobre src, srcset, og:image, etc.)
  const all = new Set();
  for (const m of html.matchAll(/https?:\/\/[^"'\s)]+\.(?:jpe?g|png|webp)/gi)) {
    try { all.add(new URL(m[0], siteUrl).href); } catch {}
  }
  // agrupa por imagem-base e fica com a maior versao de cada
  const best = new Map();
  for (const u of all) {
    if (/favicon|cropped-|logo|icon|sprite/i.test(u)) continue; // descarta marca/icones obvios
    const k = baseKey(u);
    if (!best.has(k) || widthOf(u) > widthOf(best.get(k))) best.set(k, u);
  }
  // fotos (.jpg) primeiro
  const cand = [...best.values()].sort((a, b) =>
    (/\.jpe?g(\?|$)/i.test(b) ? 1 : 0) - (/\.jpe?g(\?|$)/i.test(a) ? 1 : 0));

  mkdirSync(resolve(destDir, "img"), { recursive: true });
  const saved = [];
  let i = 0;
  for (const u of cand) {
    if (saved.length >= max) break;
    try {
      const r = await fetchT(u, 8000);
      if (!r.ok) continue;
      const ct = r.headers.get("content-type") || "";
      if (!ct.startsWith("image")) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 20000) continue; // pula logos/icones pequenos
      const ext = ct.includes("png") ? "png" : ct.includes("webp") ? "webp" : "jpg";
      const fname = `img/foto-${++i}.${ext}`;
      writeFileSync(resolve(destDir, fname), buf);
      saved.push({ file: fname, isJpg: ext === "jpg" });
    } catch {}
  }
  const photos = saved.filter((s) => s.isJpg);
  const pool = photos.length ? photos : saved;
  const hero = pool[0]?.file || null;
  const galeria = pool.filter((s) => s.file !== hero).map((s) => s.file).slice(0, 6);
  return { hero, galeria, total: saved.length, color: extractBrandColor(html) };
}

async function api(method, path, body) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    console.error(
      `SEM CONEXAO com o backend (${BASE}). Ele esta rodando? ` +
        `(na VPS: docker restart lead-hunter-backend | no Windows: cd C:\\01-hermes\\Lead-hunter && docker compose up -d)\n${e.message}`
    );
    process.exit(2);
  }
  const txt = await res.text();
  let data;
  try { data = JSON.parse(txt); } catch { data = txt; }
  if (!res.ok) {
    console.error(`ERRO HTTP ${res.status}:`, typeof data === "string" ? data : JSON.stringify(data));
    process.exit(1);
  }
  return data;
}

const [cmd, ...args] = process.argv.slice(2);

const run = {
  async status() {
    const s = await api("GET", "/stats");
    console.log("== OPERACAO ==");
    console.log(`Empresas: ${s.total_places} | Sem site: ${s.sem_site} | Sites ruins (oportunidade): ${s.sites_ruins} | Prioritarios: ${s.prioritarios}`);
    console.log(`Auditados: ${s.audited} | Com score: ${s.scored} | Campanhas: ${s.campaigns} | Jobs c/ erro: ${s.jobs_error}`);
    console.log(`API Google -> hoje: ${s.api_today} | mes: ${s.api_month}`);
    console.log(`Por faixa de score: ${JSON.stringify(s.by_band)}`);
    console.log(`Por status de site: ${JSON.stringify(s.by_site_class)}`);
  },
  async leads() {
    const limit = args[0] || 15;
    const l = await api("GET", `/leads/ranked?limit=${limit}`);
    if (!l.length) return console.log("Nenhum lead ranqueado ainda.");
    l.forEach((x, i) =>
      console.log(
        `${String(i + 1).padStart(2)}. [${x.score} ${x.band}] ${x.name} | ${x.site_class || "-"} | ` +
          `${x.reviews_count || 0} reviews nota ${x.rating ?? "-"} | ${x.phone || "s/ tel"}` +
          (x.instagram_handle ? ` | @${x.instagram_handle}` : "") +
          ` | id=${x.place_id}`
      )
    );
  },
  async lead() {
    if (!args[0]) return console.error("uso: lead <place_id>");
    console.log(JSON.stringify(await api("GET", `/leads/${args[0]}/context`), null, 2));
  },
  async draft() {
    if (!args[0]) return console.error("uso: draft <place_id>");
    const d = await api("POST", `/leads/${args[0]}/outreach?channel=WHATSAPP`);
    console.log("RASCUNHO (revisar e enviar MANUALMENTE - Sukuna nao envia):\n");
    console.log(d.text);
  },
  async "demo-render"() {
    const { flags, rest } = parseFlags(args);
    if (!rest[0]) return console.error("uso: demo-render <arquivo-spec.json> [--force]  (renderiza o site a partir da SPEC que voce escreveu)");
    let spec;
    try { spec = JSON.parse(readFileSync(rest[0], "utf8")); }
    catch (e) { console.error("spec invalida (JSON):", e.message); process.exit(1); }
    const slug = (spec.meta && (spec.meta.slug || slugify(spec.meta.nome))) || "demo";
    const dir = resolve(ROOT, slug);
    mkdirSync(dir, { recursive: true });
    // GATE MATERIAIS-PRIMEIRO: sem BRIEF.md (cor real do logo + fotos curadas + referencias) nao renderiza.
    // Criar as cegas = retrabalho garantido (licao da demo da Dra. Aline). --force pula (NAO recomendado).
    if (!flags.force && !existsSync(resolve(dir, "BRIEF.md"))) {
      console.error(`RENDER BLOQUEADO: falta demos/${slug}/BRIEF.md (o brief vem ANTES da spec).`);
      console.error("Escreva o BRIEF.md com: (1) COR REAL da marca confirmada olhando o LOGO (nao a cor auto-detectada);");
      console.error("(2) FOTOS CURADAS (a lista das que voce olhou e aprovou, e o que descartou);");
      console.error("(3) REFERENCIAS pesquisadas AGORA (minimo 2: uma do nicho + uma de fora do nicho que casa com a direcao de arte), com o que voce vai aproveitar de cada;");
      console.error("(4) CONCEITO em 1 linha + type_system escolhido.");
      console.error("Se o Samuel mandou assets do lead (Instagram), inclua no brief. So renderize com material real na mao. (--force pula o gate.)");
      process.exit(1);
    }
    // guarda a spec na pasta da demo (registro + base do gate de variedade)
    const specFile = resolve(dir, "spec.json");
    if (resolve(rest[0]) !== specFile) writeFileSync(specFile, JSON.stringify(spec, null, 2), "utf8");
    // GATE DE VARIEDADE AUTOMATICO — nao depende de rodar demo-similar na mao
    const va = analyzeVariety(slug);
    if (!va.error) {
      for (const w of va.warns) console.log(`AVISO: ${w}`);
      if (va.blocks.length && !flags.force) {
        console.error(`\nRENDER BLOQUEADO — ESTRUTURA REPETIDA (o site vai sair igual ao anterior):`);
        for (const b of va.blocks) console.error(`  - ${b}`);
        if (va.neverUsed.length) console.error(`\nSecoes que voce nunca usou (use 1-2): ${va.neverUsed.slice(0, 10).join(", ")}`);
        console.error(`Troque a variante do hero, mude a ordem e a composicao, e rode de novo. (--force pula, NAO recomendado.)`);
        process.exit(1);
      }
    }
    const file = resolve(dir, "index.html");
    writeFileSync(file, renderSpec(spec), "utf8");
    const nSec = (spec.sections || []).length;
    console.log(`RENDERIZADO da spec (${nSec} secoes) -> ${file}`);
    if (va.neverUsed && va.neverUsed.length) console.log(`(variedade futura: ainda sem uso — ${va.neverUsed.slice(0, 8).join(", ")})`);
    console.log(`PROXIMO: verifica-interface "${file}" + qa-visual + design-critique + teste anti-vibe-code; se ok, demo-publicar ${slug} --scope balmor-s-projects`);
  },
  async "demo-similar"() {
    const { rest } = parseFlags(args);
    const slug = rest[0];
    if (!slug) return console.error("uso: demo-similar <slug>  (compara a estrutura com as demos anteriores)");
    const a = analyzeVariety(slug);
    if (a.error) return console.error(a.error);
    for (const w of a.warns) console.log(`AVISO: ${w}`);
    if (a.neverUsed.length) console.log(`Secoes que voce AINDA NAO usou em nenhuma demo (fonte de variedade): ${a.neverUsed.slice(0, 10).join(", ")}`);
    if (a.blocks.length) {
      console.log(`\nESTRUTURA REPETIDA — nao siga assim:`);
      for (const b of a.blocks) console.log(`  - ${b}`);
      console.log(`\nREGENERE a spec com variacao REAL: troque a variante do hero, MUDE a ordem, e inclua 1-2 secoes que nunca usou (lista acima). Cada lead = espinha diferente.`);
      process.exit(1);
    }
    console.log(`OK — estrutura suficientemente diferente. Mais parecida: "${a.worst.slug || "nenhuma"}" (${a.worst.pct}%). Pode seguir.`);
  },
  async "demo-data"() {
    const { flags, rest } = parseFlags(args);
    if (!rest[0]) return console.error("uso: demo-data <place_id> [--site <url>]  (entrega dados+fotos+cor pra ESCREVER o HTML do zero)");
    const ctx = await api("GET", `/leads/${rest[0]}/context`);
    const p = ctx.place || {};
    const slug = slugify(p.name);
    const dir = resolve(ROOT, slug);
    // TRAVA DE CONCORRENCIA — uma demo por vez (a pasta compartilhada nao aguenta duas ao mesmo
    // tempo; foi o que quebrou o CYR x Bruna). Lock por slug; expira em 30min (build abandonado).
    const lockPath = resolve(ROOT, "_building.lock");
    const LOCK_TTL = 30 * 60 * 1000;
    if (existsSync(lockPath)) {
      let lock = {};
      try { lock = JSON.parse(readFileSync(lockPath, "utf8")); } catch {}
      const age = Date.now() - (lock.ts ? Date.parse(lock.ts) : 0);
      if (lock.slug && lock.slug !== slug && age < LOCK_TTL) {
        console.error(`OCUPADO — outra demo ("${lock.slug}") esta em producao ha ${Math.round(age / 60000)} min. FACA UMA DE CADA VEZ: espere ela publicar/cancelar (o demo-publicar libera), ou o lock expira sozinho em ${Math.round((LOCK_TTL - age) / 60000)} min. Nao comece esta agora.`);
        process.exit(1);
      }
    }
    writeFileSync(lockPath, JSON.stringify({ slug, ts: new Date().toISOString() }));
    mkdirSync(dir, { recursive: true });
    // vínculo demo->lead: o demo-publicar lê isso pra registrar no backend
    writeFileSync(resolve(dir, "lead.json"), JSON.stringify({ place_id: rest[0], nome: p.name, slug }, null, 2));
    if (existsSync(resolve(dir, "index.html"))) {
      console.log(`\n>>> JA EXISTE uma demo pra "${p.name}" em ${resolve(dir, "index.html")}`);
      console.log(`>>> CONFIRME com o Samuel: REGERAR do zero, so PUBLICAR a atual, ou AJUSTAR? Nao refaca sem confirmar.\n`);
    }
    let fotos = [], cor = flags.accent || null;
    let site = flags.site || p.website || null;
    if (!site) { site = await descobrirSite(p.name); if (site) console.log(`Site descoberto pelo nome (Google dizia sem site): ${site}`); }
    else if (!flags.site) console.log(`Usando o site do cadastro do lead: ${site}`);
    if (site) {
      console.log(`Baixando fotos reais de ${site} ...`);
      const sc = await scrapeImages(site, dir);
      fotos = sc.hero ? [sc.hero, ...sc.galeria] : sc.galeria;
      cor = cor || sc.color;
    }
    // material enviado pelo Samuel via interface (GERAR SITE) — PRIORIDADE sobre o raspado
    const upDir = resolve(UPLOADS, rest[0]);
    const enviadas = [];
    if (existsSync(upDir)) {
      mkdirSync(resolve(dir, "img"), { recursive: true });
      for (const f of readdirSync(upDir)) {
        if (!/\.(jpe?g|png|webp|gif|mp4|mov|webm)$/i.test(f)) continue;
        copyFileSync(resolve(upDir, f), resolve(dir, "img", `upload-${f}`));
        enviadas.push(`img/upload-${f}`);
      }
      if (enviadas.length) console.log(`${enviadas.length} arquivo(s) enviado(s) pela interface copiado(s) pra img/ — use com PRIORIDADE (material real do lead).`);
    }
    const out = {
      slug, pasta: dir, nome: p.name, segmento: p.category || "(inferir pelo nome)",
      bairro: bairro(p.address), nota: p.rating, avaliacoes: p.reviews_count,
      endereco: p.address, telefone: p.phone, whatsapp: waLink(p.phone),
      cor_detectada: cor || "(nenhuma cor detectada)",
      cor_profunda: cor ? darken(cor, 0.45) : null,
      fotos_enviadas_pelo_samuel: enviadas.length ? enviadas : undefined,
      fotos: fotos.length ? fotos : "(lead sem foto utilizavel — gere com image-generation ou peca assets do Instagram ao Samuel)",
      site_usado: site || "(nenhum site encontrado — confirme manualmente antes de assumir 'sem site')",
      brief_pra_escrever: resolve(dir, "BRIEF.md"),
      site_pra_escrever: resolve(dir, "index.html"),
    };
    console.log("\nMATERIAIS BRUTOS DA DEMO (ainda NAO confirmados):\n");
    console.log(JSON.stringify(out, null, 2));
    console.log(`\nATENCAO: a cor_detectada e um PALPITE do codigo — confirme a cor REAL olhando o LOGO do lead antes de usar.`);
    console.log(`PROXIMO PASSO (Diretor de Arte -> Criadora):`);
    console.log(`  1. CURE as fotos (olhe cada uma; descarte logo/icone/stock) e confirme a cor real pelo logo.`);
    console.log(`     >> POUCAS FOTOS ou lead SEM SITE (rede social)? Puxe do Instagram: demo-ig ${slug} <@handle> [qtd] (fotos reais em img/, prefixo ig-).`);
    console.log(`  2. BRIEF: rode 'demo-brief ${slug}' — invoca o NANAMI por gateway pra pesquisar referencias e escrever o BRIEF. NAO escreva o BRIEF voce mesma (quem faz direcao de arte e o Nanami).`);
    console.log(`  3. NOBARA: com o BRIEF pronto, escreva demos/${slug}/index.html DO ZERO (frontend-design) reimplementando o brief; stack conforme motion_tier (libs em demos/_stack-kit/, guia em referencias/web-stack-motion.md).`);
    console.log(`  4. QA: check.py + qa-visual (gera os screenshots pro Critico) -> demo-publicar ${slug} --scope balmor-s-projects (o Critico independente da a nota; voce NAO se auto-avalia).`);
  },
  async "demo-ig"() {
    // baixa FOTOS REAIS do Instagram do lead (gallery-dl + cookie) — pra leads sem site / rede social,
    // onde o demo-data --site nao acha foto. Salva em demos/<slug>/img/ com prefixo ig-.
    const { rest } = parseFlags(args);
    const slug = rest[0], alvo = rest[1], count = Number(rest[2]) || 12;
    if (!slug || !alvo) return console.error("uso: demo-ig <slug> <@handle|url do perfil> [qtd=12]  (baixa fotos reais do Instagram pra img/)");
    const dir = resolve(ROOT, slug);
    if (!existsSync(dir)) return console.error(`Pasta da demo nao existe: ${dir}. Rode demo-data <place_id> antes.`);
    const cookiePath = resolve(homedir(), ".openclaw", "ig-cookies.txt");
    const confPath = resolve(homedir(), ".config", "gallery-dl", "config.json");
    if (!existsSync(cookiePath)) return console.error(`SEM COOKIE do Instagram (${cookiePath}). Avise o Samuel pra reexportar o cookie do @leadhunter_bh.`);
    const imgDir = resolve(dir, "img"); mkdirSync(imgDir, { recursive: true });
    const handle = alvo.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "");
    const url = /^https?:\/\//i.test(alvo) ? alvo : `https://www.instagram.com/${handle}/`;
    const before = readdirSync(imgDir).filter((f) => f.startsWith("ig-")).length;
    console.log(`Baixando ate ${count} fotos de ${url} ...`);
    const gargs = ["--range", `1-${count}`, "-D", imgDir, url];
    if (existsSync(confPath)) gargs.unshift("--config", confPath);
    const r = spawnSync("gallery-dl", gargs, { encoding: "utf8", timeout: 240000 });
    const igs = readdirSync(imgDir).filter((f) => f.startsWith("ig-"));
    if (!igs.length) {
      console.error("Nenhuma foto baixada — provavel cookie expirado, perfil privado, ou handle errado:\n" + ((r.stderr || r.stdout || "").split("\n").slice(-6).join("\n")));
      process.exit(1);
    }
    console.log(`OK — ${Math.max(igs.length - before, igs.length)} foto(s) do Instagram salvas em img/ (prefixo ig-). Total: ${igs.length}.`);
    console.log(`NOBARA: CURE — fique so com as REAIS do negocio (fachada, equipe, resultado, ambiente); descarte print/meme/story/logo. Depois segue o fluxo normal.`);
  },
  async "demo-brief"() {
    // A': invoca o NANAMI (Diretor de Arte) por GATEWAY (nao por @mencao) pra escrever o BRIEF.
    // Handoff mecanico e confiavel: o codigo dispara o Nanami, nao a Nobara/@mencao.
    // --auto: quem chama e o demo-auto, que ja dirige a Nobara e escala falha. Avisar aqui
    // faria a cadeia autonoma tagarelar no Discord a cada etapa.
    const { flags, rest } = parseFlags(args);
    const auto = Boolean(flags.auto);
    const slug = rest[0];
    if (!slug) return console.error("uso: demo-brief <slug> [--auto]  (invoca o Nanami por gateway pra pesquisar referencias e escrever o BRIEF)");
    const dir = resolve(ROOT, slug);
    if (!existsSync(dir)) return console.error(`Pasta da demo nao existe: ${dir}. Rode demo-data <place_id> antes.`);
    let lead = {};
    try { lead = JSON.parse(readFileSync(resolve(dir, "lead.json"), "utf8")); } catch {}
    const fotos = existsSync(resolve(dir, "img")) ? readdirSync(resolve(dir, "img")).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f)) : [];
    const briefPath = resolve(dir, "BRIEF.md");
    const vbPath = resolve(dirname(fileURLToPath(import.meta.url)), "validate-brief.mjs");
    const hasBrand = existsSync(resolve(dir, "brand"));
    // ===== PASSE 1 de 2: o Nanami DESCOBRE referencias e escreve refs/urls.json =====
    // (Depois o ref-shot.py CAPTURA os prints reais; no passe 2 ele OLHA e escolhe o roubo pelo que VIU.)
    const refsDir = resolve(dir, "refs");
    const urlsPath = resolve(refsDir, "urls.json");
    const refShot = resolve(dirname(fileURLToPath(import.meta.url)), "ref-shot.py");
    mkdirSync(refsDir, { recursive: true });
    const p1 = `Voce e o Nanami (Diretor de Arte). PASSE 1 de 2 desta demo: DESCOBRIR referencias visuais REAIS pra voce OLHAR depois (nao inferir do texto).\n`
      + `Lead: ${lead.nome || slug} (segmento no lead.json). Pesquise (WebSearch) e escreva demos/${slug}/refs/urls.json = lista JSON de 8-12 referencias, cada item {"url","fonte","estetica","elemento","porque"}.\n`
      + `REGRAS pra a captura NAO tomar bloqueio de robo:\n`
      + `- PRIORIZE galerias curadas que SEMPRE renderizam: awwwards.com (paginas de categoria/tag/collection/SOTD), 21st.dev (animacao/componentes), godly.website, siteinspire.com, saaslandingpage.com. Sao ouro e nao bloqueiam.\n`
      + `- Ate ~4 podem ser sites individuais alvo do roubo, MAS varios (linear, apple, vercel...) bloqueiam robo — por isso a MAIORIA tem que ser galeria/curadoria.\n`
      + `- >=1 referencia de FORA do nicho (cross-pollination). Alinhe ao nicho do lead nas queries.\n`
      + `Escreva SO o refs/urls.json AGORA (JSON valido). NAO escreva o BRIEF ainda. Responda "urls prontas".`;
    console.log(`Passe 1: invocando o Nanami por gateway pra descobrir referencias (refs/urls.json) ...`);
    spawnSync("openclaw", ["agent", "--agent", "diretor-arte", "--message", p1, "--json", "--timeout", "600"], { encoding: "utf8", timeout: 660000 });
    // captura os prints reais das URLs que o Nanami escolheu
    let okRefs = [];
    if (existsSync(urlsPath)) {
      console.log(`Capturando screenshots das referencias (ref-shot.py) ...`);
      const rs = spawnSync(PY, [refShot, refsDir], { encoding: "utf8", timeout: 300000 });
      if ((rs.stdout || "").trim()) console.log(rs.stdout.trim());
      try { okRefs = JSON.parse(readFileSync(resolve(refsDir, "manifest.json"), "utf8")).filter((m) => m.ok); } catch {}
    } else {
      console.error("Nanami nao escreveu refs/urls.json no passe 1 — seguindo pro BRIEF com WebSearch (sem prints).");
    }
    const refsList = okRefs.length
      ? okRefs.map((m) => `  refs/${m.file}  <-  ${m.url}${m.elemento ? "  (" + m.elemento + ")" : ""}`).join("\n")
      : "(nenhum print capturado — use WebSearch e descreva com cuidado)";
    console.log(`Referencias capturadas com sucesso: ${okRefs.length}.`);

    // ===== PASSE 2 de 2: o Nanami OLHA os prints e escreve o BRIEF citando cada roubo por arquivo =====
    const basePrompt = `Voce e o Nanami (Diretor de Arte). PASSE 2 de 2: OLHE as referencias JA CAPTURADAS e escreva o BRIEF (seu SOUL diz como).\n`
      + `Lead: ${lead.nome || slug}. Pasta: demos/${slug}/ — ${fotos.length} foto(s) reais em img/ (${fotos.slice(0, 10).join(", ") || "nenhuma"}).\n`
      + `REFERENCIAS CAPTURADAS (imagens REAIS em demos/${slug}/refs/) — OLHE CADA UMA (voce tem visao), nao invente:\n${refsList}\n`
      + `Para CADA roubo do BRIEF, CITE o arquivo refs/NN.png de onde tirou e o que VIU nele (ex: "roubo: o hero split-screen de refs/03.png"). Escolha o roubo PELO QUE VIU na imagem, nao pela descricao textual.\n`
      + (hasBrand ? `IDENTIDADE VISUAL REAL em demos/${slug}/brand/ — LEIA o BRAND.md e OLHE logo/paleta. USE a cor/logo/tipografia REAIS: a LOGO tem que aparecer no HEADER e no FOOTER do site (imagem, ou o wordmark tipografado na fonte da marca + o simbolo). Nao chute cor nem use nome generico.\n` : "")
      + `MAQUETE CHEIA (impressiona, estilo agencia, ref cyrclinic ~14 secoes): prescreva ~12-16 secoes com substancia (serviços/o que faz + como funciona + galeria grande + diferenciais + prova social + FAQ + numeros + CTA). A OFERTA (o que o negocio faz) tem que ficar clara. Conteudo representativo pra encher e OK, mas ROTULE o ilustrativo como "exemplo" (nunca numero/depoimento inventado como real). Enxuto = xucro = reprovado.\n`
      + `Leia demos/_repetition-book.md e demos/_licoes-aprendidas.md e faca DIFERENTE das ultimas.\n`
      + `Escreva demos/${slug}/BRIEF.md pelo BRIEF-TEMPLATE.md, preenchendo TUDO (conceito, hero_strategy, primary_visual_move, image_treatment, "motion_tier: Tn" literal, stack, paleta, tipografia, mapa de secoes, roubos com refs/NN.png + instrucao de implementacao). Nao deixe campo vazio.\n`
      + `Responda so "BRIEF pronto" no fim.`;
    // ate 2 tentativas: se o BRIEF nao passar no validate-brief, reinvoca o Nanami com os erros
    let lastErr = "";
    for (let attempt = 1; attempt <= 2; attempt++) {
      const msg = attempt === 1 ? basePrompt
        : `${basePrompt}\n\nATENCAO: o BRIEF anterior FOI REPROVADO pelo validador. Corrija exatamente isto e reescreva demos/${slug}/BRIEF.md:\n${lastErr}`;
      console.log(`Passe 2: invocando o Nanami por gateway (tentativa ${attempt}) pra OLHAR os prints e escrever demos/${slug}/BRIEF.md ...`);
      const r = spawnSync("openclaw", ["agent", "--agent", "diretor-arte", "--message", msg, "--json", "--timeout", "600"], { encoding: "utf8", timeout: 660000 });
      if (!existsSync(briefPath)) { lastErr = "BRIEF.md nao foi criado."; console.error(`Nanami nao escreveu o BRIEF (tentativa ${attempt}).`); continue; }
      const vb = spawnSync("node", [vbPath, slug], { encoding: "utf8" });
      if (vb.status === 0) {
        console.log((vb.stdout || "").trim());
        console.log(`✅ BRIEF pronto e validado: ${briefPath}`);
        // Auto-chain deterministico: a Fundacao destila o BRIEF em tokens.css + motion-spec.md ANTES
        // de avisar a Nobara — assim quando ela comeca, o vocabulario ja esta pronto (e o trabalho
        // pesado roda na sessao da Fundacao, nao na dela). Nao-bloqueante se falhar.
        const tokensOk = rodarFundacao(slug, dir);
        console.log(`PROXIMO: Nobara escreve demos/${slug}/index.html DO BRIEF${tokensOk ? " (usando tokens.css)" : ""} -> demo-revisao -> demo-publicar.`);
        if (auto) return; // o demo-auto assume daqui: ele dirige a Nobara e escala sozinho
        avisarNobara(
          `O BRIEF de "${slug}" ficou PRONTO e passou no validate-brief (o Nanami entregou). ` +
          (tokensOk
            ? `A Fundacao ja destilou demos/${slug}/tokens.css + motion-spec.md — USE o tokens.css (nao reinvente cor/fonte). `
            : `A Fundacao NAO gerou os tokens desta vez — extraia o vocabulario do BRIEF na mao. `) +
          `Leia demos/${slug}/BRIEF.md e OLHE os refs/NN.png citados nele, e siga o fluxo: escreva demos/${slug}/index.html DO ZERO a partir do BRIEF ` +
          `(logo real no header e no footer), rode demo-revisao ${slug} (o Revisor faz o QA barato antes do Critico), corrija o que ele apontar, e me chame pra aprovar antes de publicar. ` +
          `Avise o Samuel no Discord que voce comecou e depois quando estiver pronto pra ele olhar.`
        );
        return;
      }
      lastErr = ((vb.stdout || "") + (vb.stderr || "")).trim();
      console.error(`BRIEF reprovado no validate-brief (tentativa ${attempt}):\n${lastErr}`);
    }
    console.error("Nanami nao entregou um BRIEF valido em 2 tentativas. Cheque o gateway (openclaw agent) e o BRIEF-TEMPLATE.");
    if (auto) process.exit(1); // quem escala e o demo-auto, com o motivo real
    // Falha tambem precisa avisar: sem isto ela espera pra sempre por um BRIEF que nunca vem.
    avisarNobara(
      `O demo-brief de "${slug}" FALHOU: o Nanami nao entregou um BRIEF valido em 2 tentativas. ` +
      `Ultimo erro do validate-brief: ${(lastErr || "(sem detalhe)").slice(0, 600)}. ` +
      `NAO escreva o BRIEF voce mesma. Avise o Samuel no Discord que o brief falhou, com esse motivo, e espere ele decidir.`
    );
    process.exit(1);
  },
  async "demo-fundacao"() {
    // Invoca a Fundacao (subagente da Nobara) pra destilar o BRIEF em tokens.css + motion-spec.md.
    // Normalmente roda automatico no fim do demo-brief; este comando permite re-rodar sozinho.
    const { rest } = parseFlags(args);
    const slug = rest[0];
    if (!slug) return console.error("uso: demo-fundacao <slug>  (invoca a Fundacao por gateway pra gerar tokens.css + motion-spec.md do BRIEF)");
    const dir = resolve(ROOT, slug);
    if (!existsSync(resolve(dir, "BRIEF.md"))) return console.error(`BRIEF.md nao existe em ${dir}. Rode demo-brief ${slug} antes.`);
    const ok = rodarFundacao(slug, dir);
    process.exit(ok ? 0 : 1);
  },
  async "demo-revisao"() {
    // Invoca o Revisor (subagente da Nobara) pra QA interno ANTES do Critico. Sai != 0 se "VOLTA".
    const { rest } = parseFlags(args);
    const slug = rest[0];
    if (!slug) return console.error("uso: demo-revisao <slug>  (invoca o Revisor por gateway pra QA barato antes do Critico)");
    const dir = resolve(ROOT, slug);
    if (!existsSync(resolve(dir, "index.html"))) return console.error(`index.html nao existe em ${dir}. A Nobara escreve o site DO BRIEF antes.`);
    const v = rodarRevisor(slug, dir);
    if (v.erro) { console.error(`Revisor indisponivel: ${v.erro}. Cheque o gateway (openclaw agent --agent revisor).`); process.exit(2); }
    if (v.pronto) { console.log(`Revisor: PRONTO PRO CRITICO ✓ — pode rodar demo-publicar ${slug}.`); process.exit(0); }
    console.error(`Revisor: VOLTA PRA NOBORA — corrija o que esta em demos/${slug}/_qa/revisao-interna.md antes do Critico.`);
    process.exit(1);
  },
  async "demo-auto"() {
    // Cadeia COMPLETA sem parar pra aprovacao: materiais -> Nanami -> Fundacao -> Nobara escreve
    // -> Revisor (ate 2 correcoes) -> Critico -> deploy -> UMA mensagem no Discord com o link.
    // Quem escolhe o lead continua sendo o Samuel: isto NAO varre a base sozinho.
    // Silencio no caminho feliz, barulho na falha — cadeia muda que falha as 3h nao avisa ninguem.
    const { flags, rest } = parseFlags(args);
    const placeId = rest[0];
    if (!placeId) return console.error("uso: demo-auto <place_id> [--site <url>] [--scope <time-vercel>]  (cadeia completa ate o deploy)");
    const MAX_CORRECOES = 2;
    const self = fileURLToPath(import.meta.url);
    const passo = (cmd, extra = []) =>
      spawnSync("node", [self, cmd, ...extra], { encoding: "utf8", timeout: 3_600_000 });
    const mostrar = (r) => ((r.stdout || "") + (r.stderr || "")).trim();

    const ctx = await api("GET", `/leads/${placeId}/context`);
    const nome = (ctx.place && ctx.place.name) || placeId;
    const slug = slugify(nome);
    const dir = resolve(ROOT, slug);
    console.log(`demo-auto: "${nome}" -> ${slug}`);

    const escalar = (etapa, motivo) => {
      const txt = String(motivo).replace(/\s+/g, " ").slice(0, 700);
      console.error(`\nESCALADO em ${etapa}: ${txt}`);
      avisarNobara(
        `A cadeia automatica da demo "${slug}" (${nome}) PAROU na etapa ${etapa}. Motivo: ${txt}. ` +
        `NAO tente resolver sozinha nem recomecar: conte isso pro Samuel aqui no Discord em uma mensagem curta e direta, ` +
        `com o motivo e o que voce sugere fazer, e espere ele decidir.`
      );
      process.exit(1);
    };

    // 1. MATERIAIS
    const rd = passo("demo-data", [placeId, ...(flags.site ? ["--site", String(flags.site)] : [])]);
    console.log(mostrar(rd).slice(-600));
    let fotos = [];
    try { fotos = readdirSync(resolve(dir, "img")); } catch {}
    if (!fotos.length) {
      escalar("materiais", `o lead nao tem foto utilizavel (site sem imagem raspavel e sem @handle valido no banco). ` +
        `Sem material real a demo sai generica — precisa de fotos do Instagram (demo-ig) ou de assets do proprio lead.`);
    }
    console.log(`Materiais: ${fotos.length} foto(s) reais ✓`);

    // 2. BRIEF (Nanami) + tokens (Fundacao) — o --auto silencia o aviso; quem dirige daqui sou eu
    const rb = passo("demo-brief", [slug, "--auto"]);
    console.log(mostrar(rb).slice(-900));
    if (rb.status !== 0) escalar("brief", `o Nanami nao entregou um BRIEF valido: ${mostrar(rb).slice(-400)}`);

    // 3. NOBARA ESCREVE (turno agentico, sem postar no Discord)
    console.log("Nobara: escrevendo o site a partir do BRIEF...");
    avisarNobara(
      `Escreva agora demos/${slug}/index.html DO ZERO a partir de demos/${slug}/BRIEF.md, usando demos/${slug}/tokens.css ` +
      `(nao reinvente cor/fonte) e OLHANDO os refs/NN.png citados no BRIEF. Logo real no header e no footer. ` +
      `Inclua os dados REAIS de contato do lead (endereco e telefone) — ha um gate que bloqueia a publicacao sem eles, ` +
      `e o CTA principal tem que abrir a conversa (wa.me com numero), nao so ancorar. ` +
      `NAO publique e NAO me responda no Discord: isto faz parte de uma cadeia automatica que segue sozinha. ` +
      `Quando terminar de escrever o arquivo, apenas pare.`,
      { entregar: false }
    );
    if (!existsSync(resolve(dir, "index.html"))) escalar("escrita", "a Nobara nao produziu o index.html.");

    // 4. REVISOR — ate MAX_CORRECOES voltas
    let aprovado = false;
    for (let volta = 0; volta <= MAX_CORRECOES; volta++) {
      const rr = passo("demo-revisao", [slug]);
      console.log(mostrar(rr).slice(-500));
      if (rr.status === 0) { aprovado = true; break; }
      if (rr.status === 2) escalar("revisor", `Revisor indisponivel: ${mostrar(rr).slice(-300)}`);
      if (volta === MAX_CORRECOES) {
        escalar("revisor", `o Revisor reprovou ${MAX_CORRECOES + 1}x seguidas. Isso costuma ser problema no BRIEF, nao no HTML. ` +
          `Ultimo parecer em demos/${slug}/_qa/revisao-interna.md`);
      }
      let parecer = "";
      try { parecer = readFileSync(resolve(dir, "_qa", "revisao-interna.md"), "utf8").slice(-2500); } catch {}
      console.log(`Revisor pediu correcao (volta ${volta + 1}/${MAX_CORRECOES}). Devolvendo pra Nobara...`);
      avisarNobara(
        `O Revisor REPROVOU demos/${slug}/index.html. Corrija TUDO que ele apontou e nao discuta o parecer. ` +
        `Parecer:\n${parecer}\n\nNAO publique e NAO me responda no Discord: cadeia automatica em andamento. ` +
        `Quando terminar de corrigir o arquivo, apenas pare.`,
        { entregar: false }
      );
    }
    if (!aprovado) escalar("revisor", "saiu do laco sem aprovacao."); // defensivo: nao deveria acontecer

    // 5. PUBLICAR (gates + Critico + deploy)
    const rp = passo("demo-publicar", [slug, ...(flags.scope ? ["--scope", String(flags.scope)] : [])]);
    const saidaPub = mostrar(rp);
    console.log(saidaPub.slice(-1200));
    if (rp.status !== 0) escalar("publicacao", saidaPub.slice(-600));
    const url = (saidaPub.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) || []).pop();
    if (!url) escalar("publicacao", `deploy terminou sem erro mas nao achei a URL na saida: ${saidaPub.slice(-300)}`);

    // 6. UNICA mensagem do caminho feliz
    console.log(`\ndemo-auto: CONCLUIDO — ${url}`);
    avisarNobara(
      `A demo de "${nome}" ficou pronta e esta NO AR: ${url}. Passou por todos os gates e pelo Critico independente. ` +
      `Avise o Samuel no Discord numa mensagem curta: o que voce fez de conceito visual (1-2 linhas, sem jargao), o link, ` +
      `e o que ele deve olhar antes de mandar pro lead.`
    );
  },
  async demo() {
    const { flags, rest } = parseFlags(args);
    if (!rest[0]) return console.error("uso: demo <place_id> [--site <url>] [--theme boutique|warm|bold|classic] [--anim aurora,textgen,marquee,parallax,hoverzoom,shimmer] [--headline ..] [--sobre ..] [--segmento ..] [--accent #hex] [--accent2 #hex]");
    const ctx = await api("GET", `/leads/${rest[0]}/context`);
    const slug = slugify(ctx.place && ctx.place.name);
    const dir = resolve(ROOT, slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "lead.json"), JSON.stringify({ place_id: rest[0], nome: ctx.place && ctx.place.name, slug }, null, 2));
    if (existsSync(resolve(dir, "index.html")) && !flags.force)
      console.log(`>>> JA EXISTE demo pra esse lead em ${resolve(dir, "index.html")} — confirme se quer REGERAR ou so PUBLICAR (use --force pra regerar sem aviso).`);

    let imagem = flags.imagem, galeria = [], brandColor = null;
    let site = flags.site || (ctx.place && ctx.place.website) || null;
    if (!site) { site = await descobrirSite(ctx.place && ctx.place.name); if (site) console.log(`  Site descoberto pelo nome: ${site}`); }
    if (site) {
      console.log(`Baixando fotos reais de ${site} ...`);
      const sc = await scrapeImages(site, dir);
      if (sc.hero) { imagem = sc.hero; galeria = sc.galeria; console.log(`  ${sc.total} fotos baixadas (hero + ${galeria.length} na galeria).`); }
      else console.log("  Nenhuma foto utilizavel encontrada no site.");
      brandColor = sc.color;
      if (brandColor) console.log(`  Cor da marca detectada no site: ${brandColor}`);
    }
    const accent = flags.accent || brandColor || undefined;
    const accent2 = flags.accent2 || (accent ? darken(accent, 0.45) : undefined);

    const opts = {
      headline: flags.headline, sobre: flags.sobre, segmento: flags.segmento,
      theme: flags.theme, animations: flags.anim ? String(flags.anim).split(",").map((s) => s.trim()) : undefined,
      imagem, galeria, accent, accent2,
    };
    const out = gerarDemo(ctx, opts);
    const file = resolve(dir, "index.html");
    writeFileSync(file, out.html, "utf8");
    console.log(`DEMO GERADA (${out.segmento})`);
    console.log(`  Negocio: ${out.nome}`);
    console.log(`  Tema: ${out.tema} | Cor: ${accent || "padrao do segmento"} | Animacoes: ${out.anims.join(", ") || "(so reveal/contador)"}`);
    console.log(`  WhatsApp no site: ${out.temWhats ? "sim" : "NAO (lead sem telefone)"}`);
    console.log(`  Fotos: hero=${imagem ? "sim" : "nao"} | galeria=${galeria.length}`);
    console.log(`  Arquivo: ${file}`);
    console.log(`\nRevise no navegador. Aprovou? Publica com: demo-publicar ${slug}`);
  },
  async "demo-publicar"() {
    const { flags, rest } = parseFlags(args);
    const slug = rest[0];
    if (!slug) return console.error("uso: demo-publicar <slug> [--scope <time-vercel>]");
    const dir = resolve(ROOT, slug);
    // LEDGER de auto-melhoria: registra todo BLOQUEIO de publicacao (sinal objetivo pro Analista aprender)
    const logBlock = (gate, reason) => {
      try { appendFileSync(resolve(ROOT, "_ledger.jsonl"), JSON.stringify({ ts: new Date().toISOString(), slug, gate, reason: String(reason).replace(/\s+/g, " ").slice(0, 300) }) + "\n"); } catch {}
    };
    if (!existsSync(resolve(dir, "index.html")))
      return console.error(`Demo nao encontrada em ${dir}. Gere antes com: demo <place_id> --site <url>`);
    // GATE DE QA — nao publica com bug bloqueante [ALTA] (a menos que --force)
    if (!flags.force) {
      // GATE DO BRIEF — sem BRIEF real (o "roubo" do Nanami) o site sai templateado.
      const bg = spawnSync("node", [resolve(dirname(fileURLToPath(import.meta.url)), "validate-brief.mjs"), slug], { encoding: "utf8" });
      if (bg.status !== 0) { // fail-safe: qualquer status != 0 (falha, uso invalido, spawn ENOENT) bloqueia
        console.error("PUBLICACAO BLOQUEADA — BRIEF ausente/incompleto (ou validador falhou):\n");
        console.error((bg.stdout || "") + (bg.stderr || "") + (bg.error ? String(bg.error) : ""));
        logBlock("brief", (bg.stdout || "") + (bg.stderr || ""));
        process.exit(1);
      }
      if ((bg.stdout || bg.stderr || "").trim()) console.log(((bg.stdout || "") + (bg.stderr || "")).trim());
      const checker = resolve(dirname(fileURLToPath(import.meta.url)), "..", "verifica-interface", "check.py");
      const qa = spawnSync(PY, [checker, resolve(dir, "index.html")], { encoding: "utf8" });
      if (qa.status === 2) {
        console.error("PUBLICACAO BLOQUEADA PELO QA — ha bug(s) bloqueante(s) [ALTA]:\n");
        console.error((qa.stdout || "") + (qa.stderr || ""));
        console.error("Corrija os [ALTA] e tente de novo. (--force ignora, NAO recomendado.)");
        logBlock("check", (qa.stdout || "").split("\n").filter((l) => l.includes("[ALTA]")).join(" | ") || "bug [ALTA]");
        process.exit(1);
      }
      console.log("QA: sem bug bloqueante ✓");
      // GATE DE CONVERSAO E CONTATO — deterministico, ver comentario da funcao
      const cc = await gateConversaoContato(slug, dir);
      if (cc.length) {
        console.error("PUBLICACAO BLOQUEADA — conversao/contato:\n");
        for (const b of cc) console.error(`  - ${b}`);
        console.error("Corrija: o CTA principal tem que abrir a conversa, e telefone/endereco reais do lead precisam aparecer. (--force ignora, NAO recomendado.)");
        logBlock("conversao-contato", cc.join(" | "));
        process.exit(1);
      }
      console.log("Conversao e contato: CTA vivo e dados reais do lead presentes ✓");
      // GATE VISUAL — nao publica site templateado (render.mjs) nem parecido demais com anterior
      const vg = spawnSync("node", [resolve(dirname(fileURLToPath(import.meta.url)), "visual-gate.mjs"), slug], { encoding: "utf8" });
      if (vg.status === 1) {
        console.error("PUBLICACAO BLOQUEADA PELO GATE VISUAL:\n");
        console.error((vg.stdout || "") + (vg.stderr || ""));
        console.error("Refaca o site do ZERO, visualmente diferente do anterior. (--force ignora, NAO recomendado.)");
        logBlock("visual-gate", (vg.stdout || "") + (vg.stderr || ""));
        process.exit(1);
      }
      console.log((vg.stdout || "").trim());
      // GATE REVISOR (triagem barata) — subagente da Nobara revisa ANTES de gastar o Critico.
      // Fail-open em erro de infra (o Critico ainda gate depois); hard-block so no veredito "VOLTA".
      const rev = rodarRevisor(slug, dir);
      if (rev.erro) {
        console.error(`AVISO: Revisor indisponivel (${rev.erro}) — seguindo pro Critico mesmo assim.`);
      } else if (!rev.pronto) {
        console.error(`PUBLICACAO BLOQUEADA PELO REVISOR — veredito "VOLTA PRA NOBORA". Veja demos/${slug}/_qa/revisao-interna.md, corrija e tente de novo. (--force ignora, NAO recomendado.)`);
        logBlock("revisor", (rev.texto || "").split("\n").filter((l) => /\[ALTA\]|\[MEDIA\]|VOLTA/i.test(l)).join(" | ").slice(0, 300));
        process.exit(1);
      } else {
        console.log("Revisor (triagem): PRONTO PRO CRITICO ✓");
      }
      // GATE CRAFT (nivel 2) — JUIZ INDEPENDENTE: o agente Critico (terceiro papel, != Nanami/Nobara)
      // avalia por gateway e escreve o veredito. Acaba o "corrige a propria prova" (craft auto-avaliado).
      const critPath = resolve(dir, "_qa", "critique.json");
      const qaDir = resolve(dir, "_qa");
      if (!existsSync(resolve(qaDir, "desktop.png"))) { // garante screenshots pro Critico OLHAR
        const qv = resolve(dirname(fileURLToPath(import.meta.url)), "..", "verifica-interface", "qa-visual.py");
        spawnSync(PY, [qv, resolve(dir, "index.html")], { encoding: "utf8" });
      }
      try { unlinkSync(critPath); } catch {} // remove qualquer critique auto-escrito; so vale o do Critico
      console.log("Chamando o Critico (juiz independente) por gateway pra avaliar o site...");
      const critMsg = `Julgue o demo "${slug}". Leia demos/${slug}/BRIEF.md e demos/${slug}/index.html, OLHE os screenshots demos/${slug}/_qa/desktop.png, mobile.png e tablet.png, e escreva demos/${slug}/_qa/critique.json no formato do seu SOUL (score, genericity_score, brief_execution_score, richness_score, missing_content, blockers, craft_issues, verdict). Seja impiedoso com GENERICO e com site XUCRO (poucas secoes / pouca info do que o negocio faz). Responda so "avaliado" no fim.`;
      const jc = spawnSync("openclaw", ["agent", "--agent", "critico", "--json", "--timeout", "300", "--message", critMsg], { encoding: "utf8", timeout: 340000 });
      if (!existsSync(critPath)) {
        console.error("PUBLICACAO BLOQUEADA — o Critico nao devolveu o veredito (_qa/critique.json). Saida:\n" + ((jc.stdout || "") + (jc.stderr || "")).slice(-500));
        logBlock("critico", "sem critique.json");
        process.exit(1);
      }
      let crit;
      try { crit = JSON.parse(readFileSync(critPath, "utf8")); }
      catch { console.error("_qa/critique.json invalido (JSON)."); logBlock("critico", "json invalido"); process.exit(1); }
      const gen = typeof crit.genericity_score === "number" ? crit.genericity_score : null;
      const exe = typeof crit.brief_execution_score === "number" ? crit.brief_execution_score : null;
      const rich = typeof crit.richness_score === "number" ? crit.richness_score : null;
      const reprovado = crit.verdict === "reprovado" || (crit.blockers || []).length
        || (typeof crit.score === "number" && crit.score < 8)
        || (gen !== null && gen >= 5) || (exe !== null && exe < 6)
        || (rich !== null && rich < 6);
      if (reprovado) {
        console.error(`PUBLICACAO BLOQUEADA PELO CRITICO — craft ${crit.score ?? "?"}/10, generico ${gen ?? "?"}/10, exec-brief ${exe ?? "?"}/10, riqueza ${rich ?? "?"}/10, veredito "${crit.verdict || "?"}".`);
        if ((crit.blockers || []).length) console.error("Blockers:\n- " + crit.blockers.join("\n- "));
        if ((crit.missing_content || []).length) console.error("Faltou do negocio: " + crit.missing_content.join("; "));
        if ((crit.craft_issues || []).length) console.error("Problemas: " + crit.craft_issues.join("; "));
        console.error("A Nobara refaz seguindo isto — o Critico e independente, nao afrouxe. (--force ignora, NAO recomendado.)");
        logBlock("critico", `craft ${crit.score}, gen ${gen}, exec ${exe}: ${(crit.craft_issues || crit.blockers || []).join("; ").slice(0, 200)}`);
        process.exit(1);
      }
      console.log(`Critico (independente): craft ${crit.score ?? "?"}/10, generico ${gen ?? "?"}/10, exec-brief ${exe ?? "?"}/10, riqueza ${rich ?? "?"}/10 — APROVADO ✓`);
      // ENFORCEMENT motion_tier x stack — three/GSAP so no tier que o BRIEF autorizou (guardrail mecanico)
      const briefPath = resolve(dir, "BRIEF.md");
      let tier = null;
      if (existsSync(briefPath)) {
        const tm = readFileSync(briefPath, "utf8").match(/motion[_ ]?tier\s*[:=]\s*`?\s*T([0-3])/i);
        tier = tm ? Number(tm[1]) : null;
      }
      const tierLabel = tier === null ? "nao declarado" : "T" + tier;
      if (existsSync(resolve(dir, "vendor", "three")) && tier !== 3) {
        console.error(`PUBLICACAO BLOQUEADA — vendor/three presente mas motion_tier=${tierLabel} (three.js/WebGL so em T3). Ou o Nanami declara 'motion_tier: T3' no BRIEF com justificativa espacial, ou remova o 3D.`);
        logBlock("tier", `vendor/three com motion_tier=${tierLabel}`);
        process.exit(1);
      }
      if ((existsSync(resolve(dir, "vendor", "gsap")) || existsSync(resolve(dir, "vendor", "lenis"))) && !(tier >= 2)) {
        console.error(`PUBLICACAO BLOQUEADA — vendor/gsap ou vendor/lenis presente mas motion_tier=${tierLabel} (GSAP/Lenis/ScrollTrigger so em T2+).`);
        logBlock("tier", `vendor/gsap|lenis com motion_tier=${tierLabel}`);
        process.exit(1);
      }
      // ANTI-CDN — o site do lead nao pode depender de terceiro; libs tem que ser vendoradas
      const _html = readFileSync(resolve(dir, "index.html"), "utf8");
      const FONT_HOSTS = /fonts\.googleapis\.com|fonts\.gstatic\.com|api\.fontshare\.com|fonts\.bunny\.net|use\.typekit\.net|p\.typekit\.net/i;
      const ext = [...new Set([...(_html.matchAll(/<(?:script|link)[^>]+(?:src|href)=["']https?:\/\/([^"'\/]+)/gi))]
        .map((m) => m[1]).filter((h) => !FONT_HOSTS.test(h)))];
      if (ext.length) {
        console.error(`PUBLICACAO BLOQUEADA — recurso EXTERNO (CDN) no index.html: ${ext.join(", ")}. Vendorize (copie a lib pra vendor/ e aponte o <script> pra la) — so CDN de FONTE (Google/Fontshare/Bunny/Typekit) e permitido.`);
        logBlock("cdn", `externo: ${ext.join(", ")}`);
        process.exit(1);
      }
    }
    // CONFIDENCIALIDADE: o deploy sobe a pasta inteira e a Vercel serve estatico — sem isto,
    // <slug>.vercel.app/BRIEF.md, /_qa/critique.json, /lead.json ficam PUBLICOS no site do lead
    // (analise interna, nota de craft, dados do lead). Escreve o .vercelignore ANTES de todo deploy.
    writeFileSync(resolve(dir, ".vercelignore"), [
      "# arquivos internos — NUNCA publicar no site do lead",
      "BRIEF.md", "spec.json", "lead.json", "_qa", "_qa/**",
      "*.bak", "*.bak-*", ".gitignore", "referencias", "MEMORY.md", "notas", "*.md.bak",
      ".published-url", "index.incompleto.bak.html",
      "",
    ].join("\n"), "utf8");
    const scope = flags.scope || process.env.VERCEL_SCOPE;
    const vargs = ["deploy", "--prod", "--yes"];
    if (scope) vargs.push("--scope", scope);
    console.log(`Publicando "${slug}" na Vercel${scope ? ` (scope ${scope})` : ""}... (.vercelignore protege arquivos internos)`);
    const r = spawnSync("vercel", vargs, { cwd: dir, shell: true, encoding: "utf8" });
    const out = `${r.stdout || ""}\n${r.stderr || ""}`;
    const url = (out.match(/https:\/\/[a-z0-9.-]+\.vercel\.app/gi) || []).pop();
    if (r.status !== 0 || !url) {
      if (/credential|log ?in|authenticat|token/i.test(out))
        console.error("NAO AUTENTICADO na Vercel. Rode uma vez no seu terminal:  ! vercel login");
      else
        console.error("Falha no deploy:\n" + out.slice(-700));
      process.exit(1);
    }
    // DESLIGA a Deployment Protection do projeto — projetos novos nascem protegidos (login da
    // Vercel) por padrao no time; sem isto o demo vai pro lead atras de tela de login.
    let pjson = {};
    try { pjson = JSON.parse(readFileSync(resolve(dir, ".vercel", "project.json"), "utf8")); } catch {}
    if (process.env.VERCEL_TOKEN && pjson.projectId) {
      try {
        await fetch(`https://api.vercel.com/v9/projects/${pjson.projectId}${pjson.orgId ? `?teamId=${pjson.orgId}` : ""}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${process.env.VERCEL_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ssoProtection: null }),
          signal: AbortSignal.timeout(15000),
        });
        console.log("Deployment Protection desligada (demo publica, sem login).");
        await new Promise((r) => setTimeout(r, 2500)); // propaga antes do check de 200
      } catch (e) { console.log(`(aviso: nao consegui desligar a protecao: ${(e && e.message) || e})`); }
    }
    // CHECK HTTP 200 — confirma que o link REALMENTE abre antes de dar como publicado.
    // (pega alias quebrado/protegido tipo o 307 do CYR — deploy sobe mas o site nao abre.)
    const pname = pjson.projectName || null;
    const liveUrl = pname ? `https://${pname}.vercel.app` : url;
    let live200 = false, lastStatus = "sem resposta";
    for (let i = 0; i < 5; i++) {
      try {
        const resp = await fetch(liveUrl, { redirect: "manual", signal: AbortSignal.timeout(10000) });
        lastStatus = String(resp.status);
        if (resp.status === 200) { live200 = true; break; }
      } catch (e) { lastStatus = String((e && e.message) || e); }
      await new Promise((r) => setTimeout(r, 2500));
    }
    if (!live200) {
      console.error(`PUBLICACAO NAO CONFIRMADA — ${liveUrl} respondeu ${lastStatus} (esperado 200). O deploy subiu mas o link NAO ABRE (alias quebrado/protegido). NAO registrei como publicado — cheque o projeto na Vercel.`);
      logBlock("publish-200", `${liveUrl} -> ${lastStatus}`);
      process.exit(1);
    }
    console.log(`\nPUBLICADO ✅ (link confirmado no ar, HTTP 200)`);
    console.log(`  Link ao vivo: ${liveUrl}`);
    console.log(`  Mande esse link no WhatsApp do lead (a prévia abre no celular dele).`);
    try { unlinkSync(resolve(ROOT, "_building.lock")); } catch {} // libera a trava de concorrencia
    // registra no backend: vincula demo->lead e move o CRM pra DEMO_PRONTA (best-effort)
    try {
      let placeId = null;
      const leadPath = resolve(dir, "lead.json");
      if (existsSync(leadPath)) placeId = JSON.parse(readFileSync(leadPath, "utf8")).place_id || null;
      const reg = await api("POST", "/demos/register", { slug, place_id: placeId, published_url: liveUrl });
      if (reg.registered) console.log(`  Registrado no Lead Hunter${reg.crm_moved ? " (CRM -> Demo pronta)" : ""}.`);
      else console.log(`  (nao vinculado a lead: ${reg.reason || "sem place_id"} — gere via demo-data pra vincular)`);
    } catch (e) {
      console.log(`  (aviso: nao consegui registrar no backend: ${e.message})`);
    }
  },
  async "demo-pedidos"() {
    // pedidos do botao GERAR SITE da interface — a Sukuna checa isso no heartbeat
    const pend = await api("GET", "/demo-requests?status=PENDING");
    const prog = await api("GET", "/demo-requests?status=IN_PROGRESS");
    if (!pend.length && !prog.length) return console.log("Nenhum pedido de site em aberto.");
    for (const r of [...pend, ...prog]) {
      console.log(`\n[${r.status}] #${r.id} ${r.place_name || r.place_id}  (pedido ${r.created_by ? "por " + r.created_by : ""})`);
      console.log(`  place_id: ${r.place_id}`);
      if (r.notes) console.log(`  instrucoes do Samuel: ${r.notes}`);
      if (r.files.length) console.log(`  ${r.files.length} arquivo(s) enviados em ${resolve(UPLOADS, r.place_id)} (o demo-data copia sozinho)`);
    }
    console.log(`\nFLUXO: demo-pedido-status <id> IN_PROGRESS -> demo-data <place_id> -> NANAMI (BRIEF) -> NOBARA (spec/render/QA) -> demo-publicar (fecha o pedido sozinho).`);
  },
  async "demo-pedido-status"() {
    const [id, status] = args;
    if (!id || !status) return console.error("uso: demo-pedido-status <id> <PENDING|IN_PROGRESS|PUBLISHED|CANCELLED>");
    const r = await api("POST", `/demo-requests/${id}/status?status=${status.toUpperCase()}`);
    console.log(`Pedido #${r.id} (${r.place_name || r.place_id}) -> ${r.status}`);
    if (r.status === "CANCELLED") { try { unlinkSync(resolve(ROOT, "_building.lock")); console.log("(trava de concorrencia liberada)"); } catch {} }
  },
  async crm() {
    const c = await api("GET", "/crm");
    if (!c.length) return console.log("CRM vazio. Rode 'promote' pra trazer os leads quentes.");
    const byStage = {};
    c.forEach((x) => ((byStage[x.stage] ??= []).push(x)));
    for (const [stage, items] of Object.entries(byStage)) {
      console.log(`\n[${stage}] (${items.length})`);
      items.forEach((x) => console.log(`  - ${x.name} (score ${x.score ?? "-"}, ${x.site_class || "-"}) id=${x.place_id}`));
    }
  },
  async promote() {
    const r = await api("POST", "/crm/promote");
    console.log(`Promovidos ao CRM: ${r.promoted} leads quentes.`);
  },
  async "audit-run"() {
    const r = await api("POST", "/audits/run?limit=50");
    console.log(`Auditados agora: ${r.length} sites.`);
  },
  async audit() {
    if (!args[0]) return console.error("uso: audit <place_id>  (auditoria + captura visual desktop/mobile)");
    const r = await api("POST", `/leads/${encodeURIComponent(args[0])}/audit?screenshots=true`);
    console.log(`Auditado: ${r.site_class} | https=${r.https} responsivo=${r.responsive} ${r.response_time_s ?? "-"}s`);
    const ctx = await api("GET", `/leads/${encodeURIComponent(args[0])}/context`);
    const a = ctx.audit || {};
    for (const s of a.screenshots || []) console.log(`  print ${s.viewport}: ${BASE}${s.path}`);
    for (const i of a.issues || []) console.log(`  [${i.severity}] ${i.type}: ${i.description}`);
  },
  async "score-run"() {
    const r = await api("POST", "/scores/run?limit=200");
    console.log(`Scoreados agora: ${r.length} leads.`);
  },
  async get() {
    if (!args[0]) return console.error("uso: get <path>");
    console.log(JSON.stringify(await api("GET", args[0]), null, 2));
  },
  async post() {
    if (!args[0]) return console.error("uso: post <path> [json]");
    console.log(JSON.stringify(await api("POST", args[0], args[1] ? JSON.parse(args[1]) : undefined), null, 2));
  },
  help() {
    console.log("Comandos: status | leads [N] | lead <id> | draft <id> | demo-pedidos | demo-pedido-status <id> <status> | demo-data <id> [--site] | demo-ig <slug> <@handle> [qtd] | demo-render <spec> | demo-similar <slug> | demo <id> [--flags] | demo-auto <id> [--site] [--scope] | demo-brief <slug> | demo-fundacao <slug> | demo-revisao <slug> | demo-publicar <slug> | crm | promote | audit <id> | audit-run | score-run | get <path> | post <path> [json]");
  },
};

(run[cmd] || run.help)().catch((e) => {
  console.error(e);
  process.exit(1);
});
