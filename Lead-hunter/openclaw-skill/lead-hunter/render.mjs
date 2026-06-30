// render.mjs — RENDERIZADOR de site a partir de uma SPEC (direção de arte + seções).
// A Nobara é a DIRETORA CRIATIVA (produz a spec, output pequeno); este código RENDERIZA.
// Variedade vem da COMBINAÇÃO: tipo de sistema + paleta + seções + variantes + ordem + props.
// Schema da spec documentado em SPEC.md.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function waLink(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d.length >= 12 ? "https://wa.me/" + d : null;
}
function hexToRgb(h){h=String(h).replace("#","");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let h,s,l=(mx+mn)/2;if(mx===mn){h=s=0;}else{const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;h/=6;}return[h,s,l];}
function hslToHex(h,s,l){let r,g,b;if(s===0){r=g=b=l;}else{const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q,f=(t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};r=f(h+1/3);g=f(h);b=f(h-1/3);}const to=(x)=>("0"+Math.round(x*255).toString(16)).slice(-2);return"#"+to(r)+to(g)+to(b);}
export function darken(hex,f=0.45){let[h,s,l]=rgbToHsl(...hexToRgb(hex));return hslToHex(h,Math.min(1,s*1.05),Math.max(0.1,l*f));}
function lighten(hex,f=1.6){let[h,s,l]=rgbToHsl(...hexToRgb(hex));return hslToHex(h,s*0.5,Math.min(0.97,l*f));}

// ── SISTEMAS DE TIPOGRAFIA (a Nobara escolhe um) ──
const TYPE_SYSTEMS = {
  "serif-editorial":     { display: "Fraunces", df: "serif", body: "Hanken Grotesk", imp: "family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@400;500;600", wd: 500 },
  "serif-high-contrast": { display: "Cormorant Garamond", df: "serif", body: "Hanken Grotesk", imp: "family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Hanken+Grotesk:wght@400;500;600", wd: 500 },
  "serif-classic":       { display: "Lora", df: "serif", body: "IBM Plex Sans", imp: "family=Lora:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600", wd: 600 },
  "grotesk-swiss":       { display: "Archivo", df: "sans-serif", body: "Archivo", imp: "family=Archivo:wght@400;500;600;700;800", wd: 700 },
  "grotesk-bold":        { display: "Syne", df: "sans-serif", body: "Hanken Grotesk", imp: "family=Syne:wght@500;600;700;800&family=Hanken+Grotesk:wght@400;500;600", wd: 700 },
  "mono-industrial":     { display: "Space Mono", df: "monospace", body: "Hanken Grotesk", imp: "family=Space+Mono:wght@400;700&family=Hanken+Grotesk:wght@400;500;600", wd: 700 },
  "rounded-warm":        { display: "Bricolage Grotesque", df: "sans-serif", body: "Nunito Sans", imp: "family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Nunito+Sans:wght@400;600;700", wd: 600 },
};

// paleta: a Nobara pode dar tokens explícitos OU só a cor da marca (derivamos o resto)
function palette(art) {
  const p = art.palette || {};
  const brand = p.brand || "#7E8B6A";
  const dark = (p.mode === "dark");
  return {
    brand, deep: p.deep || darken(brand, 0.42),
    bg: p.bg || (dark ? "#14140f" : "#F6F2E9"),
    surface: p.surface || (dark ? "#1c1c16" : "#FCFAF3"),
    ink: p.ink || (dark ? "#ECE8DC" : "#23291F"),
    muted: p.muted || (dark ? "#9c978a" : "#6E685A"),
    line: p.line || (dark ? "#2c2c24" : "#E6DECC"),
    gold: p.gold || "#C0A052",
  };
}

