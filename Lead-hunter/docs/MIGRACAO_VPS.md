# Migração para VPS — Lead Hunter BH

> Runbook da ida do ambiente (OpenClaw + backend + interface) do Windows local
> para uma **VPS Hostinger KVM 2** (8GB RAM, 2 vCPU, 100GB NVMe, Ubuntu 24.04 LTS).
> Objetivo: **agentes e interface 24/7**, independentes da máquina do Samuel, e
> **estáveis** (nada de "fica caindo").
>
> Arquitetura alvo (igual à de hoje, só que tudo no Linux):
> - **OpenClaw nativo** (sem Docker — Docker quebra skills/browser/mensageria)
> - **Backend + Playwright em Docker** (Linux roda a imagem oficial sem dor)
> - **Banco = Supabase** (já é nuvem — nada migra, só aponta a `DATABASE_URL`)
> - **Exposição via Cloudflare Tunnel** (sem abrir portas no servidor)

---

## 0. Antes de começar — o que ter em mãos

- [ ] VPS KVM 2 provisionada com **Ubuntu 24.04 LTS** + acesso SSH (IP, usuário, senha/chave)
- [ ] Conta **Cloudflare** (grátis) + um domínio adicionado nela (pode ser barato, ~R$40/ano)
- [ ] Login do **Claude** (a assinatura usada hoje) para re-autenticar o CLI na VPS
- [ ] **Os arquivos de segredo** que NÃO estão no git (vamos copiar à mão, com segurança):
  - `~/.openclaw/openclaw.json` (tokens dos bots + token do gateway)
  - as 4 pastas de workspace: `~/.openclaw/workspace`, `-comercial`, `-diagnosticador`, `-criadora`
  - `Lead-hunter/.env` (senha do Supabase)
  - `Lead-hunter/frontend/.env.local`
  - `Lead-hunter/ops/.webhook.txt` (webhook do Discord)
- [ ] **User ID do Discord do José** (pra liberar acesso — passo 9)

> ⚠️ **Segredos nunca vão pelo git.** Vão por `scp`/SSH direto (passo 4 e 5). O `.gitignore`
> já bloqueia todos eles — se algum aparecer num `git status`, **pare** e me avise.

---

## 1. Provisionar a VPS

Na Hostinger, ao criar a KVM 2:
1. Sistema: **Ubuntu 24.04 LTS** (limpo). *Se usar o template "OpenClaw em 1 clique",
   ele já instala o OpenClaw — nesse caso pule a instalação do passo 4, mas faça o resto.*
2. Habilite **chave SSH** (mais seguro que senha).
3. Anote o **IP público**.

Primeiro acesso e atualização:
```bash
ssh root@SEU_IP
apt update && apt -y upgrade
adduser hermes && usermod -aG sudo hermes   # usuário não-root pra operar
```
Daqui pra frente, opere como `hermes` (não como root).

---

## 2. Estabilidade primeiro (o passo "não cair")

Faça isto **antes** de subir os serviços. É o que segura o ambiente de pé.

### 2.1 Swap de 4GB (rede de segurança de memória)
```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
sudo sysctl vm.swappiness=10   # só usa swap em pico real
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
free -h   # confere: deve mostrar 8.0Gi RAM + 4.0Gi swap
```

### 2.2 Firewall (UFW) — só o necessário aberto
```bash
sudo ufw allow OpenSSH
sudo ufw enable
```
> Não precisamos abrir 80/443: o **Cloudflare Tunnel** conecta de dentro pra fora.

### 2.3 fail2ban (barra ataque de força bruta no SSH)
```bash
sudo apt -y install fail2ban
sudo systemctl enable --now fail2ban
```

### 2.4 Atualizações de segurança automáticas
```bash
sudo apt -y install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades   # responda "Yes"
```

### 2.5 Rotação de logs (não enche o disco)
O `logrotate` já vem no Ubuntu. Para os logs dos nossos serviços (passo 10) usamos
`journald` do systemd, que já rotaciona sozinho. Limite o tamanho:
```bash
sudo sed -i 's/#SystemMaxUse=/SystemMaxUse=500M/' /etc/systemd/journald.conf
sudo systemctl restart systemd-journald
```

---

## 3. Dependências base

```bash
# Node 24 (mesma major do dev) — via nvm pro usuário hermes
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24 && nvm alias default 24
node --version    # v24.x

# Docker + compose plugin
sudo apt -y install docker.io docker-compose-v2
sudo usermod -aG docker hermes
# saia e entre de novo no SSH pra valer o grupo docker
```

---

## 4. Migrar o OpenClaw (cérebro)

### 4.1 Instalar (se NÃO usou o template 1-clique)
```bash
npm install -g openclaw      # confirme o pacote exato na doc da Hostinger/OpenClaw
```

