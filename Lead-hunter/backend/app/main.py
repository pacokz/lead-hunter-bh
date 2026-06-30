from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.routes import router
from app.config import settings
from app.database import engine

app = FastAPI(title="Lead Hunter BH", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Screenshots da auditoria visual (Playwright) — servidos como arquivos estáticos.
_shots = Path(settings.screenshot_dir)
_shots.mkdir(parents=True, exist_ok=True)
app.mount("/screenshots", StaticFiles(directory=str(_shots)), name="screenshots")


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/health/db")
def health_db() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as exc:  # noqa: BLE001
        return {"status": "error", "database": str(exc)}
