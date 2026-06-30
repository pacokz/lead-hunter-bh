from playwright.sync_api import sync_playwright
import pathlib
url = pathlib.Path("index.html").resolve().as_uri()
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1280,"height":900}, device_scale_factor=2)
    pg.goto(url); pg.wait_for_timeout(1000)
    pg.eval_on_selector("#contato","el=>el.scrollIntoView()"); pg.wait_for_timeout(900)
    el = pg.query_selector("#contato")
    el.screenshot(path="_qa_loc.png")
    b.close()
print("done")
