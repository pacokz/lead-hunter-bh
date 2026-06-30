#!/usr/bin/env python
"""Captura screenshots multi-viewport pra a REVISAO VISUAL por IA (camada 4 do QA).
Uso: python qa-visual.py <index.html>
Salva mobile/tablet/desktop em <pasta da demo>/_qa/ e diz pra revisar com QA-VISUAL.md."""
import sys, pathlib
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    print("uso: python qa-visual.py <arquivo.html ou URL>"); sys.exit(2)
target = sys.argv[1]
url = target if target.startswith("http") else pathlib.Path(target).resolve().as_uri()
outdir = (pathlib.Path(target).parent / "_qa") if not target.startswith("http") else pathlib.Path("_qa")
outdir.mkdir(exist_ok=True)

VIEWS = [("mobile", 390, 844), ("tablet", 768, 1024), ("desktop", 1440, 900)]
SCROLL = "()=>new Promise(r=>{let y=0;const t=setInterval(()=>{scrollTo(0,y);y+=500;if(y>document.body.scrollHeight){clearInterval(t);scrollTo(0,0);r();}},70);})"

with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    for name, w, h in VIEWS:
        pg = b.new_page(viewport={"width": w, "height": h})
        try:
            pg.goto(url, wait_until="domcontentloaded", timeout=20000)
            try: pg.wait_for_load_state("networkidle", timeout=6000)
            except Exception: pass
            pg.wait_for_timeout(1200)
            pg.evaluate(SCROLL); pg.wait_for_timeout(400)
            # força o estado FINAL visível (senão reveals nao disparados viram "secao em branco")
            pg.add_style_tag(content="[data-reveal]{opacity:1!important;transform:none!important}.wg{opacity:1!important;filter:none!important;transform:none!important}")
            pg.wait_for_timeout(250)
            pg.screenshot(path=str(outdir / f"{name}.png"), full_page=True)
        except Exception as ex:
            print(f"falha no {name}: {ex}")
        pg.close()
    b.close()

print("Screenshots prontos pra revisao visual:")
for name, _, _ in VIEWS:
    print(f"  {outdir / (name + '.png')}")
print("\n>>> Agora ABRA esses 3 screenshots, siga o prompt de QA-VISUAL.md e produza o JSON")
print(">>> {publishable, issues:[...]}. NAO publique se publishable=false ou houver BLOCKER.")