### 4.2 Instalar e autenticar o Claude CLI (a assinatura)
```bash
npm install -g @anthropic-ai/claude-code
claude        # abre o fluxo de login (device flow) — siga a URL e cole o código
```
> Isto é **interativo** e roda **você**, via SSH. A assinatura funciona em servidor
> headless (a KB confirma: o autor roda o plano Claude Code na própria VPS).

### 4.3 Copiar config + os 4 workspaces (do Windows pra VPS)
No **seu PC** (PowerShell ou Git Bash), com `scp`:
```bash
scp -r ~/.openclaw/openclaw.json hermes@SEU_IP:~/.openclaw/
scp -r ~/.openclaw/workspace            hermes@SEU_IP:~/.openclaw/
scp -r ~/.openclaw/workspace-comercial  hermes@SEU_IP:~/.openclaw/
scp -r ~/.openclaw/workspace-diagnosticador hermes@SEU_IP:~/.openclaw/
scp -r ~/.openclaw/workspace-criadora   hermes@SEU_IP:~/.openclaw/
```
Ajustes no `openclaw.json` da VPS:
- Os `workspace` dos agentes usam `~/.openclaw/...` (já relativo — ok no Linux).
- `gateway.bind`: manter `loopback` (o túnel cuida do acesso externo).

> ⚠️ As skills que chamam o backend (`lh.mjs`) apontam pra `localhost:8000` — como o
> backend roda na **mesma VPS** (passo 5), continua funcionando sem mudar nada.

---

## 5. Subir o backend + Playwright (Docker)

```bash
# Clonar o código (sem segredos — eles vão por scp)
git clone https://github.com/pacokz/lead-hunter-bh.git ~/hermes
cd ~/hermes/Lead-hunter

# Copiar os .env do seu PC (NÃO estão no git):
# no seu PC:
#   scp Lead-hunter/.env                hermes@SEU_IP:~/hermes/Lead-hunter/.env
#   scp Lead-hunter/frontend/.env.local hermes@SEU_IP:~/hermes/Lead-hunter/frontend/.env.local
#   scp Lead-hunter/ops/.webhook.txt    hermes@SEU_IP:~/hermes/Lead-hunter/ops/.webhook.txt
```

**Não subir o Postgres local** (é sobra de dev; usamos Supabase). Suba só o backend:
```bash
docker compose up -d --build backend
curl http://localhost:8000/health      # {"status":"ok"}
curl http://localhost:8000/health/db   # {"status":"ok","database":"connected"}  ← confirma Supabase
```
O `restart: unless-stopped` já está no compose → o backend volta sozinho em reboot/crash.

> O `entrypoint.sh` roda `alembic upgrade head` na subida; como o Supabase já está
> migrado, ele só confirma que está no head.

---

## 6. Subir o frontend

Opção recomendada (tudo na VPS, simples): rodar em produção atrás do túnel.
```bash
cd ~/hermes/Lead-hunter/frontend
npm install
npm run build
```
Vamos rodá-lo como serviço no passo 10. Antes, ajuste o `.env.local`:
```
NEXT_PUBLIC_API_URL=https://api.SEUDOMINIO.com   # a URL pública do backend (passo 8)
```

---

## 7. Migrar os crons (Task Scheduler → cron do Linux)

Hoje rodam no Task Scheduler do Windows (prefixo `LeadHunter `). Na VPS viram `cron`.
Edite com `crontab -e` (usuário `hermes`):
```cron
# Lead Hunter — operação (horário do servidor; ajuste TZ se a VPS não estiver em -03)
CRON_TZ=America/Sao_Paulo
0  5 * * *   cd /home/hermes/hermes/Lead-hunter && node ops/backup.mjs        >> ~/cron.log 2>&1
0  6 * * *   cd /home/hermes/hermes/Lead-hunter && node ops/pipeline.mjs      >> ~/cron.log 2>&1
0  7 * * *   cd /home/hermes/hermes/Lead-hunter && node ops/relatorio.mjs     >> ~/cron.log 2>&1
0  8 * * *   cd /home/hermes/hermes/Lead-hunter && node ops/heartbeat.mjs     >> ~/cron.log 2>&1
0 */3 * * *  cd /home/hermes/hermes/Lead-hunter && node ops/heartbeat.mjs     >> ~/cron.log 2>&1
0 22 * * *   cd /home/hermes/hermes/Lead-hunter && node ops/analista.mjs      >> ~/cron.log 2>&1
0  3 */3 * * cd /home/hermes/hermes/Lead-hunter && node ops/notas-diarias.mjs && node ops/consolidacao.mjs >> ~/cron.log 2>&1
```
> Verifique se `backup.mjs` usa a `DATABASE_URL` do Supabase (não o Postgres local) —
> na VPS não há Postgres local pra dumpar.

---

## 8. Expor pra internet (Cloudflare Tunnel)

