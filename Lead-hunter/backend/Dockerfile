# Imagem oficial do Playwright (Ubuntu jammy) — já traz Chromium + libs de sistema.
# Evita o problema do install-deps no Debian slim.
FROM mcr.microsoft.com/playwright/python:v1.48.0-jammy

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Garante o Chromium da versão certa (no-op se já presente na imagem base)
RUN playwright install chromium

COPY . .
RUN chmod +x entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
