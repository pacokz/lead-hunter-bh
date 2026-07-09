// Lead Hunter BH — gerador de demo de site (HTML self-contained, mobile-first).
// SISTEMA PARAMETRIZADO: a Criadora (Nobara) configura TEMA + TOKENS + ANIMAÇÕES por nicho.
// Tema = par de fontes + raio + clima. Animações = conjunto que ela escolhe (varia por nicho).
// Base: skill frontend-design + 21st.dev/Aceternity (reimplementado vanilla) + referências.

export function slugify(name) {
  let s = (name || "negocio")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  // cap CURTO (Vercel trunca subdominio de nome longo -> alias {name}.vercel.app quebra/404).
  // corta no fim de uma palavra e TIRA hifen das pontas DEPOIS do corte (o bug do "...-e-").
  if (s.length > 32) s = s.slice(0, 32).replace(/-[^-]*$/, "");
  s = s.replace(/^-+|-+$/g, "");
  return s || "negocio";
}

export function waLink(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  if (d.startsWith("55") && d.length >= 12) return "https://wa.me/" + d;
  return d ? "https://wa.me/" + d : null;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ── TEMAS: par de fontes distintas (nada de Inter/Poppins) + raio + forma do hero ──
// Cada tema controla a PALETA inteira (bg/ink/surface/line/muted) + fontes + raio.
// Direcoes ampliadas a partir dos "8 aesthetic anchors" (swiss/organic/mono).
export const THEMES = {
  boutique: {
    display: "Fraunces", df: "serif", body: "Hanken Grotesk",
    import: "family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600",
    radius: "20px", heroRadius: "200px 200px 22px 22px", weightDisplay: 500,
    bg: "#F7F3EA", ink: "#23291F", surface: "#FCFAF3", line: "#E6DECC", muted: "#6E685A",
  },
  warm: {
    display: "Bricolage Grotesque", df: "sans-serif", body: "Nunito Sans",
    import: "family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Nunito+Sans:wght@400;600;700",
    radius: "28px", heroRadius: "28px", weightDisplay: 600,
    bg: "#F6EFE4", ink: "#2A2620", surface: "#FCF7EE", line: "#E7DCC9", muted: "#6E6655",
  },
  bold: {
    display: "Syne", df: "sans-serif", body: "Hanken Grotesk",
    import: "family=Syne:wght@500;600;700;800&family=Hanken+Grotesk:wght@400;500;600",
    radius: "12px", heroRadius: "14px", weightDisplay: 700,
    bg: "#F4F2EC", ink: "#16160F", surface: "#FFFFFF", line: "#E3E0D6", muted: "#5E5C52",
  },
  classic: {
    display: "Lora", df: "serif", body: "IBM Plex Sans",
    import: "family=Lora:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600",
    radius: "8px", heroRadius: "10px", weightDisplay: 600,
    bg: "#F5F3EE", ink: "#1F242B", surface: "#FFFFFF", line: "#E4E1D9", muted: "#5F6168",
  },
  // SWISS — grid minimalista, branco puro, grotesca neutra, acento marcante, cantos retos
  swiss: {
    display: "Archivo", df: "sans-serif", body: "Archivo",
    import: "family=Archivo:wght@400;500;600;700;800",
    radius: "4px", heroRadius: "6px", weightDisplay: 700,
    bg: "#FFFFFF", ink: "#111111", surface: "#F4F4F4", line: "#E6E6E6", muted: "#5A5A5A",
  },
  // ORGANIC — terrosos REAIS (areia/argila, nao creme), serif humanista, muito arredondado
  organic: {
    display: "Newsreader", df: "serif", body: "Hanken Grotesk",
    import: "family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&family=Hanken+Grotesk:wght@400;500;600",
    radius: "24px", heroRadius: "180px 180px 28px 28px", weightDisplay: 500,
    bg: "#EEE6D4", ink: "#2E2A20", surface: "#F6EFE0", line: "#DDD2BB", muted: "#6B6150",
  },
  // MONO/INDUSTRIAL — concreto claro, fonte monospace, techo/flat, sinal forte
  mono: {
    display: "Space Mono", df: "monospace", body: "Hanken Grotesk",
    import: "family=Space+Mono:wght@400;700&family=Hanken+Grotesk:wght@400;500;600",
    radius: "6px", heroRadius: "8px", weightDisplay: 700,
    bg: "#F1F0EC", ink: "#161616", surface: "#FAFAF8", line: "#DEDDD6", muted: "#5C5C55",
  },
};
const ALL_ANIMS = ["aurora", "textgen", "marquee", "parallax", "hoverzoom", "shimmer"];

// Temas COMPATÍVEIS por nicho — pra dois leads do mesmo nicho não saírem iguais.
// A escolha é determinística pelo place_id (mesmo lead = mesmo tema sempre).
const NICHE_THEMES = {
  odontologia: ["boutique", "warm", "classic", "organic"],
  estetica: ["boutique", "organic", "warm", "swiss"],
  alimentacao: ["bold", "warm", "organic"],
  advocacia: ["classic", "swiss", "boutique"],
  automotivo: ["bold", "mono", "swiss"],
  saude: ["warm", "organic", "boutique"],
  geral: ["boutique", "swiss", "classic", "organic", "bold"],
};
function pickFrom(arr, seed) {
  let h = 0; const s = String(seed || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

// ── SEGMENTOS: cor da marca, copy, serviços + tema e animações PADRÃO (a Criadora troca) ──
const SEGMENTOS = [
  { re: /odonto|dentist|dental|implante|ortodont|sorriso/i, key: "odontologia",
    label: "Odontologia", brand: "#8A9B6E", deep: "#2E3A2A", theme: "boutique",
    anims: ["aurora", "textgen", "marquee", "parallax", "hoverzoom"],
    tagline: "Sorrisos que contam histórias verdadeiras",
    sobre: "Atendimento exclusivo e personalizado na Savassi, com tecnologia de ponta e o cuidado de quem ama o que faz. Aqui cada sorriso é tratado como único — do primeiro contato ao resultado final.",
    servicos: [
      { t: "Odontologia estética", d: "Lentes, facetas e harmonização para o seu melhor sorriso." },
      { t: "Ortodontia & Invisalign", d: "Alinhadores transparentes e aparelhos com acompanhamento próximo." },
      { t: "Implantes", d: "Reabilitação completa com soluções modernas e duradouras." },
      { t: "Tratamento de canal", d: "Endodontia precisa, sem dor e com tecnologia de imagem." },
      { t: "Limpeza & clareamento", d: "Saúde e brilho com protocolos seguros e profissionais." },
      { t: "Próteses", d: "Funcionalidade e naturalidade que devolvem a confiança." },
    ] },
  { re: /restaurante|bar|boteco|comida|farofa|gastr|cozinha|lanche|pizza|hamburg|açai|acai|cafe|café|padaria|doceria|confeitar/i, key: "alimentacao",
    label: "Gastronomia", brand: "#C2683B", deep: "#3A2317", theme: "bold",
    anims: ["marquee", "textgen", "parallax", "hoverzoom", "shimmer"],
    tagline: "Sabor que vira lembrança",
    sobre: "Ingredientes selecionados, receitas com alma e um atendimento que faz você se sentir em casa. Cada prato é preparado para ser inesquecível.",
    servicos: [
      { t: "Cardápio", d: "Pratos preparados na hora, com ingredientes frescos." },
      { t: "Delivery", d: "Peça pelo WhatsApp e receba quentinho onde estiver." },
      { t: "Reservas", d: "Garanta sua mesa para aquele momento especial." },
      { t: "Eventos", d: "Encomendas e festas com o nosso toque especial." },
    ] },
  { re: /estetic|estét|beleza|salao|salão|cabel|barbe|unha|sobrancelha|depila|spa|massag/i, key: "estetica",
    label: "Estética & Beleza", brand: "#B98AA0", deep: "#3A2430", theme: "boutique",
    anims: ["aurora", "textgen", "parallax", "hoverzoom"],
    tagline: "Sua melhor versão, todo dia",
    sobre: "Um espaço pensado para o seu bem-estar e autoestima. Profissionais qualificados, produtos de qualidade e aquele cuidado que você merece.",
    servicos: [
      { t: "Tratamentos faciais", d: "Pele renovada com protocolos modernos." },
      { t: "Cabelo & beleza", d: "Cortes, coloração e cuidados completos." },
      { t: "Unhas", d: "Manicure e pedicure com capricho e higiene." },
      { t: "Bem-estar", d: "Massagens e relaxamento para recarregar." },
    ] },
  { re: /advoc|advog|direito|juríd|juridic|contab|cont[aá]bil/i, key: "advocacia",
    label: "Advocacia", brand: "#9A8C6A", deep: "#252119", theme: "classic",
    anims: ["parallax"],
    tagline: "Seus direitos em mãos seguras",
    sobre: "Atuação séria, ética e próxima do cliente. Transformamos questões jurídicas complexas em soluções claras, com transparência em cada etapa.",
    servicos: [
      { t: "Consultoria", d: "Orientação jurídica clara para suas decisões." },
      { t: "Ações & defesas", d: "Acompanhamento completo do seu processo." },
      { t: "Contratos", d: "Análise e elaboração com segurança jurídica." },
      { t: "Atendimento", d: "Perto de você, respondendo quando precisa." },
    ] },
  { re: /oficina|auto|mecanic|mecânic|funilaria|pneu|carro|veicul/i, key: "automotivo",
    label: "Automotivo", brand: "#C24631", deep: "#2A1410", theme: "bold",
    anims: ["marquee", "parallax", "hoverzoom", "shimmer"],
    tagline: "Seu carro em mãos de confiança",
    sobre: "Serviço honesto, diagnóstico transparente e mão de obra qualificada. Seu veículo cuidado como se fosse o nosso.",
    servicos: [
      { t: "Mecânica geral", d: "Revisão e reparos com peças de qualidade." },
      { t: "Diagnóstico", d: "Avaliação precisa antes de qualquer serviço." },
      { t: "Manutenção", d: "Mantenha seu carro seguro e em dia." },
      { t: "Orçamento", d: "Sem surpresa: você aprova antes." },
    ] },
  { re: /clinic|clínic|saude|saúde|fisio|psico|nutri|medic|médic|terapia|pediatr|infantil|pet|veterin/i, key: "saude",
    label: "Saúde & Bem-estar", brand: "#6E9B8A", deep: "#1E3A33", theme: "warm",
    anims: ["textgen", "parallax", "hoverzoom"],
    tagline: "Cuidar de você é a nossa missão",
    sobre: "Atendimento humano e profissional, focado no seu bem-estar. Estrutura acolhedora e uma equipe pronta para cuidar da sua saúde.",
    servicos: [
      { t: "Consultas", d: "Atendimento atencioso e no seu tempo." },
      { t: "Acompanhamento", d: "Cuidado contínuo e personalizado." },
      { t: "Estrutura", d: "Ambiente moderno, limpo e acolhedor." },
      { t: "Agendamento", d: "Marque pelo WhatsApp, rápido e fácil." },
    ] },
];

const SEGMENTO_DEFAULT = {
  key: "geral", label: "Negócio local", brand: "#7E8B6A", deep: "#26291F", theme: "boutique",
  anims: ["textgen", "parallax", "hoverzoom"],
  tagline: "Qualidade e confiança perto de você",
  sobre: "Um trabalho feito com dedicação e atenção a cada cliente. Compromisso com qualidade e um atendimento que faz a diferença.",
  servicos: [
    { t: "Atendimento", d: "Perto de você, do jeito que você precisa." },
    { t: "Qualidade", d: "Compromisso com o melhor em cada detalhe." },
    { t: "Confiança", d: "Reputação construída com clientes satisfeitos." },
    { t: "Contato", d: "Fale com a gente de forma rápida e direta." },
  ],
};

export function inferSegment(name) {
  for (const s of SEGMENTOS) if (s.re.test(name || "")) return s;
  return SEGMENTO_DEFAULT;
}

export function bairro(address) {
  if (!address) return "";
  for (const b of address.split(" - ")) {
    const c = b.split(",");
    if (c.length >= 2 && /belo horizonte|^\s*bh\s*$/i.test(c[1])) return c[0].trim();
  }
  const m = address.split(" - ");
  if (m.length >= 3) return m[m.length - 3].trim();
  return "";
}

// context = /leads/<id>/context ; opts = overrides da Criadora (theme, animations[], accent, etc.)
export function gerarDemo(context, opts = {}) {
  const p = context.place || {};
  const seg = opts.segmento
    ? (SEGMENTOS.find((s) => s.key === opts.segmento) || SEGMENTO_DEFAULT)
    : inferSegment(p.name);

  const themeKey = opts.theme || pickFrom(NICHE_THEMES[seg.key] || [seg.theme || "boutique"], p.place_id || p.name);
  const theme = THEMES[themeKey] || THEMES.boutique;
  const animList = (Array.isArray(opts.animations) && opts.animations.length ? opts.animations : seg.anims)
    .filter((a) => ALL_ANIMS.includes(a));
  const A = new Set(animList);
  const on = (k) => A.has(k);

  const nome = p.name || "Seu Negócio";
  const brand = opts.accent || seg.brand;
  const deep = opts.accent2 || seg.deep;
  const tagline = opts.headline || seg.tagline;
  const sobre = opts.sobre || seg.sobre;
  const servicos = opts.servicos || seg.servicos;
  const galeria = Array.isArray(opts.galeria) ? opts.galeria : [];
  const rating = p.rating, reviews = p.reviews_count || 0;
  const endereco = p.address || "", bairroNome = bairro(endereco), fone = p.phone || "";
  const wa = waLink(fone);
  const heroImg = opts.imagem || (galeria.length ? galeria[0] : null);
  const galTiles = heroImg && galeria.length ? galeria.filter((g) => g !== heroImg) : galeria;
  const mapsEmbed = endereco ? `https://www.google.com/maps?q=${encodeURIComponent(endereco)}&output=embed` : null;
  const slug = slugify(nome);
  const ratingTxt = rating ? (rating.toFixed ? rating.toFixed(1) : rating) : null;

  const svcHtml = servicos.map((s, i) => `
      <article class="svc" data-reveal style="transition-delay:${i * 70}ms">
        <span class="svc-n">${String(i + 1).padStart(2, "0")}</span>
        <div><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></div>
      </article>`).join("");

  const marquee = on("marquee") && servicos.length
    ? `<div class="marquee" aria-hidden="true"><div class="mq-track">${servicos.map((s) =>
        `<span class="mq-i">${esc(s.t)}</span><span class="mq-dot">✦</span>`).join("").repeat(2)}</div></div>` : "";

  const galHtml = galTiles.length ? `
  <section class="sec gallery" id="espaco"><div class="wrap">
    <p class="eyebrow" data-reveal>Conheça o espaço</p>
    <h2 class="disp xl" data-reveal>Nosso espaço${bairroNome ? `, na ${esc(bairroNome)}` : ""}</h2>
    <div class="gal" data-reveal>${galTiles.slice(0, 5).map((g, i) =>
      `<figure class="gal-i${i === 0 ? " big" : ""}"><img loading="lazy" src="${esc(g)}" alt="${esc(nome)}"></figure>`).join("")}</div>
  </div></section>` : "";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(nome)}${bairroNome ? " — " + esc(bairroNome) : ""}</title>
<meta name="description" content="${esc(nome)} — ${esc(tagline)}. ${esc(seg.label)} em ${esc(bairroNome || "Belo Horizonte")}.">
${heroImg ? `<meta property="og:image" content="${esc(heroImg)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${theme.import}&display=swap" rel="stylesheet">
<style>
  :root{--bg:${theme.bg};--surface:${theme.surface};--ink:${theme.ink};--muted:${theme.muted};--brand:${brand};--deep:${deep};
    --line:${theme.line};--gold:#C0A052;--rad:${theme.radius};
    --disp:'${theme.display}',${theme.df};--sans:'${theme.body}',system-ui,sans-serif;}
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth;overflow-x:hidden}
  body{font-family:var(--sans);color:var(--ink);background:var(--bg);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;max-width:100vw}
  .brand{max-width:70vw}
  a{text-decoration:none;color:inherit}img{display:block;max-width:100%}
  .wrap{max-width:1140px;margin:0 auto;padding:0 26px}
  .disp{font-family:var(--disp);font-weight:${theme.weightDisplay};letter-spacing:-.01em;line-height:1.08}
  .xl{font-size:clamp(2rem,4.6vw,3.4rem)}
  .eyebrow{font-size:.74rem;letter-spacing:.22em;text-transform:uppercase;color:var(--brand);font-weight:600;margin-bottom:14px}
  body::before{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.04;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  header{position:sticky;top:0;z-index:80;background:rgba(247,243,234,.82);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:72px}
  .brand{font-family:var(--disp);font-weight:${theme.weightDisplay + 100 > 800 ? 700 : theme.weightDisplay + 100};font-size:1.32rem;letter-spacing:-.01em}
  .brand small{display:block;font-family:var(--sans);font-weight:500;font-size:.6rem;letter-spacing:.28em;text-transform:uppercase;color:var(--muted);margin-top:-2px}
  .btn{display:inline-flex;align-items:center;gap:9px;font-weight:600;font-size:.92rem;padding:13px 24px;border-radius:999px;background:var(--deep);color:#F7F3EA;transition:transform .25s,box-shadow .25s;box-shadow:0 10px 24px -12px var(--deep)}
  .btn:hover{transform:translateY(-2px);box-shadow:0 16px 30px -12px var(--deep)}
  .btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink);box-shadow:none}
  .btn.ghost:hover{background:var(--ink);color:var(--bg)}
  .hero{position:relative;display:grid;grid-template-columns:1.04fr .96fr;gap:54px;align-items:center;padding:72px 0 86px}
  .hero::after{content:"";position:absolute;top:-120px;right:-160px;width:520px;height:520px;border-radius:50%;z-index:-1;background:radial-gradient(circle,${brand}33,transparent 65%)}
  .hero h1{font-family:var(--disp);font-weight:${theme.weightDisplay};font-size:clamp(2.6rem,5.6vw,4.3rem);line-height:1.02;letter-spacing:-.02em}
  .hero .sub{font-size:1.12rem;color:var(--muted);margin-top:22px;max-width:40ch}
  .hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:34px}
  .trust{display:flex;align-items:center;gap:22px;margin-top:40px;flex-wrap:wrap}
  .trust .stars{color:var(--gold);letter-spacing:3px;font-size:1.05rem}
  .trust b{font-family:var(--disp);font-size:1.35rem;font-weight:${theme.weightDisplay}}
  .trust .sep{width:1px;height:34px;background:var(--line)}
  .trust small{color:var(--muted);font-size:.86rem;display:block}
  .hero-photo{position:relative}
  .hero-frame{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:${theme.heroRadius};box-shadow:0 40px 70px -30px rgba(35,41,31,.45)}
  .hero-frame img{position:absolute;inset:-12% 0 auto 0;width:100%;height:124%;object-fit:cover;will-change:transform}
  .hero-photo::before{content:"";position:absolute;inset:18px 18px -18px -18px;border:1px solid var(--brand);border-radius:${theme.heroRadius};z-index:-1;opacity:.5}
  .hero-badge{position:absolute;left:-16px;bottom:26px;background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:14px 18px;box-shadow:0 20px 40px -20px rgba(35,41,31,.4)}
  .hero-badge b{font-family:var(--disp);font-size:1.5rem;font-weight:${theme.weightDisplay};color:var(--brand)}
  .hero-badge small{display:block;color:var(--muted);font-size:.74rem}
  .strip{background:var(--deep);color:#EDEADD}
  .strip .wrap{display:flex;flex-wrap:wrap;justify-content:space-around;gap:30px;padding:42px 26px;text-align:center}
  .strip .n{font-family:var(--disp);font-size:clamp(2rem,4vw,2.8rem);font-weight:${theme.weightDisplay};color:#fff;line-height:1}
  .strip .l{font-size:.82rem;letter-spacing:.08em;opacity:.72;margin-top:8px;text-transform:uppercase}
  .marquee{overflow:hidden;border-bottom:1px solid var(--line);background:var(--surface);padding:22px 0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
  .mq-track{display:flex;width:max-content;align-items:center;animation:mq 32s linear infinite}
  .marquee:hover .mq-track{animation-play-state:paused}
  .mq-i{font-family:var(--disp);font-size:clamp(1.2rem,2.4vw,1.7rem);font-weight:${theme.weightDisplay};color:var(--ink);white-space:nowrap;padding:0 30px}
  .mq-dot{color:var(--brand);font-size:.8rem}
  @keyframes mq{to{transform:translateX(-50%)}}
  .sec{padding:88px 0}
  .about{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
  .about .lead{font-family:var(--disp);font-size:clamp(1.5rem,2.8vw,2.1rem);font-weight:400;line-height:1.28}
  .about p.body{color:var(--muted);margin-top:18px;font-size:1.04rem}
  .about-photo img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:var(--rad);box-shadow:0 30px 60px -30px rgba(35,41,31,.4)}
  .svcs{margin-top:50px;display:grid;grid-template-columns:1fr 1fr;gap:8px 50px}
  .svc{display:flex;gap:20px;padding:24px 0;border-top:1px solid var(--line);align-items:flex-start}
  .svc-n{font-family:var(--disp);color:var(--brand);font-size:1.05rem;font-weight:${theme.weightDisplay};padding-top:3px}
  .svc h3{font-family:var(--disp);font-size:1.3rem;font-weight:${theme.weightDisplay};margin-bottom:4px}
  .svc p{color:var(--muted);font-size:.96rem}
  .gallery{background:var(--surface)}
  .gal{margin-top:42px;display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:200px;gap:16px}
  .gal-i{margin:0;overflow:hidden;border-radius:var(--rad)}
  .gal-i img{width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.2,.7,.2,1)}
  ${on("hoverzoom") ? ".gal-i:hover img{transform:scale(1.06)}" : ""}
  .gal-i.big{grid-column:span 2;grid-row:span 2}
  .cta{position:relative;text-align:center;color:#F4F1E6;border-radius:28px;padding:78px 26px;overflow:hidden;background:var(--deep)}
  .cta::after{content:"";position:absolute;top:-100px;left:50%;transform:translateX(-50%);width:600px;height:340px;border-radius:50%;background:radial-gradient(circle,${brand}55,transparent 60%)}
  .cta h2{position:relative;font-family:var(--disp);font-size:clamp(1.9rem,4vw,2.9rem);font-weight:${theme.weightDisplay}}
  .cta p{position:relative;opacity:.85;margin-top:14px;font-size:1.08rem}
  .cta .btn{position:relative;margin-top:30px;background:var(--bg);color:var(--ink);box-shadow:none}
  .contact{display:grid;grid-template-columns:.9fr 1.1fr;gap:50px;align-items:start}
  .info-row{display:flex;gap:16px;align-items:flex-start;padding:20px 0;border-top:1px solid var(--line)}
  .info-row b{display:block;font-size:.74rem;text-transform:uppercase;letter-spacing:.16em;color:var(--brand);margin-bottom:4px}
  .info-row span{color:var(--muted)}
  .map{border-radius:var(--rad);overflow:hidden;border:1px solid var(--line);min-height:340px}
  .map iframe{width:100%;height:100%;min-height:340px;border:0;display:block;filter:grayscale(.2) contrast(1.05)}
  footer{background:var(--deep);color:#CFCBBC;padding:54px 0 34px;margin-top:90px}
  footer .ft{display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;align-items:flex-end}
  footer .brand{color:#F4F1E6}
  footer .made{opacity:.5;font-size:.78rem;margin-top:26px;border-top:1px solid rgba(255,255,255,.12);padding-top:18px}
  .wfloat{position:fixed;right:20px;bottom:20px;z-index:90;background:#25D366;color:#fff;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;box-shadow:0 14px 30px -8px rgba(37,211,102,.6);transition:transform .25s}
  .wfloat:hover{transform:scale(1.08)}.wfloat svg{width:30px;height:30px}
  [data-reveal]{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}
  [data-reveal].in{opacity:1;transform:none}
  ${on("aurora") ? `.aurora{position:absolute;inset:-50% -15% auto -15%;height:165%;z-index:-1;pointer-events:none;filter:blur(58px) saturate(1.15);opacity:.5;
    background-image:repeating-linear-gradient(100deg,#000 0%,#000 6%,transparent 9%,transparent 12%,#000 15%),repeating-linear-gradient(100deg,${brand} 6%,#d6dcc4 12%,#f1f2e7 18%,${brand} 24%,#b7c79c 30%);
    background-size:300%,200%;background-position:50% 50%,50% 50%;
    -webkit-mask-image:radial-gradient(ellipse at 72% 6%,#000 8%,transparent 64%);mask-image:radial-gradient(ellipse at 72% 6%,#000 8%,transparent 64%);
    animation:aurora 60s linear infinite}
  @keyframes aurora{from{background-position:50% 50%,50% 50%}to{background-position:350% 50%,350% 50%}}` : ""}
  ${on("textgen") ? ".wg{display:inline-block;opacity:0;filter:blur(11px);transform:translateY(8px);transition:opacity .85s ease,filter .85s ease,transform .85s ease}.wg.on{opacity:1;filter:blur(0);transform:none}" : ""}
  ${on("shimmer") ? `.shine{position:relative;overflow:hidden}.shine::after{content:"";position:absolute;top:0;left:-160%;width:55%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.42),transparent);transform:skewX(-20deg);animation:shine 5s ease-in-out infinite}@keyframes shine{0%,55%{left:-160%}100%{left:170%}}` : ""}
  @keyframes rise{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:none}}
  .hero .sub,.hero-actions,.hero .trust,.hero-photo{opacity:0;animation:rise .9s cubic-bezier(.2,.7,.2,1) forwards}
  .hero .sub{animation-delay:${on("textgen") ? ".5s" : ".15s"}}.hero-actions{animation-delay:${on("textgen") ? ".62s" : ".25s"}}.hero .trust{animation-delay:${on("textgen") ? ".74s" : ".35s"}}.hero-photo{animation-delay:.2s}
  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}[data-reveal],.wg{opacity:1;transform:none;filter:none}}
  @media(max-width:860px){
    .hero{grid-template-columns:1fr;gap:36px;padding:48px 0 60px}
    .hero-photo{order:-1}.hero-frame{aspect-ratio:5/4}.hero-photo::before{display:none}
    .about,.contact{grid-template-columns:1fr;gap:34px}.svcs{grid-template-columns:1fr;gap:0}
    .gal{grid-template-columns:repeat(2,1fr);grid-auto-rows:160px}.gal-i.big{grid-column:span 2}
    .sec{padding:60px 0}.about-photo{display:none}
  }
</style>
</head>
<body>
<header><div class="wrap nav">
  <div class="brand">${esc(nome)}<small>${esc(seg.label)}${bairroNome ? " · " + esc(bairroNome) : ""}</small></div>
  ${wa ? `<a class="btn" href="${wa}" target="_blank" rel="noopener">Agendar consulta</a>` : ""}
</div></header>

<section class="wrap hero">
  ${on("aurora") ? '<div class="aurora" aria-hidden="true"></div>' : ""}
  <div class="hero-copy">
    <p class="eyebrow">${esc(seg.label)}${bairroNome ? " · " + esc(bairroNome) + ", BH" : " · Belo Horizonte"}</p>
    <h1${on("textgen") ? " data-textgen" : ""}>${esc(tagline)}</h1>
    <p class="sub">${esc(sobre.split(".")[0])}.</p>
    <div class="hero-actions">
      ${wa ? `<a class="btn${on("shimmer") ? " shine" : ""}" href="${wa}" target="_blank" rel="noopener">Agendar pelo WhatsApp</a>` : ""}
      <a class="btn ghost" href="#servicos">Ver mais</a>
    </div>
    ${ratingTxt ? `<div class="trust">
      <div><div class="stars">★★★★★</div><small>Avaliação no Google</small></div><div class="sep"></div>
      <div><b>${ratingTxt}</b> <small>nota média</small></div>
      ${reviews ? `<div class="sep"></div><div><b>${reviews}</b> <small>avaliações</small></div>` : ""}
    </div>` : ""}
  </div>
  ${heroImg ? `<div class="hero-photo">
    <div class="hero-frame"><img src="${esc(heroImg)}" alt="${esc(nome)}"></div>
    ${ratingTxt ? `<div class="hero-badge"><b>${ratingTxt}★</b><small>${reviews} avaliações</small></div>` : ""}
  </div>` : ""}
</section>

${ratingTxt || reviews ? `<section class="strip"><div class="wrap">
  ${ratingTxt ? `<div><div class="n" data-count="${ratingTxt}">0</div><div class="l">Nota no Google</div></div>` : ""}
  ${reviews ? `<div><div class="n" data-count="${reviews}" data-suffix="+">0</div><div class="l">Avaliações</div></div>` : ""}
  <div><div class="n disp">${esc(bairroNome || "BH")}</div><div class="l">Localização</div></div>
  <div><div class="n">100%</div><div class="l">Atendimento humano</div></div>
</div></section>` : ""}

${marquee}

<section class="sec"><div class="wrap about">
  <div>
    <p class="eyebrow" data-reveal>Sobre nós</p>
    <p class="lead" data-reveal>${esc(sobre)}</p>
    <p class="body" data-reveal>Combinamos técnica, cuidado e um atendimento próximo para que cada visita seja tranquila — e o resultado, motivo de orgulho.</p>
  </div>
  ${galTiles[1] || heroImg ? `<div class="about-photo" data-reveal><img loading="lazy" src="${esc(galTiles[1] || heroImg)}" alt="${esc(nome)}"></div>` : ""}
</div></section>

<section class="sec" id="servicos" style="padding-top:0"><div class="wrap">
  <p class="eyebrow" data-reveal>O que oferecemos</p>
  <h2 class="disp xl" data-reveal>Feito pensando em você</h2>
  <div class="svcs">${svcHtml}</div>
</div></section>

${galHtml}

<section class="sec"><div class="wrap">
  <div class="cta" data-reveal>
    <h2>Vamos começar?</h2>
    <p>Fale com a gente pelo WhatsApp — atendimento rápido e sem compromisso.</p>
    ${wa ? `<a class="btn${on("shimmer") ? " shine" : ""}" href="${wa}" target="_blank" rel="noopener">Falar no WhatsApp agora</a>` : ""}
  </div>
</div></section>

<section class="sec" id="contato" style="padding-top:0"><div class="wrap">
  <p class="eyebrow" data-reveal>Onde estamos</p>
  <h2 class="disp xl" data-reveal style="margin-bottom:8px">Venha nos visitar</h2>
  <div class="contact" style="margin-top:34px">
    <div data-reveal>
      ${endereco ? `<div class="info-row"><div><b>Endereço</b><span>${esc(endereco)}</span></div></div>` : ""}
      ${fone ? `<div class="info-row"><div><b>WhatsApp</b><span><a href="${wa || "#"}" target="_blank" rel="noopener">${esc(fone)}</a></span></div></div>` : ""}
      <div class="info-row"><div><b>Atendimento</b><span>Segunda a sexta · horário comercial</span></div></div>
    </div>
    ${mapsEmbed ? `<div class="map" data-reveal><iframe loading="lazy" src="${mapsEmbed}"></iframe></div>` : ""}
  </div>
</div></section>

<footer><div class="wrap">
  <div class="ft">
    <div class="brand">${esc(nome)}<small>${esc(seg.label)}${bairroNome ? " · " + esc(bairroNome) : ""}</small></div>
    <div style="text-align:right;font-size:.9rem">${endereco ? `<div>${esc(endereco)}</div>` : ""}${fone ? `<div>${esc(fone)}</div>` : ""}</div>
  </div>
  <div class="made">Prévia de site criada por Balmor · Tecnologia para o seu negócio</div>
</div></footer>

${wa ? `<a class="wfloat" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.999-1.048zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/></svg></a>` : ""}

<script>
  const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
  ${on("textgen") ? `const tg=document.querySelector('[data-textgen]');
  if(tg&&!rm){const ws=tg.textContent.trim().split(/\\s+/);tg.textContent='';
    ws.forEach((w,i)=>{const s=document.createElement('span');s.className='wg';s.textContent=w;s.style.transitionDelay=(i*95)+'ms';tg.appendChild(s);tg.appendChild(document.createTextNode(' '));});
    requestAnimationFrame(()=>requestAnimationFrame(()=>tg.querySelectorAll('.wg').forEach(s=>s.classList.add('on'))));}` : ""}
  ${on("parallax") ? `const pimg=document.querySelector('.hero-frame img');
  if(pimg&&!rm){let t=false;addEventListener('scroll',()=>{if(t)return;t=true;requestAnimationFrame(()=>{const v=Math.max(-55,Math.min(55,window.scrollY*0.07));pimg.style.transform='translateY('+v+'px)';t=false;});},{passive:true});}` : ""}
  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));
  const cio=new IntersectionObserver((es)=>{es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target,to=parseFloat(el.dataset.count),dec=(el.dataset.count+'').includes('.')?1:0,suf=el.dataset.suffix||'',t0=performance.now(),d=1300;
    (function tick(now){const p=Math.min((now-t0)/d,1),v=to*(1-Math.pow(1-p,3));el.textContent=v.toFixed(dec)+suf;if(p<1)requestAnimationFrame(tick);})(t0);cio.unobserve(el);});},{threshold:.5});
  document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));
</script>
</body>
</html>`;

  return { slug, html, nome, segmento: seg.label, tema: themeKey, anims: animList, temWhats: !!wa };
}
