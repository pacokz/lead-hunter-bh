#!/usr/bin/env python
"""Verificador de erros de interface de um site/demo HTML (desktop + mobile).
Uso: python check.py <caminho do index.html ou URL>
Saida: relatorio de problemas por severidade. Exit 0 = limpo, 1 = achou problema."""
import sys, pathlib
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    print("uso: python check.py <arquivo.html ou URL>"); sys.exit(2)
target = sys.argv[1]
url = target if target.startswith("http") else pathlib.Path(target).resolve().as_uri()

issues = []
def add(sev, vp, msg): issues.append((sev, vp, msg))

# ── CAMADA 1: checks estaticos deterministicos (antes do browser) ──
html_src = ""
if not target.startswith("http"):
    try: html_src = pathlib.Path(target).read_text(encoding="utf-8", errors="ignore").lower()
    except Exception: pass
for ph in ["lorem ipsum", "lorem", "todo:", "nome do negocio", "nome do negócio",
           "telefone aqui", "seu telefone aqui", "seu nome aqui", "placeholder",
           "lipsum", "[inserir", "{{", "xxxxx", "endereço aqui", "endereco aqui"]:
    if ph in html_src: add("ALTA", "static", f"texto PLACEHOLDER no site: '{ph}'")
_nome = None
for _i, _a in enumerate(sys.argv):
    if _a == "--nome" and _i + 1 < len(sys.argv): _nome = sys.argv[_i + 1]
if _nome and _nome.lower() not in html_src:
    add("ALTA", "static", f"nome do negocio '{_nome}' NAO aparece no site")

