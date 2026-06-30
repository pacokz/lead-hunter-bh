# Placeholder do bot - ainda nao desenvolvido.
# A estrutura ja esta criada para quando o codigo do bot existir.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ /app/

CMD ["python", "main.py"]
