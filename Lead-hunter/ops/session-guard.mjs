#!/usr/bin/env node
// Guarda de contexto. Mede quanto contexto cada agente carrega por turno e, ao passar do limite,
// manda o agente destilar a memória (skill flush-memoria) e ROTACIONA a sessão.
//
// Sem isso a sessão só cresce: em 29/07/2026 a Nobara chegou a ~840k tokens POR TURNO, o que
// fazia cada resposta levar 4min e transformava qualquer 529 transitório da API em perda total.
//
// A rotação é `openclaw agent -m /reset`: o comando é interceptado antes do LLM (não gasta token)
// e limpa o claudeCliSessionId em sessions.json, que é o ponteiro que faz o OpenClaw passar
// --resume <sessao gigante> pra CLI. Compactar só o transcript do OpenClaw NÃO resolve.
//
// Uso:  node ops/session-guard.mjs [--dry-run] [--agent <id>] [--force]
// Env:  LIMITE_TOKENS (default 100000), COOLDOWN_MIN (default 60)

import { readFileSync, writeFileSync, statSync, openSync, readSync, fstatSync, closeSync, appendFileSync, mkdirSync, accessSync, constants } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import { execFileSync } from "child_process";

const LIMITE = Number(process.env.LIMITE_TOKENS || 100_000);
const COOLDOWN_MIN = Number(process.env.COOLDOWN_MIN || 60);
const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const SO_AGENTE = process.argv.includes("--agent") ? process.argv[process.argv.indexOf("--agent") + 1] : null;

const OC = resolve(homedir(), ".openclaw");
// O cron roda como hermes mas o repo mora em /root/hermes (dono root): escrever ao lado do script
// falha por permissao. Tenta o repo e cai pro HOME, senao o log desaparece sem ninguem notar.
const DIR_LOG = (() => {
  for (const d of [process.env.GUARD_LOG_DIR, resolve(import.meta.dirname, "logs"), resolve(homedir(), "logs-ops")]) {
    if (!d) continue;
    try {
      mkdirSync(d, { recursive: true });
      accessSync(d, constants.W_OK);
      return d;
    } catch {}
  }
  return null;
})();
const LOG = DIR_LOG ? resolve(DIR_LOG, "session-guard.log") : null;
const ESTADO = DIR_LOG ? resolve(DIR_LOG, "session-guard-state.json") : null;

const AGENTES = {
  criadora: { nome: "Nobara", ws: "workspace-criadora" },
  "diretor-arte": { nome: "Nanami", ws: "workspace-diretor-arte" },
  critico: { nome: "Critico", ws: "workspace-critico" },
  comercial: { nome: "Yuji", ws: "workspace-comercial" },
  diagnosticador: { nome: "Megumi", ws: "workspace-diagnosticador" },
  fundacao: { nome: "Fundação", ws: "workspace-fundacao" },
  revisor: { nome: "Revisor", ws: "workspace-revisor" },
};

function log(msg) {
  const linha = `${new Date().toISOString()} ${msg}`;
  console.log(linha);
  if (!LOG) return;
  try {
    appendFileSync(LOG, linha + "\n");
  } catch {}
}

function lerEstado() {
  if (!ESTADO) return {};
  try {
    return JSON.parse(readFileSync(ESTADO, "utf8"));
  } catch {
    return {};
  }
}
function salvarEstado(e) {
  // Sem estado persistido nao ha cooldown: melhor avisar do que silenciosamente repetir flush.
  if (!ESTADO) return log("AVISO: sem diretorio de log gravavel — cooldown NAO sera respeitado entre execucoes.");
  try {
    writeFileSync(ESTADO, JSON.stringify(e, null, 2));
  } catch {}
}

// A sessão da CLI que o OpenClaw vai retomar. null = sessão nova no próximo turno (nada a fazer).
function bindingAtual(agentId) {
  const p = resolve(OC, "agents", agentId, "sessions", "sessions.json");
  let j;
  try {
    j = JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return { erro: "sessions.json ilegível" };
  }
  const arr = Array.isArray(j) ? j : j.sessions || Object.values(j);
  const entradas = (Array.isArray(arr) ? arr : [])
    .filter((s) => s && typeof s === "object")
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
  const s = entradas[0];
  if (!s) return { erro: "nenhuma sessão registrada" };
  const cli = s.claudeCliSessionId || (s.cliSessionIds && s.cliSessionIds["claude-cli"]) || null;
  return { cli, sessionId: s.sessionId, updatedAt: Number(s.updatedAt || 0) };
}

// Claude Code guarda o transcript em ~/.claude/projects/<caminho com / e . virando ->
function transcript(wsAbs, cliSessionId) {
  return resolve(homedir(), ".claude", "projects", wsAbs.replace(/[/.]/g, "-"), `${cliSessionId}.jsonl`);
}

// Lê só o fim: o transcript pode ter 50MB+ e só queremos o último usage.
function tail(caminho, bytes = 4 * 1024 * 1024) {
  const fd = openSync(caminho, "r");
  try {
    const { size } = fstatSync(fd);
    const buf = Buffer.alloc(Math.min(bytes, size));
    readSync(fd, buf, 0, buf.length, Math.max(0, size - bytes));
    return buf.toString("utf8");
  } finally {
    closeSync(fd);
  }
}