```bash
# instalar cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cf.deb
sudo dpkg -i cf.deb

cloudflared tunnel login                 # abre URL — autorize seu domínio
cloudflared tunnel create lead-hunter
```
Crie `~/.cloudflared/config.yml`:
```yaml
tunnel: lead-hunter
credentials-file: /home/hermes/.cloudflared/<ID-DO-TUNEL>.json
ingress:
  - hostname: app.SEUDOMINIO.com      # interface (frontend)
    service: http://localhost:3100
  - hostname: api.SEUDOMINIO.com      # backend
    service: http://localhost:8000
  - hostname: claw.SEUDOMINIO.com     # Mission Control do OpenClaw (opcional)
    service: http://localhost:18789
  - service: http_status:404
```
Aponte os DNS (cria os CNAMEs automaticamente):
```bash
cloudflared tunnel route dns lead-hunter app.SEUDOMINIO.com
cloudflared tunnel route dns lead-hunter api.SEUDOMINIO.com
cloudflared tunnel route dns lead-hunter claw.SEUDOMINIO.com
```

### 8.1 Ajuste obrigatório no backend — CORS
Hoje o CORS só aceita `localhost`. Precisa aceitar `app.SEUDOMINIO.com`.
*(Posso fazer essa mudança no código agora — deixar configurável por env `ALLOWED_ORIGINS`.)*

### 8.2 Trava de senha (NÃO exponha sem isto)
A interface não tem login. Antes de ela ficar pública, subimos uma **senha
compartilhada** (gate simples no frontend + token que o front manda pro backend).
*(Também faço no código — é o mesmo trabalho que serve aqui e no futuro.)*

---

## 9. Discord — mesmos bots + liberar o José

Os bots são os mesmos (tokens vieram no `openclaw.json`). Só falta autorizar o José:
no `openclaw.json`, no guild do servidor, adicione o ID dele à allowlist:
```json
"guilds": {
  "1519725717712142428": {
    "requireMention": true,
    "users": ["384446441801908234", "ID_DO_JOSE"]
  }
}
```
> O José precisa estar **no servidor** do Discord e **@mencionar** o bot (Sukuna/Yuji/
> Megumi/Nobara) pra falar com ele.

---

## 10. Auto-start tudo (sobrevive a reboot) — systemd

Pra nada depender de você logar e iniciar à mão. Crie 3 serviços:

**`/etc/systemd/system/openclaw.service`**
```ini
[Unit]
Description=OpenClaw gateway + agentes
After=network-online.target
[Service]
User=hermes
WorkingDirectory=/home/hermes
ExecStart=/home/hermes/.nvm/versions/node/v24.x/bin/openclaw serve   # confirme o comando real
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/frontend.service`**
```ini
[Unit]
Description=Lead Hunter frontend (Next.js)
After=network-online.target
[Service]
User=hermes
WorkingDirectory=/home/hermes/hermes/Lead-hunter/frontend
ExecStart=/home/hermes/.nvm/versions/node/v24.x/bin/npm run start -- -p 3100
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
```

**`/etc/systemd/system/cloudflared.service`** (ou `cloudflared service install`)
```ini
[Unit]
Description=Cloudflare Tunnel
After=network-online.target
[Service]
User=hermes
ExecStart=/usr/bin/cloudflared tunnel run lead-hunter
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
```

Ativar tudo:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw frontend cloudflared
```
> O **backend** já tem `restart: unless-stopped` no Docker + o Docker inicia no boot.
> Resultado: **reboot da VPS = tudo sobe sozinho.**

---

## 11. Checklist de validação (antes de entregar pro José)

- [ ] `free -h` mostra 8GB + 4GB swap
- [ ] `sudo reboot` → depois de subir, **sem logar nada à mão**: `curl localhost:8000/health` ok
- [ ] `https://app.SEUDOMINIO.com` abre a interface (com a trava de senha)
- [ ] `https://api.SEUDOMINIO.com/health` responde ok
- [ ] Mandar `@Sukuna oi` no Discord → responde (agente vivo na VPS)
- [ ] José (com PC do Samuel **desligado**) consulta a interface e fala com bot → funciona
- [ ] Auditoria visual de 1 lead → print aparece (Playwright ok na VPS)
- [ ] Forçar um cron (`node ops/heartbeat.mjs`) → posta no Discord

---

## 12. Manutenção

- **Atualizar código:** `cd ~/hermes && git pull && cd Lead-hunter && docker compose up -d --build backend && cd frontend && npm run build && sudo systemctl restart frontend`
- **Ver logs:** `journalctl -u openclaw -f` · `docker compose logs -f backend`
- **Backup dos segredos:** guarde cópia do `openclaw.json` e dos `.env` num cofre
  (1Password/Bitwarden). Eles **não** estão no git de propósito.
- **Upgrade de plano:** se faltar RAM, KVM 2 → KVM 4 é resize de 1 clique na Hostinger.

---

## Pendências de código pra esta migração (faço quando você der o ok)
1. **CORS por env** (`ALLOWED_ORIGINS`) no backend — passo 8.1.
2. **Trava de senha** na interface — passo 8.2.

Ambas servem igual pro túnel intermediário e pra VPS, então não é retrabalho.
