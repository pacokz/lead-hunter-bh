#!/usr/bin/env python
"""Scraper de imagens com navegador headless — pega fotos lazy-load (Wix/JS) que o fetch simples nao alcanca.
Uso: python scrape-images.py <url> <pasta_demo> [maxn]
Baixa em <pasta_demo>/img/foto-N.jpg as maiores fotos REAIS (pula logos/icones/banners)."""
import sys, pathlib
from playwright.sync_api import sync_playwright

if len(sys.argv) < 3:
    print("uso: python scrape-images.py <url> <pasta_demo> [maxn]"); sys.exit(2)
url = sys.argv[1]
destdir = pathlib.Path(sys.argv[2])
maxn = int(sys.argv[3]) if len(sys.argv) > 3 else 10
imgdir = destdir / "img"; imgdir.mkdir(parents=True, exist_ok=True)

COLLECT = r"""
() => {
  const out=[];
  const skip=(s)=>/logo|icon|favicon|sprite|avatar|badge|selo|whatsapp|wp-|\.svg/i.test(s);
  for(const im of document.querySelectorAll('img')){
    const w=im.naturalWidth, h=im.naturalHeight, src=im.currentSrc||im.src;
    if(!src||src.startsWith('data:')||skip(src)) continue;
    if(w<420||h<280) continue;                 // pula icone/logo/thumb
    const ar=w/h; if(ar<0.45||ar>3.0) continue; // pula banner fino/coluna estreita
    out.push({src, area:w*h});
  }
  for(const el of document.querySelectorAll('section,div,header,figure')){
    const bg=getComputedStyle(el).backgroundImage;
    const m=bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if(m && /^https?:/.test(m[1]) && !skip(m[1])){ const r=el.getBoundingClientRect();
      if(r.width>520 && r.height>320) out.push({src:m[1], area:r.width*r.height}); }
  }
  return out;
}
"""
SCROLL = "()=>new Promise(r=>{let y=0;const t=setInterval(()=>{scrollTo(0,y);y+=380;if(y>document.body.scrollHeight){clearInterval(t);scrollTo(0,0);r();}},90);})"

saved = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    pg = b.new_page(viewport={"width": 1440, "height": 900})
    pg.goto(url, wait_until="domcontentloaded", timeout=30000)
    try: pg.wait_for_load_state("networkidle", timeout=8000)
    except Exception: pass
    pg.wait_for_timeout(1200)
    pg.evaluate(SCROLL); pg.wait_for_timeout(1600)
    items = pg.evaluate(COLLECT)
    seen = set(); uniq = []
    for it in sorted(items, key=lambda x: -x["area"]):
        base = it["src"].split("?")[0]
        if base in seen: continue
        seen.add(base); uniq.append(it)
    for it in uniq:
        if len(saved) >= maxn: break
        try:
            resp = pg.request.get(it["src"], timeout=15000)
            if not resp.ok: continue
            body = resp.body()
            if len(body) < 9000: continue                       # pula imagem minuscula
            if len(body) / max(it["area"], 1) < 0.04: continue   # pula cor solida/decorativo (ex: circulo do Wix)
            fn = imgdir / f"foto-{len(saved)+1}.jpg"
            fn.write_bytes(body); saved.append(str(fn))
        except Exception:
            pass
    b.close()

print(f"BAIXOU {len(saved)} fotos reais em {imgdir}")
for s in saved: print("  " + s)
