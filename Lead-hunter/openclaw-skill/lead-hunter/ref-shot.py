#!/usr/bin/env python
"""Captura screenshots REAIS das referencias pra o Nanami OLHAR (nao inferir do texto).
Le <refs-dir>/urls.json (lista escrita pelo Nanami no Passe 1) e salva NN.png + manifest.json.
Uso: python ref-shot.py <pasta refs/>
Exit 0 = >=3 capturas | 1 = poucas capturas | 2 = uso/erro."""
import sys, json, pathlib
from playwright.sync_api import sync_playwright

if len(sys.argv) < 2:
    print("uso: python ref-shot.py <pasta refs/> (com urls.json dentro)"); sys.exit(2)
refs_dir = pathlib.Path(sys.argv[1]).resolve()
urls_path = refs_dir / "urls.json"
if not urls_path.exists():
    print(f"sem {urls_path} — o Nanami escreve a lista de URLs (Passe 1) antes."); sys.exit(2)
try:
    items = json.loads(urls_path.read_text(encoding="utf-8"))
except Exception as e:
    print("urls.json invalido:", e); sys.exit(2)
if isinstance(items, dict):
    items = items.get("refs") or items.get("urls") or []
items = [x for x in items if isinstance(x, dict) and x.get("url")][:12]
if not items:
    print("urls.json sem nenhuma {url}."); sys.exit(2)
refs_dir.mkdir(parents=True, exist_ok=True)

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
DISMISS = ["#onetrust-accept-btn-handler", "button:has-text('Accept')", "button:has-text('Aceitar')",
           "button:has-text('I agree')", "button:has-text('Concordo')", "button:has-text('Got it')",
           "button:has-text('OK')", "[aria-label*='accept' i]", "[class*='accept' i]"]
manifest = []
with sync_playwright() as p:
    b = p.chromium.launch(headless=True, args=["--disable-blink-features=AutomationControlled"])
    ctx = b.new_context(viewport={"width": 1440, "height": 2200}, user_agent=UA, locale="pt-BR")
    for i, it in enumerate(items, 1):
        url = it["url"]; png = refs_dir / f"{i:02d}.png"; ok = False; err = None
        pg = ctx.new_page()
        try:
            pg.goto(url, wait_until="domcontentloaded", timeout=25000)
            try: pg.wait_for_load_state("networkidle", timeout=6000)
            except Exception: pass
            pg.wait_for_timeout(1500)
            for sel in DISMISS:  # tenta fechar cookie/consent
                try:
                    el = pg.query_selector(sel)
                    if el and el.is_visible():
                        el.click(timeout=1500); pg.wait_for_timeout(400); break
                except Exception: pass
            pg.mouse.wheel(0, 1400); pg.wait_for_timeout(700)  # dispara lazy
            pg.mouse.wheel(0, -1400); pg.wait_for_timeout(300)
            pg.screenshot(path=str(png))  # viewport (topo ~2200px): hero + 1as secoes
            ok = png.exists() and png.stat().st_size > 3000
        except Exception as ex:
            err = str(ex).splitlines()[0][:140]
        pg.close()
        row = {"n": i, "file": f"{i:02d}.png", "url": url, "ok": ok}
        if err: row["erro"] = err
        for k in ("fonte", "estetica", "elemento", "porque"):
            if k in it: row[k] = it[k]
        manifest.append(row)
        print(f"{'OK    ' if ok else 'FALHOU'} {i:02d}.png <- {url}" + (f"  ({err})" if err else ""))
    ctx.close(); b.close()

(refs_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
oks = sum(1 for m in manifest if m["ok"])
print(f"\n{oks}/{len(manifest)} screenshots reais em {refs_dir}/ (manifest.json escrito).")
print(">>> Nanami: OLHE os refs/NN.png e escolha o roubo PELO QUE VIU (cite o arquivo).")
sys.exit(0 if oks >= 3 else 1)