// Contexto de um turno = input + cache lido + cache criado. É o que a API cobra e o que
// determina se a requisição é grande o suficiente pra ser frágil.
function contexto(wsAbs, cliSessionId) {
  const arq = transcript(wsAbs, cliSessionId);
  try {
    statSync(arq);
  } catch {
    return null;
  }
  let tokens = null;
  for (const linha of tail(arq).split("\n")) {
    if (!linha.trim()) continue;
    let j;
    try {
      j = JSON.parse(linha);
    } catch {
      continue;
    }
    const u = j.message?.usage;
    if (!u) continue;
    const t = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    if (t > 0) tokens = t;
  }
  return tokens;
}

function oc(args, timeout = 600_000) {
  return execFileSync("openclaw", args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "pipe"] });
}

// Nunca mexer numa sessão no meio de um turno: resetar debaixo do agente perde o trabalho.
function ocupado() {
  try {
    return execFileSync("pgrep", ["-af", "claude -p"], { encoding: "utf8" }).trim().length > 0;
  } catch {
    return false;
  }
}

const PROMPT_FLUSH =
  "Use a skill flush-memoria AGORA. O contexto desta sessão passou do limite e a sessão vai ser " +
  "rotacionada logo em seguida: o que não estiver no MEMORY.md se perde. Destile os aprendizados " +
  "duráveis desta sessão no MEMORY.md, consolidando entradas repetidas em vez de só acrescentar. " +
  "Responda FLUSH-OK e uma linha do que gravou.";

const estado = lerEstado();
const agora = Date.now();
let agiu = 0;

for (const [id, { nome, ws }] of Object.entries(AGENTES)) {
  if (SO_AGENTE && id !== SO_AGENTE) continue;
  const wsAbs = resolve(OC, ws);

  const b = bindingAtual(id);
  if (b.erro) {
    log(`[${id}] ${nome}: ${b.erro} — pulando`);
    continue;
  }
  if (!b.cli) {
    log(`[${id}] ${nome}: sessão nova (sem binding) — nada a fazer`);
    continue;
  }

  const tokens = contexto(wsAbs, b.cli);
  if (tokens == null) {
    log(`[${id}] ${nome}: transcript de ${b.cli.slice(0, 8)} sem usage — nada a fazer`);
    continue;
  }
  const k = (tokens / 1000).toFixed(0);
  if (tokens < LIMITE && !FORCE) {
    log(`[${id}] ${nome}: ${k}k tokens — abaixo do limite (${LIMITE / 1000}k), ok`);
    continue;
  }
  log(`[${id}] ${nome}: ${k}k tokens — ACIMA do limite (${LIMITE / 1000}k)`);

  const ultimo = Number(estado[id]?.ultimaAcao || 0);
  const minDesde = (agora - ultimo) / 60000;
  if (ultimo && minDesde < COOLDOWN_MIN && !FORCE) {
    log(`[${id}] ${nome}: última ação há ${minDesde.toFixed(0)}min (cooldown ${COOLDOWN_MIN}min) — pulando`);
    continue;
  }
  if (ocupado()) {
    log(`[${id}] ${nome}: turno em andamento, pulando este ciclo`);
    continue;
  }
  if (DRY) {
    log(`[${id}] ${nome}: DRY-RUN — faria flush e /reset (binding ${b.cli.slice(0, 8)})`);
    agiu++;
    continue;
  }

  let flushOk = false;
  try {
    log(`[${id}] ${nome}: flush de memória...`);
    const r = oc(["agent", "--agent", id, "-m", PROMPT_FLUSH]);
    flushOk = /FLUSH-OK/i.test(r);
    log(`[${id}] ${nome}: flush ${flushOk ? "OK" : "respondeu sem FLUSH-OK"}: ${r.replace(/\s+/g, " ").slice(0, 200)}`);
  } catch (e) {
    log(`[${id}] ${nome}: FLUSH FALHOU (${e.message.slice(0, 160)})`);
  }

  // Sem flush confirmado não se rotaciona: o /reset apagaria os aprendizados da sessão.
  if (!flushOk) {
    log(`[${id}] ${nome}: NÃO vou rotacionar — flush não confirmado. Tenta no próximo ciclo.`);
    estado[id] = { ...(estado[id] || {}), ultimaAcao: agora, ultimoResultado: "flush-falhou" };
    continue;
  }

  try {
    log(`[${id}] ${nome}: rotacionando sessão (/reset)...`);
    const r = oc(["agent", "--agent", id, "-m", "/reset"], 120_000);
    const depois = bindingAtual(id);
    const ok = !depois.cli;
    log(`[${id}] ${nome}: ${ok ? "rotacionada" : "RESET NÃO LIMPOU O BINDING"} (${r.replace(/\s+/g, " ").slice(0, 80)})`);
    estado[id] = { ultimaAcao: agora, ultimoResultado: ok ? "rotacionada" : "reset-nao-limpou", tokensAntes: tokens };
    if (ok) agiu++;
  } catch (e) {
    log(`[${id}] ${nome}: RESET FALHOU: ${e.message.slice(0, 200)}`);
    estado[id] = { ...(estado[id] || {}), ultimaAcao: agora, ultimoResultado: "reset-falhou" };
  }
}

salvarEstado(estado);
log(`session-guard: ${agiu} agente(s) rotacionado(s). limite=${LIMITE}${DRY ? " (dry-run)" : ""}`);
