"""
Bot da Software House - ainda nao desenvolvido.

Placeholder para reservar a estrutura do container.
O bot devera se comunicar com o servico 'hermes' pela rede 'software-house'.
"""
import os
import time

HERMES_URL = os.getenv("HERMES_URL", "http://hermes:8000")


def main():
    print(f"[bot] placeholder no ar. Hermes esperado em: {HERMES_URL}", flush=True)
    print("[bot] ainda nao implementado - container de pe aguardando.", flush=True)
    # Mantem o container vivo ate o bot ser desenvolvido.
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    main()