const ICON_WA = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.999-1.048zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/></svg>`;

// ── BIBLIOTECA DE SEÇÕES (cada tipo tem VARIANTES) ──
// ctx = { wa, anim(k), nome }
const SECTIONS = {
  header(p, c) {
    return `<header class="site-head"><div class="wrap nav">
      <div class="brand">${esc(p.nome || c.nome)}${p.sub ? `<small>${esc(p.sub)}</small>` : ""}</div>
      ${c.wa ? `<a class="btn" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Agendar")}</a>` : ""}
    </div></header>`;
  },
  hero: {
    split(p, c) {
      return `<section class="wrap hero hero-split">
        ${c.anim("aurora") ? '<div class="aurora" aria-hidden="true"></div>' : ""}
        <div class="hero-copy">
          ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}
          <h1${c.anim("textgen") ? " data-textgen" : ""}>${esc(p.headline)}</h1>
          ${p.sub ? `<p class="lede">${esc(p.sub)}</p>` : ""}
          <div class="row gap" style="margin-top:30px">
            ${c.wa ? `<a class="btn${c.anim("shimmer") ? " shine" : ""}" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Agendar pelo WhatsApp")}</a>` : ""}
            ${p.cta2 ? `<a class="btn ghost" href="#conteudo">${esc(p.cta2)}</a>` : ""}
          </div>
          ${p.rating ? `<div class="trust"><span class="stars">★★★★★</span> <b>${p.rating}</b> <small>${p.reviews ? p.reviews + " avaliações no Google" : "no Google"}</small></div>` : ""}
        </div>
        ${p.image ? `<div class="hero-photo"><div class="hero-frame"><img src="${esc(p.image)}" alt="${esc(c.nome)}"></div>
          ${p.rating ? `<div class="hero-badge"><b>${p.rating}★</b><small>${p.reviews || ""} avaliações</small></div>` : ""}</div>` : ""}
      </section>`;
    },
    editorial(p, c) {
      return `<section class="wrap hero hero-editorial">
        ${c.anim("aurora") ? '<div class="aurora" aria-hidden="true"></div>' : ""}
        <div>
          ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}
          <h1 class="giant"${c.anim("textgen") ? " data-textgen" : ""}>${esc(p.headline)}</h1>
          ${p.sub ? `<p class="lede" style="max-width:40ch">${esc(p.sub)}</p>` : ""}
          <div class="row gap" style="margin-top:34px;align-items:center">
            ${c.wa ? `<a class="btn${c.anim("shimmer") ? " shine" : ""}" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Agendar")}</a>` : ""}
            ${p.rating ? `<div class="trust inline"><span class="stars">★★★★★</span> <b>${p.rating}</b> <small>· ${p.reviews || ""} avaliações</small></div>` : ""}
          </div>
        </div>
        ${p.image ? `<div class="hero-art"><div class="ph"><img src="${esc(p.image)}" alt="${esc(c.nome)}"></div>
          ${p.rating ? `<div class="hero-tag"><b>${p.rating}★</b><small>${p.reviews || ""} avaliações</small></div>` : ""}</div>` : ""}
      </section>`;
    },
    fullbleed(p, c) {
      return `<section class="hero hero-full">
        <img class="hero-bg" src="${esc(p.image)}" alt="">
        <div class="wrap">
          ${p.eyebrow ? `<p class="eyebrow light">${esc(p.eyebrow)}</p>` : ""}
          <h1${c.anim("textgen") ? " data-textgen" : ""}>${esc(p.headline)}</h1>
          ${p.sub ? `<p class="lede light">${esc(p.sub)}</p>` : ""}
          <div class="row gap" style="justify-content:center;margin-top:30px">
            ${c.wa ? `<a class="btn inv" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Agendar")}</a>` : ""}
          </div>
          ${p.rating ? `<div class="trust center"><span class="stars">★★★★★</span> <b>${p.rating}</b> <small>${p.reviews || ""} avaliações no Google</small></div>` : ""}
        </div>
      </section>`;
    },
    centered(p, c) {
      return `<section class="hero hero-centered">
        ${c.anim("aurora") ? '<div class="aurora" aria-hidden="true"></div>' : ""}
        <div class="wrap">
          ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}
          <h1${c.anim("textgen") ? " data-textgen" : ""}>${esc(p.headline)}</h1>
          ${p.sub ? `<p class="lede">${esc(p.sub)}</p>` : ""}
          <div class="row gap" style="justify-content:center;margin-top:30px">
            ${c.wa ? `<a class="btn${c.anim("shimmer") ? " shine" : ""}" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Agendar")}</a>` : ""}
            ${p.cta2 ? `<a class="btn ghost" href="#conteudo">${esc(p.cta2)}</a>` : ""}
          </div>
          ${p.rating ? `<div class="trust center"><span class="stars">★★★★★</span> <b>${p.rating}</b> <small>· ${p.reviews || ""} avaliações no Google</small></div>` : ""}
          ${p.image ? `<div class="hero-c-img"><img src="${esc(p.image)}" alt="${esc(c.nome)}"></div>` : ""}
        </div>
      </section>`;
    },
  },
  ticker(p, c) {
    const items = (p.items || []).map((i) => `<span class="tk-i">${esc(i)}</span><span class="tk-d">✦</span>`).join("");
    return `<div class="ticker" aria-hidden="true"><div class="tk-tr">${items}${items}</div></div>`;
  },
  manifesto(p, c) {
    return `<section class="manifesto"><div class="wrap" data-reveal>
      ${p.eyebrow ? `<p class="eyebrow light">${esc(p.eyebrow)}</p>` : ""}
      <blockquote>${esc(p.quote)}</blockquote>
    </div></section>`;
  },
  about(p, c) {
    return `<section class="sec" id="conteudo"><div class="wrap about">
      <div data-reveal>
        ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}
        <h2 class="lead disp">${esc(p.text)}</h2>
        ${p.body ? `<p class="muted" style="margin-top:18px">${esc(p.body)}</p>` : ""}
      </div>
      ${p.image ? `<div class="about-photo" data-reveal><img loading="lazy" src="${esc(p.image)}" alt="${esc(c.nome)}"></div>` : ""}
    </div></section>`;
  },
  services: {
    zigzag(p, c) {
      const big = (p.items || []).filter((s) => s.image).slice(0, 3).map((s, i) => `
        <div class="zig" data-reveal>
          <div class="zig-img"><img loading="lazy" src="${esc(s.image)}" alt="${esc(s.title)}"></div>
          <div><span class="zig-n">${String(i + 1).padStart(2, "0")}</span><h3 class="disp">${esc(s.title)}</h3><p class="muted">${esc(s.desc)}</p></div>
        </div>`).join("");
      const rest = (p.items || []).filter((s) => !s.image);
      const mini = rest.length ? `<div class="mini" data-reveal>${rest.map((s, i) => `<div><span class="n">${String(big ? i + 4 : i + 1).padStart(2, "0")}</span><h4 class="disp">${esc(s.title)}</h4><p class="muted">${esc(s.desc)}</p></div>`).join("")}</div>` : "";
      return `<section class="sec"><div class="wrap">
        <div class="sec-head" data-reveal><h2 class="disp xl">${esc(p.title || "O que oferecemos")}</h2>${p.intro ? `<p class="muted">${esc(p.intro)}</p>` : ""}</div>
        ${big}${mini}
      </div></section>`;
    },
    list(p, c) {
      const rows = (p.items || []).map((s, i) => `<article class="svc" data-reveal style="transition-delay:${i * 60}ms">
        <span class="svc-n disp">${String(i + 1).padStart(2, "0")}</span><div><h3 class="disp">${esc(s.title)}</h3><p class="muted">${esc(s.desc)}</p></div></article>`).join("");
      return `<section class="sec"><div class="wrap">
        ${p.eyebrow ? `<p class="eyebrow" data-reveal>${esc(p.eyebrow)}</p>` : ""}
        <h2 class="disp xl" data-reveal>${esc(p.title || "Nossos serviços")}</h2>
        <div class="svcs">${rows}</div>
      </div></section>`;
    },
    cards(p, c) {
      const cards = (p.items || []).map((s) => `<div class="card" data-reveal>${s.icon ? `<div class="ic">${esc(s.icon)}</div>` : ""}<h3 class="disp">${esc(s.title)}</h3><p class="muted">${esc(s.desc)}</p></div>`).join("");
      return `<section class="sec soft"><div class="wrap">
        <div class="sec-head" data-reveal><h2 class="disp xl">${esc(p.title || "O que oferecemos")}</h2>${p.intro ? `<p class="muted">${esc(p.intro)}</p>` : ""}</div>
        <div class="cards">${cards}</div>
      </div></section>`;
    },
  },
  stats(p, c) {
    const items = (p.items || []).map((s) => `<div class="stat" data-reveal><div class="n disp"${s.count ? ` data-count="${esc(s.count)}"${s.suffix ? ` data-suffix="${esc(s.suffix)}"` : ""}` : ""}>${s.count ? "0" : esc(s.value)}</div><div class="l">${esc(s.label)}</div></div>`).join("");
    return `<section class="strip ${p.style || "band"}"><div class="wrap">${items}</div></section>`;
  },
  gallery: {
    collage(p, c) {
      const imgs = (p.images || []).slice(0, 5);
      const cls = ["c1", "c2", "c3", "c4", "c5"];
      return `<section class="sec ${p.soft ? "soft" : ""}"><div class="wrap">
        <div class="sec-head" data-reveal>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}<h2 class="disp xl">${esc(p.title || "Nosso espaço")}</h2></div>
        <div class="collage" data-reveal>${imgs.map((g, i) => `<figure class="${cls[i] || ""}"><img loading="lazy" src="${esc(g)}" alt=""></figure>`).join("")}</div>
      </div></section>`;
    },
    grid(p, c) {
      const imgs = (p.images || []).slice(0, 6);
      return `<section class="sec ${p.soft ? "soft" : ""}"><div class="wrap">
        <div class="sec-head" data-reveal>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}<h2 class="disp xl">${esc(p.title || "Galeria")}</h2></div>
        <div class="grid-gal" data-reveal>${imgs.map((g, i) => `<figure class="${i === 0 ? "big" : ""}"><img loading="lazy" src="${esc(g)}" alt=""></figure>`).join("")}</div>
      </div></section>`;
    },
    strip(p, c) {
      const imgs = (p.images || []).slice(0, 8);
      return `<section class="sec ${p.soft ? "soft" : ""}"><div class="wrap">
        <div class="sec-head" data-reveal>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}<h2 class="disp xl">${esc(p.title || "Galeria")}</h2></div></div>
        <div class="strip-gal" data-reveal>${imgs.map((g) => `<figure><img loading="lazy" src="${esc(g)}" alt=""></figure>`).join("")}</div>
      </section>`;
    },
  },
  cta: {
    band(p, c) {
      return `<section class="sec"><div class="wrap"><div class="cta-band" data-reveal>
        <h2 class="disp">${esc(p.title)}</h2>${p.sub ? `<p>${esc(p.sub)}</p>` : ""}
        ${c.wa ? `<a class="btn inv" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Falar no WhatsApp")}</a>` : ""}
      </div></div></section>`;
    },
    fullbleed(p, c) {
      return `<section class="cta-full">${p.image ? `<img src="${esc(p.image)}" alt="">` : ""}<div class="wrap" data-reveal>
        ${p.eyebrow ? `<p class="eyebrow light">${esc(p.eyebrow)}</p>` : ""}
        <h2 class="disp">${esc(p.title)}</h2>${p.sub ? `<p>${esc(p.sub)}</p>` : ""}
        ${c.wa ? `<a class="btn inv" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Falar no WhatsApp")}</a>` : ""}
      </div></section>`;
    },
    split(p, c) {
      return `<section class="sec"><div class="wrap"><div class="cta-split" data-reveal>
        <div><h2 class="disp">${esc(p.title)}</h2>${p.sub ? `<p>${esc(p.sub)}</p>` : ""}</div>
        ${c.wa ? `<a class="btn inv" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta || "Falar no WhatsApp")}</a>` : ""}
      </div></div></section>`;
    },
  },
  contact(p, c) {
    const maps = p.address ? `https://www.google.com/maps?q=${encodeURIComponent(p.address)}&output=embed` : null;
    return `<section class="sec soft"><div class="wrap">
      <div class="sec-head" data-reveal>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}<h2 class="disp xl">${esc(p.title || "Venha nos visitar")}</h2></div>
      <div class="contact" data-reveal>
        <div>
          ${p.address ? `<div class="info"><b>Endereço</b><span>${esc(p.address)}</span></div>` : ""}
          ${p.phone ? `<div class="info"><b>WhatsApp</b><span><a href="${c.wa || "#"}" target="_blank" rel="noopener">${esc(p.phone)}</a></span></div>` : ""}
          <div class="info"><b>Atendimento</b><span>${esc(p.hours || "Segunda a sexta · horário comercial")}</span></div>
        </div>
        ${maps ? `<div class="map"><iframe loading="lazy" src="${maps}"></iframe></div>` : ""}
      </div>
    </div></section>`;
  },
  testimonial: {
    single(p, c) {
      return `<section class="sec ${p.soft ? "soft" : ""}"><div class="wrap tst-single" data-reveal>
        ${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}
        ${p.rating !== false ? `<div class="stars big">★★★★★</div>` : ""}
        <blockquote class="disp">${esc(p.quote)}</blockquote>
        ${p.author ? `<p class="tst-author">${esc(p.author)}</p>` : ""}
      </div></section>`;
    },
    cards(p, c) {
      const cards = (p.items || []).map((t) => `<figure class="tst-card" data-reveal>
        ${t.rating !== false ? `<div class="stars">★★★★★</div>` : ""}
        <blockquote>${esc(t.quote)}</blockquote><figcaption>${esc(t.author || "")}</figcaption></figure>`).join("");
      return `<section class="sec soft"><div class="wrap">
        <div class="sec-head" data-reveal><h2 class="disp xl">${esc(p.title || "O que dizem nossos pacientes")}</h2>${p.intro ? `<p class="muted">${esc(p.intro)}</p>` : ""}</div>
        <div class="tst-grid">${cards}</div></div></section>`;
    },
  },
  steps(p, c) {
    const items = (p.items || []).map((s, i) => `<div class="step" data-reveal style="transition-delay:${i * 80}ms">
      <span class="step-n disp">${String(i + 1).padStart(2, "0")}</span><h3 class="disp">${esc(s.title)}</h3><p class="muted">${esc(s.desc)}</p></div>`).join("");
    return `<section class="sec"><div class="wrap">
      <div class="sec-head" data-reveal>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}<h2 class="disp xl">${esc(p.title || "Como funciona")}</h2></div>
      <div class="steps">${items}</div></div></section>`;
  },
  feature(p, c) {
    return `<section class="sec ${p.soft ? "soft" : ""}"><div class="wrap feature ${p.reverse ? "rev" : ""}" data-reveal>
      ${p.image ? `<div class="feature-img"><img loading="lazy" src="${esc(p.image)}" alt="${esc(c.nome)}"></div>` : ""}
      <div>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}
        <h2 class="disp" style="font-size:clamp(1.7rem,3.4vw,2.6rem)">${esc(p.title)}</h2>
        ${p.body ? `<p class="muted" style="margin-top:14px">${esc(p.body)}</p>` : ""}
        ${p.cta && c.wa ? `<a class="btn" href="${c.wa}" target="_blank" rel="noopener" style="margin-top:24px">${esc(p.cta)}</a>` : ""}
      </div></div></section>`;
  },
  faq(p, c) {
    const items = (p.items || []).map((f) => `<details class="faq-i" data-reveal><summary class="disp">${esc(f.q)}</summary><p class="muted">${esc(f.a)}</p></details>`).join("");
    return `<section class="sec"><div class="wrap faq-wrap">
      <div class="sec-head" data-reveal>${p.eyebrow ? `<p class="eyebrow">${esc(p.eyebrow)}</p>` : ""}<h2 class="disp xl">${esc(p.title || "Perguntas frequentes")}</h2></div>
      <div class="faq">${items}</div></div></section>`;
  },
  banner(p, c) {
    return `<section class="banner" data-reveal><div class="wrap">
      <span class="disp">${esc(p.text)}</span>
      ${p.cta && c.wa ? `<a class="btn inv" href="${c.wa}" target="_blank" rel="noopener">${esc(p.cta)}</a>` : ""}
    </div></section>`;
  },
  footer(p, c) {
    return `<footer><div class="wrap">
      <div class="ft"><div class="brand">${esc(p.nome || c.nome)}${p.sub ? `<small>${esc(p.sub)}</small>` : ""}</div>
        <div style="text-align:right;font-size:.9rem">${p.address ? `<div>${esc(p.address)}</div>` : ""}${p.phone ? `<div>${esc(p.phone)}</div>` : ""}</div></div>
      <div class="made">Prévia de site criada por Balmor · Tecnologia para o seu negócio</div>
    </div></footer>`;
  },
};

function baseCSS(ts, t, anim) {
  return `
  :root{--brand:${t.brand};--deep:${t.deep};--bg:${t.bg};--surface:${t.surface};--ink:${t.ink};--muted:${t.muted};--line:${t.line};--gold:${t.gold};
    --disp:'${ts.display}',${ts.df};--sans:'${ts.body}',system-ui,sans-serif;--wd:${ts.wd};}
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth;overflow-x:hidden}
  body{font-family:var(--sans);background:var(--bg);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;max-width:100vw}
  a{text-decoration:none;color:inherit}img{display:block;max-width:100%}
  .wrap{max-width:1180px;margin:0 auto;padding:0 28px}
  .disp{font-family:var(--disp);font-weight:var(--wd);letter-spacing:-.01em;line-height:1.06}
  .xl{font-size:clamp(2rem,4.6vw,3.6rem)}
  .muted{color:var(--muted)}.light{color:#fff!important}
  .eyebrow{font-size:.74rem;letter-spacing:.22em;text-transform:uppercase;color:var(--brand);font-weight:600;margin-bottom:14px}
  .eyebrow.light{color:rgba(255,255,255,.85)}
  .row{display:flex;flex-wrap:wrap}.gap{gap:14px}
  body::before{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.04;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
  .btn{display:inline-flex;align-items:center;gap:9px;font-weight:600;font-size:.93rem;padding:14px 26px;border-radius:999px;background:var(--deep);color:#fff;transition:transform .25s,box-shadow .25s;box-shadow:0 12px 26px -12px var(--deep)}
  .btn:hover{transform:translateY(-2px)}.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--ink);box-shadow:none}
  .btn.ghost:hover{background:var(--ink);color:var(--bg)}.btn.inv{background:#fff;color:var(--deep)}
  .site-head{position:sticky;top:0;z-index:80;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:70px}
  .brand{font-family:var(--disp);font-weight:600;font-size:1.3rem;max-width:68vw}
  .brand small{display:block;font-family:var(--sans);font-weight:500;font-size:.6rem;letter-spacing:.26em;text-transform:uppercase;color:var(--muted);margin-top:-2px}
  .sec{padding:96px 0}.soft{background:var(--surface)}
  .sec-head{display:flex;align-items:flex-end;justify-content:space-between;gap:30px;flex-wrap:wrap;margin-bottom:54px}
  .sec-head .muted{max-width:34ch}
  .stars{color:var(--gold);letter-spacing:2px}.trust{display:flex;align-items:center;gap:10px;margin-top:34px}.trust b{font-family:var(--disp);font-size:1.3rem}.trust.center{justify-content:center}.trust.inline{margin-top:0}
  /* hero */
  .hero{position:relative}
  .hero-split{display:grid;grid-template-columns:1.05fr .95fr;gap:54px;align-items:center;padding:80px 0 90px}
  .hero-split h1{font-family:var(--disp);font-weight:var(--wd);font-size:clamp(2.6rem,5.6vw,4.2rem);line-height:1.02;letter-spacing:-.02em}
  .lede{font-size:1.12rem;color:var(--muted);margin-top:22px;max-width:42ch}
  .hero-frame{position:relative;aspect-ratio:4/5;overflow:hidden;border-radius:200px 200px 20px 20px;box-shadow:0 40px 70px -30px rgba(20,30,20,.45)}
  .hero-frame img{position:absolute;inset:-10% 0 auto 0;width:100%;height:122%;object-fit:cover;will-change:transform}
  .hero-badge{position:absolute;left:-14px;bottom:30px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:13px 17px;box-shadow:0 20px 40px -20px rgba(20,30,20,.4)}
  .hero-badge b{font-family:var(--disp);font-size:1.5rem;color:var(--brand)}.hero-badge small{display:block;color:var(--muted);font-size:.72rem}
  .hero-editorial{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;padding:90px 0;min-height:88vh}
  .giant{font-family:var(--disp);font-weight:var(--wd);font-size:clamp(3rem,7vw,6rem);line-height:.98;letter-spacing:-.02em}
  .hero-art .ph{aspect-ratio:3/4.2;overflow:hidden;border-radius:50% 50% 14px 14px;box-shadow:0 50px 90px -40px rgba(20,30,20,.55)}
  .hero-art{position:relative}.hero-art .ph img{width:100%;height:116%;object-fit:cover}
  .hero-tag{position:absolute;left:-22px;bottom:44px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:14px 18px;box-shadow:0 24px 48px -22px rgba(20,30,20,.5)}
  .hero-tag b{font-family:var(--disp);font-size:1.6rem;color:var(--brand)}.hero-tag small{display:block;color:var(--muted);font-size:.72rem}
  .hero-full{min-height:90vh;display:grid;place-items:center;text-align:center;color:#fff;position:relative;overflow:hidden}
  .hero-full .hero-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}
  .hero-full::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,20,15,.45),rgba(15,20,15,.75));z-index:-1}
  .hero-full h1{font-family:var(--disp);font-weight:var(--wd);font-size:clamp(2.6rem,6vw,5rem);line-height:1.02;max-width:18ch;margin:0 auto}
  .hero-full .lede{margin:18px auto 0;max-width:46ch}
  /* ticker */
  .ticker{overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:var(--surface);padding:18px 0;-webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
  .tk-tr{display:flex;width:max-content;align-items:center;animation:tk 32s linear infinite}
  .ticker:hover .tk-tr{animation-play-state:paused}
  .tk-i{font-family:var(--disp);font-size:clamp(1.2rem,2.4vw,1.7rem);white-space:nowrap;padding:0 28px}.tk-d{color:var(--brand);font-size:.8rem}
  @keyframes tk{to{transform:translateX(-50%)}}
  /* manifesto */
  .manifesto{background:var(--deep);color:#fff;text-align:center;padding:110px 28px}
  .manifesto blockquote{font-family:var(--disp);font-weight:var(--wd);font-size:clamp(1.9rem,4.4vw,3.4rem);line-height:1.2;max-width:20ch;margin:0 auto}
  /* about */
  .about{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
  .about .lead{font-size:clamp(1.5rem,2.8vw,2.2rem);font-weight:400;line-height:1.28}
  .about-photo img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:18px;box-shadow:0 30px 60px -30px rgba(20,30,20,.4)}
  /* services */
  .svcs{margin-top:46px;display:grid;grid-template-columns:1fr 1fr;gap:6px 50px}
  .svc{display:flex;gap:20px;padding:24px 0;border-top:1px solid var(--line);align-items:flex-start}
  .svc-n{color:var(--brand);font-size:1.05rem;padding-top:3px}.svc h3{font-size:1.3rem;font-weight:var(--wd);margin-bottom:4px}.svc p{font-size:.96rem}
  .zig{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:58px;margin-bottom:84px}
  .zig:nth-child(even) .zig-img{order:2}
  .zig-img{aspect-ratio:4/3;overflow:hidden;border-radius:16px;box-shadow:0 40px 70px -36px rgba(20,30,20,.45)}
  .zig-img img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.7,.2,1)}
  .zig:hover .zig-img img{transform:scale(1.06)}
  .zig-n{color:var(--gold);letter-spacing:.1em}.zig h3{font-size:clamp(1.8rem,3.4vw,2.7rem);margin:10px 0 14px}.zig p{font-size:1.04rem;max-width:42ch}
  .mini{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line);border-radius:16px;overflow:hidden;margin-top:24px}
  .mini>div{background:var(--bg);padding:32px 26px}.mini .n{color:var(--gold)}.mini h4{font-size:1.35rem;font-weight:var(--wd);margin:8px 0 6px}.mini p{font-size:.92rem}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px}
  .card{background:var(--bg);border:1px solid var(--line);border-radius:18px;padding:30px;transition:transform .25s,box-shadow .25s}
  .card:hover{transform:translateY(-4px);box-shadow:0 24px 44px -22px rgba(20,30,20,.3)}.card .ic{font-size:28px;margin-bottom:12px}.card h3{font-size:1.2rem;font-weight:var(--wd);margin-bottom:6px}.card p{font-size:.95rem}
  /* stats */
  .strip.band{background:var(--deep);color:#fff}.strip.band .l{opacity:.72}
  .strip.plain{background:var(--surface)}
  .strip .wrap{display:flex;flex-wrap:wrap;justify-content:space-around;gap:34px;padding:60px 28px;text-align:center}
  .strip .n{font-family:var(--disp);font-size:clamp(2.2rem,5vw,3.4rem);font-weight:var(--wd);line-height:.9}.strip.band .n{color:#fff}.strip.plain .n{color:var(--brand)}
  .strip .l{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;margin-top:10px}
  /* gallery */
  .collage{display:grid;grid-template-columns:repeat(12,1fr);grid-template-rows:1fr 1fr;gap:16px;aspect-ratio:16/10}
  .collage figure{margin:0;overflow:hidden;border-radius:14px}.collage img{width:100%;height:100%;object-fit:cover;transition:transform .9s cubic-bezier(.2,.7,.2,1)}
  .collage figure:hover img{transform:scale(1.06)}
  .c1{grid-column:1/7;grid-row:1/3}.c2{grid-column:7/10;grid-row:1/2}.c3{grid-column:10/13;grid-row:1/2}.c4{grid-column:7/10;grid-row:2/3}.c5{grid-column:10/13;grid-row:2/3}
  .grid-gal{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:190px;gap:16px}
  .grid-gal figure{margin:0;overflow:hidden;border-radius:14px}.grid-gal img{width:100%;height:100%;object-fit:cover;transition:transform .8s}.grid-gal figure:hover img{transform:scale(1.05)}.grid-gal .big{grid-column:span 2;grid-row:span 2}
  /* cta */
  .cta-band{position:relative;text-align:center;color:#fff;border-radius:26px;padding:72px 26px;overflow:hidden;background:var(--deep)}
  .cta-band::after{content:"";position:absolute;top:-90px;left:50%;transform:translateX(-50%);width:560px;height:320px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--brand) 55%,transparent),transparent 60%)}
  .cta-band h2{position:relative;font-size:clamp(1.9rem,4vw,2.9rem)}.cta-band p{position:relative;opacity:.86;margin-top:12px}.cta-band .btn{position:relative;margin-top:26px}
  .cta-full{position:relative;min-height:60vh;display:grid;place-items:center;text-align:center;color:#fff;overflow:hidden}
  .cta-full img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2}.cta-full::after{content:"";position:absolute;inset:0;background:linear-gradient(rgba(15,20,15,.6),rgba(15,20,15,.82));z-index:-1}
  .cta-full h2{font-size:clamp(2rem,5vw,3.6rem);max-width:16ch}.cta-full p{opacity:.9;margin-top:14px}.cta-full .btn{margin-top:26px}
  /* contact */
  .contact{display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:start}
  .info{padding:20px 0;border-top:1px solid var(--line)}.info b{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.16em;color:var(--brand);margin-bottom:4px}.info span{color:var(--muted)}
  .map{border-radius:18px;overflow:hidden;border:1px solid var(--line);min-height:330px}.map iframe{width:100%;height:100%;min-height:330px;border:0;display:block;filter:grayscale(.2)}
  footer{background:var(--deep);color:rgba(255,255,255,.78);padding:56px 0 34px;margin-top:0}
  footer .ft{display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px;align-items:flex-end}footer .brand{color:#fff}
  footer .made{opacity:.5;font-size:.78rem;margin-top:40px;border-top:1px solid rgba(255,255,255,.12);padding-top:18px}
  .wfloat{position:fixed;right:20px;bottom:20px;z-index:90;background:#25D366;color:#fff;width:58px;height:58px;border-radius:50%;display:grid;place-items:center;box-shadow:0 14px 30px -8px rgba(37,211,102,.6)}
  .wfloat svg{width:30px;height:30px}
  /* testimonial */
  .tst-single{text-align:center;max-width:840px}.tst-single .stars.big{color:var(--gold);font-size:1.4rem;letter-spacing:4px;margin-bottom:20px}
  .tst-single blockquote{font-family:var(--disp);font-size:clamp(1.6rem,3.4vw,2.6rem);font-weight:400;line-height:1.3}.tst-author{margin-top:22px;color:var(--muted);font-weight:600}
  .tst-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}
  .tst-card{margin:0;background:var(--bg);border:1px solid var(--line);border-radius:18px;padding:30px}.tst-card .stars{color:var(--gold);margin-bottom:14px}.tst-card blockquote{font-size:1.05rem;line-height:1.5}.tst-card figcaption{margin-top:16px;color:var(--muted);font-weight:600;font-size:.92rem}
  /* steps */
  .steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:30px}
  .step{padding-top:18px;border-top:2px solid var(--brand)}.step-n{color:var(--brand);font-size:1.1rem}.step h3{font-size:1.3rem;font-weight:var(--wd);margin:8px 0}.step p{font-size:.96rem}
  /* feature */
  .feature{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center}.feature.rev .feature-img{order:2}
  .feature-img img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:18px;box-shadow:0 36px 64px -34px rgba(20,30,20,.4)}
  /* faq */
  .faq-wrap{max-width:840px}.faq-i{border-bottom:1px solid var(--line);padding:22px 0}
  .faq-i summary{font-size:1.2rem;font-weight:var(--wd);cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:20px}.faq-i summary::-webkit-details-marker{display:none}
  .faq-i summary::after{content:"+";color:var(--brand);font-size:1.5rem;flex:none}.faq-i[open] summary::after{content:"−"}.faq-i p{margin-top:14px}
  /* banner */
  .banner{background:var(--brand);color:#fff}.banner .wrap{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:26px 28px;flex-wrap:wrap}.banner span{font-size:clamp(1.1rem,2.4vw,1.5rem)}
  /* hero centered */
  .hero-centered{position:relative;text-align:center;padding:96px 0 80px;overflow:hidden}
  .hero-centered h1{font-family:var(--disp);font-weight:var(--wd);font-size:clamp(2.6rem,6vw,5rem);line-height:1.02;letter-spacing:-.02em;max-width:18ch;margin:0 auto}
  .hero-centered .lede{margin:22px auto 0}.hero-centered .trust{justify-content:center}
  .hero-c-img{margin-top:50px;border-radius:22px;overflow:hidden;max-height:540px}.hero-c-img img{width:100%;height:100%;max-height:540px;object-fit:cover}
  /* gallery strip */
  .strip-gal{display:flex;gap:16px;overflow-x:auto;padding:0 28px 12px;scroll-snap-type:x mandatory;max-width:1180px;margin:0 auto}
  .strip-gal figure{margin:0;flex:0 0 320px;aspect-ratio:4/3;border-radius:14px;overflow:hidden;scroll-snap-align:start}.strip-gal img{width:100%;height:100%;object-fit:cover}
  /* cta split */
  .cta-split{background:var(--deep);color:#fff;border-radius:24px;padding:48px;display:flex;align-items:center;justify-content:space-between;gap:30px;flex-wrap:wrap}.cta-split h2{font-size:clamp(1.6rem,3.4vw,2.4rem)}.cta-split p{opacity:.85;margin-top:8px}
  /* motion */
  [data-reveal]{opacity:0;transform:translateY(26px);transition:opacity .8s cubic-bezier(.2,.7,.2,1),transform .8s cubic-bezier(.2,.7,.2,1)}[data-reveal].in{opacity:1;transform:none}
  ${anim("aurora") ? `.aurora{position:absolute;inset:-50% -15% auto -15%;height:165%;z-index:-1;pointer-events:none;filter:blur(58px) saturate(1.15);opacity:.45;background-image:repeating-linear-gradient(100deg,#000 0%,#000 6%,transparent 9%,transparent 12%,#000 15%),repeating-linear-gradient(100deg,var(--brand) 6%,${lighten(t.brand)} 14%,var(--surface) 20%,var(--brand) 26%,${lighten(t.brand,1.3)} 30%);background-size:300%,200%;-webkit-mask-image:radial-gradient(ellipse at 72% 6%,#000 8%,transparent 64%);mask-image:radial-gradient(ellipse at 72% 6%,#000 8%,transparent 64%);animation:aurora 60s linear infinite}@keyframes aurora{from{background-position:50% 50%,50% 50%}to{background-position:350% 50%,350% 50%}}` : ""}
  ${anim("textgen") ? ".wg{display:inline-block;opacity:0;filter:blur(11px);transform:translateY(8px);transition:opacity .85s ease,filter .85s ease,transform .85s ease}.wg.on{opacity:1;filter:blur(0);transform:none}" : ""}
  ${anim("shimmer") ? `.shine{position:relative;overflow:hidden}.shine>*{position:relative;z-index:1}.shine::after{content:"";position:absolute;top:0;left:-160%;width:55%;height:100%;pointer-events:none;z-index:2;background:linear-gradient(100deg,transparent,rgba(255,255,255,.35),transparent);transform:skewX(-20deg);animation:shine 5s ease-in-out infinite}@keyframes shine{0%,55%{left:-160%}100%{left:170%}}` : ""}
  @media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}[data-reveal],.wg{opacity:1;transform:none;filter:none}}
  @media(max-width:860px){
    .hero-split,.hero-editorial,.about,.contact{grid-template-columns:1fr;gap:34px}
    .hero-split,.hero-editorial{padding:40px 0 56px;min-height:auto;text-align:center}.hero-photo,.hero-art{order:-1}
    .hero .row,.hero .trust{justify-content:center}.hero .lede{margin-left:auto;margin-right:auto}
    .hero-badge,.hero-tag{display:none}
    .strip .wrap{display:grid;grid-template-columns:1fr 1fr;gap:30px 16px;padding:48px 22px}
    .about{text-align:center}.about .lead{margin:0 auto}
    .zig{grid-template-columns:1fr;gap:24px}.zig:nth-child(even) .zig-img{order:0}.zig-img{aspect-ratio:16/10}
    .svcs{grid-template-columns:1fr;gap:0}.mini{grid-template-columns:1fr}
    .collage{grid-template-columns:repeat(2,1fr)!important;grid-template-rows:none!important;grid-auto-rows:150px;aspect-ratio:auto}.collage .c1{grid-column:1/-1!important;grid-row:auto!important}.collage figure{grid-column:auto!important;grid-row:auto!important}
    .grid-gal{grid-template-columns:repeat(2,1fr);grid-auto-rows:150px}.grid-gal .big{grid-column:span 2!important;grid-row:span 1!important}
    .feature{grid-template-columns:1fr;gap:30px}.feature.rev .feature-img{order:0}
    .cta-split{flex-direction:column;text-align:center;padding:34px}.steps{grid-template-columns:1fr}
    .banner .wrap{flex-direction:column;text-align:center}.strip-gal figure{flex-basis:240px}
    .sec{padding:60px 0}.manifesto{padding:70px 28px}.about-photo{display:none}
  }`;
}

function animJS(anim) {
  let js = `const rm=matchMedia('(prefers-reduced-motion:reduce)').matches;`;
  if (anim("textgen")) js += `const tg=document.querySelector('[data-textgen]');if(tg&&!rm){const ws=tg.textContent.trim().split(/\\s+/);tg.textContent='';ws.forEach((w,i)=>{const s=document.createElement('span');s.className='wg';s.textContent=w;s.style.transitionDelay=(i*90)+'ms';tg.appendChild(s);tg.appendChild(document.createTextNode(' '));});requestAnimationFrame(()=>requestAnimationFrame(()=>tg.querySelectorAll('.wg').forEach(s=>s.classList.add('on'))));}`;
  if (anim("parallax")) js += `const pi=document.querySelector('.hero-frame img,.hero-art .ph img');if(pi&&!rm){let t=false;addEventListener('scroll',()=>{if(t)return;t=true;requestAnimationFrame(()=>{pi.style.transform='translateY('+Math.max(-50,Math.min(50,scrollY*0.06))+'px)';t=false;});},{passive:true});}`;
  js += `const io=new IntersectionObserver((e)=>{e.forEach(x=>{if(x.isIntersecting){x.target.classList.add('in');io.unobserve(x.target)}})},{threshold:.12});document.querySelectorAll('[data-reveal]').forEach(el=>io.observe(el));`;
  js += `const cio=new IntersectionObserver((e)=>{e.forEach(x=>{if(!x.isIntersecting)return;const el=x.target,to=parseFloat(el.dataset.count),dec=(el.dataset.count+'').includes('.')?1:0,sf=el.dataset.suffix||'',t0=performance.now(),d=1300;(function tk(n){const p=Math.min((n-t0)/d,1),v=to*(1-Math.pow(1-p,3));el.textContent=v.toFixed(dec)+sf;if(p<1)requestAnimationFrame(tk);})(t0);cio.unobserve(el);});},{threshold:.5});document.querySelectorAll('[data-count]').forEach(el=>cio.observe(el));`;
  return js;
}

// ── RENDER PRINCIPAL ──
export function renderSpec(spec) {
  const art = spec.art_direction || {};
  const ts = TYPE_SYSTEMS[art.type_system] || TYPE_SYSTEMS["serif-editorial"];
  const t = palette(art);
  const animsSet = new Set(art.animations || ["reveal"]);
  const anim = (k) => animsSet.has(k);
  const meta = spec.meta || {};
  const wa = meta.whatsapp || waLink(meta.phone);
  const ctx = { wa, anim, nome: meta.nome || "" };

  const body = (spec.sections || []).map((s) => {
    const group = SECTIONS[s.type];
    if (!group) return "";
    const fn = typeof group === "function" ? group : (group[s.variant] || Object.values(group)[0]);
    const props = Object.assign({ nome: meta.nome }, s.props || {});
    try { return fn(props, ctx); } catch (e) { return `<!-- erro na secao ${s.type}/${s.variant}: ${esc(e.message)} -->`; }
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(meta.nome || "Prévia")}${meta.bairro ? " — " + esc(meta.bairro) : ""}</title>
<meta name="description" content="${esc(meta.descricao || meta.nome || "")}">
${meta.ogImage ? `<meta property="og:image" content="${esc(meta.ogImage)}">` : ""}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${ts.imp}&display=swap" rel="stylesheet">
<style>${baseCSS(ts, t, anim)}</style>
</head>
<body>
${body}
${wa ? `<a class="wfloat" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON_WA}</a>` : ""}
<script>${animJS(anim)}</script>
</body>
</html>`;
}
