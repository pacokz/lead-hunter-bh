"""Seeds de categorias e regiões de BH + regra de qualificação padrão.

Rodar: python -m app.seeds  (idempotente)
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.config import Category, QualificationRule, Region

# Nichos priorizados (verba + costumam ter site ruim/inexistente)
CATEGORIES: list[tuple[str, int]] = [
    ("clínica odontológica", 100),
    ("clínica médica", 95),
    ("clínica de estética", 95),
    ("academia", 85),
    ("escritório de advocacia", 90),
    ("clínica de fisioterapia", 80),
    ("salão de beleza", 70),
    ("pet shop", 65),
    ("nutricionista", 70),
    ("consultório de psicologia", 75),
]

# Regiões de BH (foco inicial Centro-Sul)
REGIONS: list[str] = [
    "Savassi",
    "Lourdes",
    "Funcionários",
    "Santo Agostinho",
    "Buritis",
    "Belvedere",
    "Sion",
    "Centro",
    "Pampulha",
    "Cidade Nova",
]


def seed_all(session: Session) -> dict:
    created = {"categories": 0, "regions": 0, "rules": 0}

    for name, priority in CATEGORIES:
        exists = session.scalar(select(Category).where(Category.name == name))
        if not exists:
            session.add(Category(name=name, priority=priority, active=True))
            created["categories"] += 1

    for name in REGIONS:
        exists = session.scalar(select(Region).where(Region.name == name))
        if not exists:
            session.add(Region(name=name, active=True))
            created["regions"] += 1

    default_rule = session.scalar(
        select(QualificationRule).where(QualificationRule.name == "padrão")
    )
    if not default_rule:
        session.add(
            QualificationRule(
                name="padrão",
                min_rating=3.5,
                min_reviews=20,
                excluded_categories=["mercearia", "ambulante"],
                active=True,
            )
        )
        created["rules"] += 1

    session.commit()
    return created


if __name__ == "__main__":
    with SessionLocal() as s:
        result = seed_all(s)
        print(f"Seed concluído: {result}")
