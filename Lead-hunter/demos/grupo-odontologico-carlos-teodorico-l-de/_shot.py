from playwright.sync_api import sync_playwright
import pathlib
url = pathlib.Path("index.html").resolve().as_uri()
def scroll_through(pg):
    h = pg.evaluate("document.body.scrollHeight")
    y = 0
    while y < h:
        pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(140); y += 600
    pg.evaluate("window.scrollTo(0,document.body.scrollHeight)"); pg.wait_for_timeout(500)
    pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(400)
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width":1280,"height":900}, device_scale_factor=2)
    pg.goto(url); pg.wait_for_timeout(1200)
    scroll_through(pg)
    pg.screenshot(path="_qa_desktop.png", full_page=True)
    pg.set_viewport_size({"width":390,"height":844})
    pg.wait_for_timeout(600); scroll_through(pg)
    pg.screenshot(path="_qa_mobile.png", full_page=True)
    b.close()
print("done")
