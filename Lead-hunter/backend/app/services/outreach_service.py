"""Geração de rascunho de abordagem por template determinístico.

É um PONTO DE PARTIDA — o agente Comercial (OpenClaw) refina a copy depois.
O envio é sempre MANUAL pelo Samuel; aqui só geramos e armazenamos o rascunho.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import ContactChannel, SiteClass
from app.models.audit import SiteAudit
from app.models.crm import OutreachDraft
from app.models.places import Place


def _latest_site_class(session: Session, place_id: str) -> SiteClass | None:
    return session.scalar(
        select(SiteAudit.site_class)
        .where(SiteAudit.place_id == place_id)
        .order_by(SiteAudit.id.desc())
    )


def render_template(place: Place, site_class: SiteClass | None) -> str:
    nome = place.name
    intro = f"Olá! Tudo bem? Encontrei *{nome}*"
    if place.category:
        intro += f" ({place.category})"
    intro += " aqui em BH"
    if place.reviews_count:
        intro += f" — {place.reviews_count} avaliações e nota {place.rating} no Google, parabéns pelo trabalho!"
    else:
        intro += "."

    if site_class == SiteClass.SEM_SITE:
        hook = (
            f" Reparei que vocês ainda não têm um site próprio. Montei uma prévia de como ficaria "
            f"o site da {nome} + um painel de gestão. Posso te mostrar numa call rápida, sem compromisso?"
        )
    elif site_class == SiteClass.REDE_SOCIAL:
        hook = (
            f" Vi que hoje a presença de vocês online é só pelas redes sociais. Preparei uma prévia "
            f"de um site próprio pra {nome}. Topa ver numa call rápida, sem compromisso?"
        )
    elif site_class == SiteClass.FORA_DO_AR:
        hook = (
            " Reparei que o site de vocês está fora do ar. Montei uma versão nova e moderna — "
            "posso te mostrar numa call rápida?"
        )
    elif site_class in (SiteClass.SITE_OBSOLETO, SiteClass.SITE_FRACO):
        hook = (
            " Dei uma olhada no site atual de vocês e tenho algumas ideias pra modernizar. "
            "Montei uma prévia — quer ver numa call rápida, sem compromisso?"
        )
    else:
        hook = (
            " Tenho uma ideia pra fortalecer a presença online de vocês. "
            "Posso te mostrar numa call rápida, sem compromisso?"
        )
    return intro + hook


def generate_draft(
    session: Session, place: Place, channel: ContactChannel = ContactChannel.WHATSAPP
) -> OutreachDraft:
    site_class = _latest_site_class(session, place.place_id)
    text = render_template(place, site_class)
    draft = OutreachDraft(place_id=place.place_id, channel=channel, text=text, status="DRAFT")
    session.add(draft)
    session.commit()
    session.refresh(draft)
    return draft


def list_drafts(session: Session, place_id: str) -> list[OutreachDraft]:
    return list(
        session.scalars(
            select(OutreachDraft)
            .where(OutreachDraft.place_id == place_id)
            .order_by(OutreachDraft.id.desc())
        )
    )
