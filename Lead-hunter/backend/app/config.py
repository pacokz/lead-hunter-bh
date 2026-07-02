from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+psycopg://lead:lead@localhost:5432/leadhunter"

    google_places_api_key: str | None = None

    api_daily_limit: int = 1000
    api_monthly_limit: int = 20000
    api_cost_per_call: float = 0.035  # Text Search (New), tier Enterprise (estimativa USD)

    min_rating: float = 3.5
    min_reviews: int = 20
    min_score: int = 70

    # Diretório onde a captura visual (Playwright) salva os screenshots.
    # Servido em /screenshots e persistido no host via volume ./backend:/app.
    screenshot_dir: str = "/app/data/screenshots"

    # Demos geradas pelos agentes (Nobara). Na VPS o demos-shared do OpenClaw é
    # montado read-only no container (docker-compose). Servido em /demos-files
    # e listado em GET /demos.
    demos_container_dir: str = "/demos-shared"


settings = Settings()
