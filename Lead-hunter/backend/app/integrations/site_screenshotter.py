"""Captura visual do site do lead com Playwright (Chromium headless).

Tira screenshot full-page em desktop (1440) e mobile (390), mede o tempo de carga e
detecta overflow horizontal no celular (quebra de layout). É **best-effort**: se o
Playwright/Chromium não estiver disponível ou a captura falhar, devolve vazio sem
quebrar a auditoria — a parte HTTP+BeautifulSoup continua valendo.
"""
from __future__ import annotations

import re
import time
from pathlib import Path

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile": {"width": 390, "height": 844},
}

# força reveal de animações comuns pra não printar seção vazia
_FORCE_VISIBLE = (
    "[data-reveal],[data-aos],[data-animate],.reveal,.wow,.aos-init"
    "{opacity:1!important;transform:none!important;visibility:visible!important}"
)


def _slugify(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_-]+", "_", value)[:120] or "lead"


def capture(url: str, out_dir: str, place_id: str, *, timeout: float = 20.0) -> dict:
    """Retorna {screenshots:[{viewport,path}], issues:[(type,sev,desc)], metrics:{...}}.

    `path` é a URL relativa servida pela API (ex: /screenshots/<slug>/mobile.png).
    """
    result: dict = {"screenshots": [], "issues": [], "metrics": {}}
    if not url:
        return result

    try:
        from playwright.sync_api import sync_playwright
    except Exception:  # Playwright não instalado
        return result

    slug = _slugify(place_id)
    base = Path(out_dir) / slug
    try:
        base.mkdir(parents=True, exist_ok=True)
    except Exception:
        return result

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
            try:
                for name, vp in VIEWPORTS.items():
                    page = browser.new_page(viewport=vp, device_scale_factor=1)
                    start = time.monotonic()
                    try:
                        page.goto(url, wait_until="networkidle", timeout=int(timeout * 1000))
                    except Exception:
                        try:
                            page.goto(url, wait_until="load", timeout=int(timeout * 1000))
                        except Exception:
                            page.close()
                            continue
                    load_s = round(time.monotonic() - start, 2)
                    result["metrics"][f"{name}_load_s"] = load_s

                    try:
                        page.add_style_tag(content=_FORCE_VISIBLE)
                    except Exception:
                        pass
                    page.wait_for_timeout(600)

                    fp = base / f"{name}.png"
                    try:
                        page.screenshot(path=str(fp), full_page=True)
                        result["screenshots"].append({"viewport": name, "path": f"/screenshots/{slug}/{name}.png"})
                    except Exception:
                        pass

                    if name == "mobile":
                        try:
                            overflow = page.evaluate(
                                "() => Math.max(0, document.documentElement.scrollWidth - window.innerWidth)"
                            )
                        except Exception:
                            overflow = 0
                        if overflow and overflow > 8:
                            result["issues"].append((
                                "overflow_mobile", "alta",
                                f"Conteúdo vaza {int(overflow)}px na horizontal no celular (layout quebra no mobile).",
                            ))
                    page.close()
            finally:
                browser.close()
    except Exception as exc:  # noqa: BLE001
        result["issues"].append(("captura_falhou", "baixa", f"Não consegui capturar os prints: {exc}"))

    dl = result["metrics"].get("desktop_load_s")
    if dl is not None and dl > 6:
        result["issues"].append(("lento_visual", "media", f"Página leva {dl}s pra abrir (desktop)."))
    return result
