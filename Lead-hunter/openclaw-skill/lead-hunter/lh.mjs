#!/usr/bin/env node
// Lead Hunter BH — cliente CLI pra Sukuna operar o backend (FastAPI em localhost:8000).
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, unlinkSync, statSync, copyFileSync, appendFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { gerarDemo, slugify, waLink, bairro } from "./demo.mjs";
import { renderSpec } from "./render.mjs";
const BASE = process.env.LH_API || "http://localhost:8000";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "demos");
const PY = process.platform === "win32" ? "python" : "python3"; // VPS Linux so tem python3
// uploads do GERAR SITE (fotos/videos que o Samuel sobe pela interface, por place_id)
const UPLOADS = process.env.DEMO_UPLOADS_DIR
  || (process.platform === "win32" ? resolve(ROOT, "..", "demo-uploads") : "/home/hermes/.openclaw/demo-uploads");

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
    console.log(`  2. NANAMI: pesquise referencias AMPLAS AGORA (WebSearch, min. 4) — os melhores sites de QUALQUER nicho`);
    console.log(`     (awwwards.com PRIMEIRO; depois land-book/recent.design). Animacao: 21st.dev primeiro. De cada uma, um ROUBO concreto com URL. Pelo menos 1 de FORA do nicho.`);
    console.log(`  3. NANAMI: escreva demos/${slug}/BRIEF.md pelo modelo BRIEF-TEMPLATE.md (passe o checklist, incluindo motion_tier + stack) — o site NAO nasce sem ele.`);
    console.log(`  4. NOBARA: escreva demos/${slug}/index.html DO ZERO (frontend-design) reimplementando o brief; stack conforme motion_tier (libs vendoradas em demos/_stack-kit/, guia em referencias/web-stack-motion.md) -> QA (check.py + qa-visual, escreva _qa/critique.json) -> demo-publicar ${slug} --scope balmor-s-projects.`);
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
      // GATE CRAFT (nivel 2) — revisao visual com NOTA: exige _qa/critique.json da rubrica QA-VISUAL.md
      const critPath = resolve(dir, "_qa", "critique.json");
      if (!existsSync(critPath)) {
        console.error("PUBLICACAO BLOQUEADA — falta a REVISAO VISUAL. Rode qa-visual (screenshots desktop/mobile),");
        console.error("avalie pela rubrica QA-VISUAL.md e escreva demos/" + slug + "/_qa/critique.json:");
        console.error('  {"score": 0-10, "blockers": ["bug grave..."], "craft_issues": ["..."], "hero_strategy": "..."}');
        process.exit(1);
      }
      let crit;
      try { crit = JSON.parse(readFileSync(critPath, "utf8")); }
      catch { console.error("_qa/critique.json invalido (JSON)."); process.exit(1); }
      if ((crit.blockers || []).length) {
        console.error("PUBLICACAO BLOQUEADA — blockers na revisao visual:\n- " + crit.blockers.join("\n- "));
        process.exit(1);
      }
      if (typeof crit.score === "number" && crit.score < 7) {
        console.error(`PUBLICACAO BLOQUEADA — craft score ${crit.score}/10 (< 7). Motivos: ${(crit.craft_issues || []).join("; ")}.`);
        console.error("Melhore hierarquia/espacamento/composicao e reavalie. (--force ignora, NAO recomendado.)");
        logBlock("craft", `score ${crit.score}/10: ${(crit.craft_issues || []).join("; ")}`);
        process.exit(1);
      }
      console.log(`Revisao visual: craft ${crit.score ?? "?"}/10 ✓`);
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
    console.log("Comandos: status | leads [N] | lead <id> | draft <id> | demo-pedidos | demo-pedido-status <id> <status> | demo-data <id> [--site] | demo-render <spec> | demo-similar <slug> | demo <id> [--flags] | demo-publicar <slug> | crm | promote | audit <id> | audit-run | score-run | get <path> | post <path> [json]");
  },
};

(run[cmd] || run.help)().catch((e) => {
  console.error(e);
  process.exit(1);
});