CHECK_JS = r"""
() => {
  const out = {overflow:0, brokenImgs:[], emptySections:0, overlapNav:false};
  // overflow horizontal REAL (a pagina rola na horizontal) — sinal confiavel
  out.overflow = document.documentElement.scrollWidth - window.innerWidth;
  const imgs=[...document.querySelectorAll('img')];
  out.brokenImgs = imgs.filter(i=>i.complete && i.naturalWidth===0).map(i=>(i.currentSrc||i.src)).slice(0,8);
  const secs=[...document.querySelectorAll('section,header,footer')];
  out.emptySections = secs.filter(s=>s.offsetHeight<40 || (s.innerText||'').trim().length<2).length;
  // header sticky/fixed sobrepondo o conteudo do topo (ex: nome muito longo no nav)
  const hdr = document.querySelector('header, .top, .nav');
  if (hdr) { const pos=getComputedStyle(hdr).position;
    if (pos==='fixed'||pos==='sticky') { const hr=hdr.getBoundingClientRect();
      const el=document.elementFromPoint(Math.min(hr.left+hr.width/2, innerWidth-5), hr.bottom+12);
      // se logo abaixo do header tem texto colado/coberto, sinaliza (heuristica leve)
      out.overlapNav = hr.height > 110; } }
  // texto quase INVISIVEL (cor ~ fundo) em botoes/links — pega "branco no branco"
  const lum=(c)=>{const m=(c||'').match(/\d+(\.\d+)?/g);if(!m)return null;const v=m.slice(0,3).map(x=>{x=x/255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);});return 0.2126*v[0]+0.7152*v[1]+0.0722*v[2];};
  const ctr=(a,b)=>{const la=lum(a),lb=lum(b);if(la==null||lb==null)return 99;return (Math.max(la,lb)+0.05)/(Math.min(la,lb)+0.05);};
  const low=[];
  for(const el of document.querySelectorAll('a.btn,.btn,button')){const s=getComputedStyle(el),bg=s.backgroundColor;if(bg && !/, *0\)/.test(bg)){const c=ctr(s.color,bg);if(c<2 && (el.textContent||'').trim())low.push((el.textContent||'').trim().slice(0,32)+' (contraste '+c.toFixed(1)+')');}}
  out.lowContrast=[...new Set(low)].slice(0,5);
  // CTA (botao) sem link real
  out.badCta=[...document.querySelectorAll('a.btn')].filter(a=>{const h=a.getAttribute('href');return !h||h==='#'||(h||'').startsWith('javascript');}).length;
  // texto CORTADO dentro do proprio container — mede o TEXTO real via Range
  // (scrollWidth engana: pseudo-elementos animados tipo shimmer inflam o valor)
  const clipped=[];
  for(const el of document.querySelectorAll('h1,h2,h3,.btn,.brand,.chip,.hl')){
    if(!(el.textContent||'').trim() || getComputedStyle(el).overflowX==='visible') continue;
    try{
      const rg=document.createRange(); rg.selectNodeContents(el);
      const tw=rg.getBoundingClientRect().width;
      if(tw - el.clientWidth > 6) clipped.push((el.textContent||'').trim().slice(0,28));
    }catch(e){}
  }
  out.clipped=[...new Set(clipped)].slice(0,5);
  // alvo de toque pequeno demais (mobile): botao/link de acao com menos de 40px de altura
  out.smallTargets=0;
  if(window.innerWidth<500){
    out.smallTargets=[...document.querySelectorAll('a.btn,button,.wfloat')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.height<40;}).length;
  }
  // SOBREPOSICAO suspeita entre textos/botoes/cards (camada visual) — pega "card em cima de texto"
  const vis=(e)=>{const s=getComputedStyle(e);if(s.visibility==='hidden'||s.display==='none'||parseFloat(s.opacity)<0.1)return false;const r=e.getBoundingClientRect();return r.width>2&&r.height>2;};
  const fx=(e)=>{let p=e;while(p&&p!==document.body){if(getComputedStyle(p).position==='fixed')return true;p=p.parentElement;}return false;};
  const cn=[...document.querySelectorAll('h1,h2,h3,h4,p,blockquote,.btn,.trust,.hero-badge,.hero-tag,.info,.stat')].filter(e=>vis(e)&&!e.closest('[aria-hidden="true"],.aurora,.ticker')&&!fx(e)&&(e.innerText||'').trim().length>1);
  const ov=[];
  for(let i=0;i<cn.length;i++)for(let j=i+1;j<cn.length;j++){const a=cn[i],b=cn[j];if(a.contains(b)||b.contains(a))continue;const ra=a.getBoundingClientRect(),rb=b.getBoundingClientRect();const ox=Math.max(0,Math.min(ra.right,rb.right)-Math.max(ra.left,rb.left)),oy=Math.max(0,Math.min(ra.bottom,rb.bottom)-Math.max(ra.top,rb.top)),ar=ox*oy;if(ar<=0)continue;const mn=Math.min(ra.width*ra.height,rb.width*rb.height);if(ar>0.35*mn)ov.push(((a.innerText||'').trim().slice(0,18))+' x '+((b.innerText||'').trim().slice(0,18)));}
  out.overlaps=[...new Set(ov)].slice(0,5);
  // pagina arrasta na horizontal? (teste ativo, alem do scrollWidth estatico)
  const _sx=window.scrollX; window.scrollTo(99999,0); out.pageHScroll=Math.round(window.scrollX||window.pageXOffset||0); window.scrollTo(_sx,0);
  // carrossel/scroll horizontal FULL-WIDTH no mobile (o "arrasta pro lado" que parece bug)
  out.mobileCarousels=0;
  if(window.innerWidth<500){
    out.mobileCarousels=[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return /(auto|scroll)/.test(s.overflowX)&&e.scrollWidth-e.clientWidth>24&&e.getBoundingClientRect().width>window.innerWidth*0.8;}).length;
  }
  // stat com "0"/placeholder onde deveria ter numero real
  const zeros=[]; const _t=(document.body.innerText||'');
  for(const m of _t.matchAll(/\b0\b\s{0,4}(avalia\w*|pacient\w*|anos|clientes|atendidos|reais)/gi)) zeros.push(m[0].replace(/\s+/g,' ').trim().slice(0,30));
  out.zeroStats=[...new Set(zeros)].slice(0,4);
  // CTA (botao de acao) visivel acima da dobra?
  const _ctas=[...document.querySelectorAll('a.btn,.btn,button')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&(e.textContent||'').trim().length>2;});
  out.ctaAboveFold=_ctas.some(e=>e.getBoundingClientRect().top<window.innerHeight*0.95);
  // secoes GRANDES com pouco conteudo e sem media = espaco morto
  const sparse=[];
  for(const s of document.querySelectorAll('section')){const r=s.getBoundingClientRect();const t=(s.innerText||'').trim();const media=s.querySelector('img,video,svg,picture,canvas')||/url\(/.test(getComputedStyle(s).backgroundImage);if(r.height>640&&t.length<110&&!media)sparse.push(t.slice(0,24)||'(vazia)');}
  out.sparseSections=[...new Set(sparse)].slice(0,4);
  return out;
}
"""
SCROLL_JS = "()=>new Promise(r=>{let y=0;const t=setInterval(()=>{window.scrollTo(0,y);y+=500;if(y>document.body.scrollHeight){clearInterval(t);window.scrollTo(0,0);r();}},70);})"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for vp_name, w, h in [("desktop", 1280, 900), ("mobile", 390, 844), ("tablet", 768, 1024), ("wide", 1920, 1080)]:
        pg = b.new_page(viewport={"width": w, "height": h})
        errs = []
        pg.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda ex, e=errs: e.append(str(ex)))
        try:
            pg.goto(url, wait_until="domcontentloaded", timeout=20000)
            try: pg.wait_for_load_state("networkidle", timeout=6000)
            except Exception: pass
            pg.wait_for_timeout(1100)
            pg.evaluate(SCROLL_JS)
            pg.wait_for_timeout(400)
            pg.add_style_tag(content="[data-reveal]{opacity:1!important;transform:none!important}.wg{opacity:1!important;filter:none!important;transform:none!important}")
            pg.wait_for_timeout(200)
            r = pg.evaluate(CHECK_JS)
            if r["overflow"] > 3:
                add("ALTA", vp_name, f"overflow horizontal de {r['overflow']}px — algo estoura a largura da tela")
            for src in r["brokenImgs"]:
                add("ALTA", vp_name, f"imagem quebrada (nao carregou): {src}")
            if r["emptySections"] > 0:
                add("MEDIA", vp_name, f"{r['emptySections']} secao(oes) vazia(s) ou sem altura")
            if r.get("overlapNav"):
                add("BAIXA", vp_name, "cabecalho (nav) alto demais — nome longo pode estar quebrando/sobrepondo o topo")
            for txt in r.get("lowContrast", []):
                add("ALTA", vp_name, f"texto quase INVISIVEL (cor ~ fundo) num botao: '{txt}'")
            if r.get("badCta"):
                add("MEDIA", vp_name, f"{r['badCta']} botao CTA sem link real (href '#' ou vazio)")
            for o in r.get("overlaps", []):
                add("ALTA", vp_name, f"elementos SOBREPOSTOS (um em cima do outro): {o}")
            for t in r.get("clipped", []):
                add("MEDIA", vp_name, f"texto CORTADO dentro do container: '{t}'")
            if r.get("smallTargets"):
                add("MEDIA", vp_name, f"{r['smallTargets']} botao(oes) com alvo de toque < 40px de altura no celular")
            if r.get("pageHScroll", 0) > 3:
                add("ALTA", vp_name, f"pagina ARRASTA na horizontal ({r['pageHScroll']}px) — algo estoura a largura")
            if r.get("mobileCarousels", 0) > 0:
                add("ALTA", vp_name, f"{r['mobileCarousels']} secao(oes) com scroll horizontal full-width no MOBILE ('arrasta pro lado' = parece bug; so carrossel com affordance clara e nao full-bleed)")
            for z in r.get("zeroStats", []):
                add("ALTA", vp_name, f"stat com valor ZERO/placeholder: '{z}' (numero real faltando ou contador travado)")
            if vp_name in ("mobile", "desktop") and not r.get("ctaAboveFold", True):
                add("MEDIA", vp_name, "nenhum CTA de acao visivel acima da dobra")
            for s in r.get("sparseSections", []):
                add("MEDIA", vp_name, f"secao GRANDE com pouco conteudo e sem imagem (espaco morto): '{s}'")
            for e in errs[:5]:
                add("MEDIA", vp_name, f"erro de JavaScript no console: {e[:140]}")
        except Exception as ex:
            add("ALTA", vp_name, f"falha ao carregar a pagina: {ex}")
        pg.close()
    b.close()

if not issues:
    print("OK — interface sem erros (desktop + mobile): sem overflow, imagens carregando, sem erro de JS, secoes preenchidas.")
    sys.exit(0)
order = {"ALTA": 0, "MEDIA": 1, "BAIXA": 2}
print(f"ACHEI {len(issues)} PROBLEMA(S) DE INTERFACE:")
for sev, vp, msg in sorted(issues, key=lambda x: order[x[0]]):
    print(f"  [{sev}] ({vp}) {msg}")
blocking = any(s == "ALTA" for s, _, _ in issues)
print(f"\n{'>>> BLOQUEANTE: ' if blocking else ''}Corrija os [ALTA] (bloqueiam a publicacao) e [MEDIA] antes de publicar.")
sys.exit(2 if blocking else 1)
