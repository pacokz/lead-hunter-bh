#!/usr/bin/env node
// Lead Hunter BH — cliente CLI pra Sukuna operar o backend (FastAPI em localhost:8000).
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, unlinkSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import { gerarDemo, slugify, waLink, bairro } from "./demo.mjs";
import { renderSpec } from "./render.mjs";
const BASE = process.env.LH_API || "http://localhost:8000";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "demos");

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
function signature(spec) {
  return {
    ts: (spec.art_direction && spec.art_direction.type_system) || "",
    secs: (spec.sections || []).map((s) => s.type + (s.variant ? ":" + s.variant : "")),
  };
}
function lcsLen(a, b) {
  const n = b.length; const dp = Array(n + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    let prev = 0;
    for (let j = 1; j <= n; j++) { const tmp = dp[j]; dp[j] = a[i - 1] === b[j - 1] ? prev + 1 : Math.max(dp[j], dp[j - 1]); prev = tmp; }
  }
  return dp[n];
}
function similarity(a, b) {
  const tsScore = a.ts === b.ts ? 0.35 : 0;
  const seqSim = lcsLen(a.secs, b.secs) / Math.max(a.secs.length, b.secs.length, 1);
  return tsScore + 0.65 * seqSim;
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
    spawnSync("python", [py, siteUrl, destDir, String(max)], { encoding: "utf8", timeout: 90000 });
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
        `(cd C:\\01-hermes\\Lead-hunter && docker compose up -d)\n${e.message}`
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
    const { rest } = parseFlags(args);
    if (!rest[0]) return console.error("uso: demo-render <arquivo-spec.json>  (renderiza o site a partir da SPEC que voce escreveu)");
    let spec;
    try { spec = JSON.parse(readFileSync(rest[0], "utf8")); }
    catch (e) { console.error("spec invalida (JSON):", e.message); process.exit(1); }
    const slug = (spec.meta && (spec.meta.slug || slugify(spec.meta.nome))) || "demo";
    const dir = resolve(ROOT, slug);
    mkdirSync(dir, { recursive: true });
    const file = resolve(dir, "index.html");
    writeFileSync(file, renderSpec(spec), "utf8");
    const nSec = (spec.sections || []).length;
    console.log(`RENDERIZADO da spec (${nSec} secoes) -> ${file}`);
    console.log(`PROXIMO: verifica-interface "${file}" + design-critique; se ok, demo-publicar ${slug} --scope balmor-s-projects`);
  },
  async "demo-similar"() {
    const { rest } = parseFlags(args);
    const slug = rest[0];
    if (!slug) return console.error("uso: demo-similar <slug>  (compara a estrutura com as demos anteriores)");
    const specPath = resolve(ROOT, slug, "spec.json");
    if (!existsSync(specPath)) return console.error(`spec.json nao encontrada em demos/${slug}/ (escreva a spec antes)`);
    let sig;
    try { sig = signature(JSON.parse(readFileSync(specPath, "utf8"))); }
    catch (e) { return console.error("spec invalida:", e.message); }
    let worst = { slug: null, score: 0 };
    for (const d of readdirSync(ROOT, { withFileTypes: true })) {
      if (!d.isDirectory() || d.name === slug) continue;
      const sp = resolve(ROOT, d.name, "spec.json");
      if (!existsSync(sp)) continue;
      try {
        const sc = similarity(sig, signature(JSON.parse(readFileSync(sp, "utf8"))));
        if (sc > worst.score) worst = { slug: d.name, score: sc };
      } catch {}
    }
    const pct = Math.round(worst.score * 100);
    if (worst.score >= 0.75) {
      console.log(`MUITO PARECIDA com "${worst.slug}" (${pct}% de estrutura igual).`);
      console.log("REGENERE a spec com variacao real: troque a variante do hero, MUDE a ordem das secoes, troque o type_system, e/ou adicione-remova secoes (testimonial, steps, feature, faq, banner). Cada lead = espinha diferente.");
      process.exit(1);
    }
    console.log(`OK — estrutura suficientemente diferente. Mais parecida: "${worst.slug || "nenhuma"}" (${pct}%). Pode seguir.`);
  },
  async "demo-data"() {
    const { flags, rest } = parseFlags(args);
    if (!rest[0]) return console.error("uso: demo-data <place_id> [--site <url>]  (entrega dados+fotos+cor pra ESCREVER o HTML do zero)");
    const ctx = await api("GET", `/leads/${rest[0]}/context`);
    const p = ctx.place || {};
    const slug = slugify(p.name);
    const dir = resolve(ROOT, slug);
    mkdirSync(dir, { recursive: true });
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
    const out = {
      slug, pasta: dir, nome: p.name, segmento: p.category || "(inferir pelo nome)",
      bairro: bairro(p.address), nota: p.rating, avaliacoes: p.reviews_count,
      endereco: p.address, telefone: p.phone, whatsapp: waLink(p.phone),
      cor_marca: cor || "(sem site/cor — escolha pela referencia do nicho)",
      cor_profunda: cor ? darken(cor, 0.45) : null,
      fotos: fotos.length ? fotos : "(lead sem foto utilizavel — gere com image-generation)",
      site_usado: site || "(nenhum site encontrado — confirme manualmente antes de assumir 'sem site')",
      arquivo_pra_criar: resolve(dir, "index.html"),
    };
    console.log("\nMATERIAIS PRA CRIAR A DEMO DO ZERO:\n");
    console.log(JSON.stringify(out, null, 2));
    console.log(`\nPROXIMO PASSO: escreva o index.html do ZERO (skill frontend-design + referencias/<nicho>.md), use as fotos reais (caminho relativo: img/...), a cor da marca e a prova social do Google. Depois rode: verifica-interface, design-critique e demo-publicar ${slug} --scope balmor-s-projects.`);
  },
  async demo() {
    const { flags, rest } = parseFlags(args);
    if (!rest[0]) return console.error("uso: demo <place_id> [--site <url>] [--theme boutique|warm|bold|classic] [--anim aurora,textgen,marquee,parallax,hoverzoom,shimmer] [--headline ..] [--sobre ..] [--segmento ..] [--accent #hex] [--accent2 #hex]");
    const ctx = await api("GET", `/leads/${rest[0]}/context`);
    const slug = slugify(ctx.place && ctx.place.name);
    const dir = resolve(ROOT, slug);
    mkdirSync(dir, { recursive: true });
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
    if (!existsSync(resolve(dir, "index.html")))
      return console.error(`Demo nao encontrada em ${dir}. Gere antes com: demo <place_id> --site <url>`);
    // GATE DE QA — nao publica com bug bloqueante [ALTA] (a menos que --force)
    if (!flags.force) {
      const checker = resolve(dirname(fileURLToPath(import.meta.url)), "..", "verifica-interface", "check.py");
      const qa = spawnSync("python", [checker, resolve(dir, "index.html")], { encoding: "utf8" });
      if (qa.status === 2) {
        console.error("PUBLICACAO BLOQUEADA PELO QA — ha bug(s) bloqueante(s) [ALTA]:\n");
        console.error((qa.stdout || "") + (qa.stderr || ""));
        console.error("Corrija os [ALTA] e tente de novo. (--force ignora, NAO recomendado.)");
        process.exit(1);
      }
      console.log("QA: sem bug bloqueante ✓");
    }
    const scope = flags.scope || process.env.VERCEL_SCOPE;
    const vargs = ["deploy", "--prod", "--yes"];
    if (scope) vargs.push("--scope", scope);
    console.log(`Publicando "${slug}" na Vercel${scope ? ` (scope ${scope})` : ""}...`);
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
    console.log(`\nPUBLICADO ✅`);
    console.log(`  Link ao vivo: ${url}`);
    console.log(`  Mande esse link no WhatsApp do lead (a prévia abre no celular dele).`);
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
    console.log("Comandos: status | leads [N] | lead <id> | draft <id> | demo-data <id> [--site] | demo-render <spec> | demo-similar <slug> | demo <id> [--flags] | demo-publicar <slug> | crm | promote | audit <id> | audit-run | score-run | get <path> | post <path> [json]");
  },
};

(run[cmd] || run.help)().catch((e) => {
  console.error(e);
  process.exit(1);
});
