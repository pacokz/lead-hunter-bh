# Software House

Container Docker da Software House. Estrutura separada em servicos:

```
software-house/
├── docker-compose.yml
├── hermes/        # Servico que roda o Hermes Agent (Nous Research)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/main.py
└── bot/           # Placeholder - sera desenvolvido no futuro
    ├── Dockerfile
    ├── requirements.txt
    ├── .env.example
    └── app/main.py
```

## Hermes

Conecta ao [Hermes Agent da Nous Research](https://hermes-agent.nousresearch.com/)
e expoe uma API HTTP simples (porta `8000`) para os outros servicos.

Endpoints:
- `GET  /health` — status do servico
- `POST /chat`   — `{ "message": "...", "system": "opcional" }`

## Como rodar

1. Configure as credenciais:
   ```bash
   cp hermes/.env.example hermes/.env
   # edite hermes/.env e coloque sua HERMES_API_KEY
   ```

2. Suba o Hermes:
   ```bash
   docker compose up -d --build
   ```

3. Teste:
   ```bash
   curl http://localhost:8000/health
   ```

## Bot (futuro)

O servico `bot` ja esta declarado no `docker-compose.yml`, mas fica sob o
profile `future` (nao sobe por padrao). Quando o bot for desenvolvido:

```bash
docker compose --profile future up -d --build
```

O bot se comunica com o Hermes pela rede interna em `http://hermes:8000`.
```
