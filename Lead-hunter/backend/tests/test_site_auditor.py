"""Auditoria de sites com HTTP mockado (sem rede real)."""
import httpx

from app.enums import SiteClass
from app.integrations import site_auditor


def _client(handler):
    return httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)


def test_sem_site():
    assert site_auditor.audit_site(None)["site_class"] == SiteClass.SEM_SITE
    assert site_auditor.audit_site("   ")["site_class"] == SiteClass.SEM_SITE


def test_rede_social_captura_instagram():
    r = site_auditor.audit_site("https://instagram.com/clinicax/")
    assert r["site_class"] == SiteClass.REDE_SOCIAL
    assert r["instagram_handle"] == "clinicax"


def test_fora_do_ar_404():
    r = site_auditor.audit_site(
        "https://x.com.br", client=_client(lambda req: httpx.Response(404, text="no"))
    )
    assert r["site_class"] == SiteClass.FORA_DO_AR
    assert r["http_status"] == 404


def test_fora_do_ar_erro_conexao():
    def boom(req):
        raise httpx.ConnectError("falhou")

    r = site_auditor.audit_site("https://x.com.br", client=_client(boom))
    assert r["site_class"] == SiteClass.FORA_DO_AR


def test_obsoleto_sem_https():
    html = '<html><head><title>T</title><meta name="viewport" content="x"></head><body></body></html>'
    r = site_auditor.audit_site(
        "http://velho.com.br", client=_client(lambda req: httpx.Response(200, text=html))
    )
    assert r["site_class"] == SiteClass.SITE_OBSOLETO
    assert r["https"] is False
    assert any(i[0] == "sem_https" for i in r["issues"])


def test_obsoleto_nao_responsivo():
    html = "<html><head><title>T</title></head><body></body></html>"
    r = site_auditor.audit_site(
        "https://semviewport.com.br", client=_client(lambda req: httpx.Response(200, text=html))
    )
    assert r["site_class"] == SiteClass.SITE_OBSOLETO
    assert r["responsive"] is False


def test_site_bom_completo():
    html = """
    <html><head>
      <title>Clínica X</title>
      <meta name="description" content="A melhor clínica de BH">
      <meta name="viewport" content="width=device-width, initial-scale=1">
    </head><body>
      <form action="/contato"><input name="nome"></form>
      <a href="https://instagram.com/clinicax">Instagram</a>
      <a href="https://wa.me/5531999998888">WhatsApp</a>
    </body></html>
    """
    r = site_auditor.audit_site(
        "https://clinicax.com.br", client=_client(lambda req: httpx.Response(200, text=html))
    )
    assert r["site_class"] == SiteClass.SITE_BOM
    assert r["https"] is True
    assert r["responsive"] is True
    assert r["has_form"] is True
    assert r["has_whatsapp"] is True
    assert r["instagram_handle"] == "clinicax"
    assert any("instagram.com" in s for s in r["social_links"])
