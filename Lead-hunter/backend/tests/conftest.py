"""Fixtures de teste.

A fixture `session` usa SEMPRE o Postgres LOCAL (nunca o Supabase). Recria o
schema a cada teste (drop + create) para isolamento total e para refletir os
models atuais. Banco de dev descartável — não guardar dados reais aqui.
"""
import os

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.models  # noqa: F401  — registra os models
from app.database import Base

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+psycopg://lead:lead@postgres:5432/leadhunter",
)


@pytest.fixture
def session():
    engine = create_engine(TEST_DATABASE_URL, future=True)
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    db = Session()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()
