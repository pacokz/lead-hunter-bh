"""Auditoria básica de sites: HTTPX + BeautifulSoup → classificação determinística.

Classifica em: SEM_SITE | FORA_DO_AR | REDE_SOCIAL | SITE_OBSOLETO |
SITE_FRACO | SITE_RAZOAVEL | SITE_BOM.
"""
from __future__ import annotations

import time
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

from app.enums import SiteClass

# Domínios que indicam "site" que na verdade é rede social / link-in-bio
SOCIAL_HOST_DOMAINS = (
    "instagram.com",
    "facebook.com",
    "fb.com",
    "fb.me",
    "linktr.ee",
    "linktree.com",
    "beacons.ai",
    "linkin.bio",
    "about.me",
    "linq.app",
)

# Domínios de redes sociais a detectar DENTRO de um site
SOCIAL_LINK_DOMAINS = (
    "instagram.com",
    "facebook.com",
    "linkedin.com",
    "youtube.com",
    "tiktok.com",
    "twitter.com",
    "x.com",
)

WHATSAPP_MARKERS = ("wa.me", "api.whatsapp.com", "whatsapp://", "web.whatsapp.com")


def _host(url: str) -> str:
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def extract_instagram_handle(url: str) -> str | None:
    host = _host(url)
    if "instagram.com" not in host:
        return None
    path = urlparse(url).path.strip("/")
    if not path:
        return None
    handle = path.split("/")[0].split("?")[0]
    return handle or None


def _classify_working(
    *,
    https: bool,
    responsive: bool,
    response_time: float | None,
    has_title: bool,
    has_description: bool,
    has_contact: bool,
    has_social: bool,
) -> SiteClass:
    # Critérios de obsolescência do PLAYBOOK
    if (not https) or (not responsive) or (response_time is not None and response_time > 5):
        return SiteClass.SITE_OBSOLETO

    good_signals = sum(
        [
            has_title,
            has_description,
            has_contact,
            has_social,
            response_time is not None and response_time < 2,
        ]
    )
    if good_signals <= 1:
        return SiteClass.SITE_FRACO
    if good_signals <= 3:
        return SiteClass.SITE_RAZOAVEL
    return SiteClass.SITE_BOM


def audit_site(
    website: str | None,
    *,
    client: httpx.Client | None = None,
    timeout: float = 10.0,
) -> dict:
    """Audita um site e retorna um dicionário pronto pra persistir em site_audits."""
    result: dict = {
        "site_class": None,
        "https": None,
        "responsive": None,
        "http_status": None,
        "final_url": None,
        "response_time_s": None,
        "title": None,
        "meta_description": None,
        "has_form": None,
        "has_whatsapp": None,
        "social_links": [],
        "instagram_handle": None,
        "issues": [],
    }

    if not website or not website.strip():
        result["site_class"] = SiteClass.SEM_SITE
        result["issues"].append(("sem_site", "alta", "Empresa não tem site cadastrado."))
        return result

    website = website.strip()

    # "Site" que é rede social / link-in-bio
    if _host(website) in SOCIAL_HOST_DOMAINS or _host(website).endswith(SOCIAL_HOST_DOMAINS):
        result["site_class"] = SiteClass.REDE_SOCIAL
        result["instagram_handle"] = extract_instagram_handle(website)
        result["social_links"] = [website]
        result["issues"].append(
            ("rede_social", "alta", "Presença online é só rede social, não tem site próprio.")
        )
        return result

    own_client = client is None
    client = client or httpx.Client(timeout=timeout, follow_redirects=True)
    try:
        start = time.monotonic()
        try:
            resp = client.get(website)
        except httpx.HTTPError as exc:
            result["site_class"] = SiteClass.FORA_DO_AR
            result["issues"].append(("fora_do_ar", "alta", f"Site inacessível: {exc}"))
            return result
        elapsed = round(time.monotonic() - start, 3)

        result["http_status"] = resp.status_code
        result["final_url"] = str(resp.url)
        result["response_time_s"] = elapsed
        result["https"] = str(resp.url).lower().startswith("https")

        if resp.status_code >= 400:
            result["site_class"] = SiteClass.FORA_DO_AR
            result["issues"].append(
                ("fora_do_ar", "alta", f"Status HTTP {resp.status_code}.")
            )
            return result

        soup = BeautifulSoup(resp.text, "html.parser")

        title_tag = soup.title
        result["title"] = title_tag.get_text(strip=True) if title_tag else None

        desc = soup.find("meta", attrs={"name": "description"})
        result["meta_description"] = desc.get("content") if desc else None

        viewport = soup.find("meta", attrs={"name": "viewport"})
        result["responsive"] = viewport is not None

        result["has_form"] = soup.find("form") is not None

        hrefs = [a.get("href", "") for a in soup.find_all("a", href=True)]
        result["has_whatsapp"] = any(
            any(m in h.lower() for m in WHATSAPP_MARKERS) for h in hrefs
        )
        socials = []
        for h in hrefs:
            host = _host(h)
            if any(host == d or host.endswith("." + d) or host == d for d in SOCIAL_LINK_DOMAINS):
                socials.append(h)
        result["social_links"] = list(dict.fromkeys(socials))[:10]
        for s in result["social_links"]:
            handle = extract_instagram_handle(s)
            if handle:
                result["instagram_handle"] = handle
                break

        result["site_class"] = _classify_working(
            https=result["https"],
            responsive=result["responsive"],
            response_time=elapsed,
            has_title=bool(result["title"]),
            has_description=bool(result["meta_description"]),
            has_contact=bool(result["has_form"] or result["has_whatsapp"]),
            has_social=bool(result["social_links"]),
        )

        if not result["https"]:
            result["issues"].append(("sem_https", "alta", "Site sem HTTPS."))
        if not result["responsive"]:
            result["issues"].append(("nao_responsivo", "alta", "Sem meta viewport (não responsivo)."))
        if elapsed > 5:
            result["issues"].append(("lento", "media", f"Carregamento lento ({elapsed}s)."))
        if not result["meta_description"]:
            result["issues"].append(("sem_description", "baixa", "Sem meta description (SEO fraco)."))
        if not (result["has_form"] or result["has_whatsapp"]):
            result["issues"].append(("sem_contato", "media", "Sem formulário nem WhatsApp."))

        return result
    finally:
        if own_client:
            client.close()
