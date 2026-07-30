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

import { readFileSync, writeFileSync, statSync, openSync, readSync, fstatSync, closeSync, appendFileSync, mkdirSync, accessSync, realpathSync, constants } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import { execFileSync } from "child_process";
import { bloqueada } from "../openclaw-skill/lead-hunter/quota.mjs";

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
  // Workers stateless da Nobora: crescem ~23k/job. Teto proprio menor => flush+reset a cada ~1 job
  // (rotacao por-job na pratica, mas pelo caminho SEGURO que exige flush antes do reset). Ajustavel.
  fundacao: { nome: "Fundação", ws: "workspace-fundacao", limite: 65_000 },
  revisor: { nome: "Revisor", ws: "workspace-revisor", limite: 65_000 },
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

// TODAS as sessoes do agente que tem binding com a CLI. Antes isto devolvia so a mais recente:
// em 30/07/2026 a Nobara tinha DUAS sessoes com binding (a do Discord e uma
// "explicit:gateway-fallback-*" criada pelas invocacoes automaticas por gateway) e a segunda era
// invisivel — crescia sem ser medida nem rotacionada. O sessions.json e um OBJETO indexado pela
// chave da sessao; o codigo antigo usava Object.values() e jogava fora justamente a chave.
function sessoesComBinding(agentId) {
  const p = resolve(OC, "agents", agentId, "sessions", "sessions.json");
  let bruto;
  try {
    bruto = readFileSync(p, "utf8");
  } catch (e) {
    // Agente recem-criado ainda nao tem sessions.json. Distinguir isso de arquivo corrompido:
    // log que mente e o que faz bug passar semanas sem ninguem ver.
    return { erro: e.code === "ENOENT" ? "nunca foi invocado (sem sessão ainda)" : `sessions.json ilegível: ${e.code || e.message}` };
  }
  let j;
  try {
    j = JSON.parse(bruto);
  } catch (e) {
    return { erro: `sessions.json com JSON inválido: ${e.message.slice(0, 80)}` };
  }
  const entradas = Array.isArray(j)
    ? j.map((s, i) => [s?.key || s?.sessionKey || `#${i}`, s])
    : Object.entries(j.sessions && typeof j.sessions === "object" && !Array.isArray(j.sessions) ? j.sessions : j);
  const lista = entradas
    .filter(([, s]) => s && typeof s === "object")
    .map(([key, s]) => ({
      key,
      cli: s.claudeCliSessionId || (s.cliSessionIds && s.cliSessionIds["claude-cli"]) || null,
      updatedAt: Number(s.updatedAt || 0),
    }))
    .filter((s) => s.cli)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return { lista };
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
// Duas correcoes sobre a versao anterior:
//  1. `pgrep -af "claude -p"` casava por LINHA DE COMANDO, entao qualquer shell de diagnostico com
//     esse texto (ate um `pgrep -f 'claude -p'`) marcava tudo como ocupado e o guard nunca agia.
//     Agora casa por NOME de processo (-x), que nao sofre disso.
//  2. Era global: um agente ocupado adiava a rotacao de TODOS. Agora olha o cwd de cada processo e
//     so considera ocupado o agente cujo workspace esta em uso.
function ocupado(wsAbs) {
  let pids = [];
  try {
    pids = execFileSync("pgrep", ["-x", "claude"], { encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return false; // pgrep sai != 0 quando nao ha match
  }
  for (const pid of pids) {
    try {
      if (realpathSync(`/proc/${pid.trim()}/cwd`) === realpathSync(wsAbs)) return true;
    } catch {} // processo morreu no meio, ou /proc inacessivel
  }
  return false;
}

const PROMPT_FLUSH =
  "Use a skill flush-memoria AGORA. O contexto desta sessão passou do limite e a sessão vai ser " +
  "rotacionada logo em seguida: o que não estiver no MEMORY.md se perde. Destile os aprendizados " +
  "duráveis desta sessão no MEMORY.md, consolidando entradas repetidas em vez de só acrescentar. " +
  "Responda FLUSH-OK e uma linha do que gravou.";

// Flush e um turno agentico: se a conta esta sem cota, tentar so queima tentativa condenada.
const semCota = bloqueada();
if (semCota) {
  log(`COTA: conta bloqueada por ~${semCota.restanteMin}min (ate ${semCota.ate.toISOString()}) — pulando o ciclo. Sessao grande espera; rotacionar exige flush, e flush exige cota.`);
  process.exit(0);
}

const estado = lerEstado();
const agora = Date.now();
let agiu = 0;

for (const [id, { nome, ws, limite }] of Object.entries(AGENTES)) {
  if (SO_AGENTE && id !== SO_AGENTE) continue;
  const wsAbs = resolve(OC, ws);

  const b = sessoesComBinding(id);
  if (b.erro) {
    log(`[${id}] ${nome}: ${b.erro} — pulando`);
    continue;
  }
  if (!b.lista.length) {
    log(`[${id}] ${nome}: nenhuma sessão com binding — nada a fazer`);
    continue;
  }

  const LIM = limite || LIMITE; // teto por-agente (workers rotacionam mais cedo); default = global
  for (const sess of b.lista) {
    const tokens = contexto(wsAbs, sess.cli);
    if (tokens == null) {
      log(`[${id}/${sess.key}] ${nome}: transcript de ${sess.cli.slice(0, 8)} sem usage — nada a fazer`);
      continue;
    }
    const k = (tokens / 1000).toFixed(0);
    if (tokens < LIM && !FORCE) {
      log(`[${id}/${sess.key}] ${nome}: ${k}k tokens — abaixo do limite (${LIM / 1000}k), ok`);
      continue;
    }
    log(`[${id}/${sess.key}] ${nome}: ${k}k tokens — ACIMA do limite (${LIM / 1000}k)`);

    // Cooldown por CHAVE, nao por agente: uma sessao em cooldown nao pode blindar as outras.
    const ultimo = Number(estado[sess.key]?.ultimaAcao || 0);
    const minDesde = (agora - ultimo) / 60000;
    if (ultimo && minDesde < COOLDOWN_MIN && !FORCE) {
      log(`[${id}/${sess.key}] ${nome}: última ação há ${minDesde.toFixed(0)}min (cooldown ${COOLDOWN_MIN}min) — pulando`);
      continue;
    }
    if (ocupado(wsAbs)) {
      log(`[${id}/${sess.key}] ${nome}: turno em andamento, pulando este ciclo`);
      continue;
    }
    if (DRY) {
      log(`[${id}/${sess.key}] ${nome}: DRY-RUN — faria flush e /reset (binding ${sess.cli.slice(0, 8)})`);
      agiu++;
      continue;
    }

    // --session-key SEMPRE: sem isto o comando cai na sessao default do agente, ou seja
    // mede-se uma sessao e reseta-se outra. Acertava por coincidencia quando so havia uma.
    const alvo = ["--agent", id, "--session-key", sess.key];
    let flushOk = false;
    try {
      log(`[${id}/${sess.key}] ${nome}: flush de memória...`);
      const r = oc(["agent", ...alvo, "-m", PROMPT_FLUSH]);
      flushOk = /FLUSH-OK/i.test(r);
      log(`[${id}/${sess.key}] ${nome}: flush ${flushOk ? "OK" : "respondeu sem FLUSH-OK"}: ${r.replace(/\s+/g, " ").slice(0, 200)}`);
    } catch (e) {
      log(`[${id}/${sess.key}] ${nome}: FLUSH FALHOU (${e.message.slice(0, 160)})`);
    }

    // Sem flush confirmado não se rotaciona: o /reset apagaria os aprendizados da sessão.
    if (!flushOk) {
      log(`[${id}/${sess.key}] ${nome}: NÃO vou rotacionar — flush não confirmado. Tenta no próximo ciclo.`);
      estado[sess.key] = { ...(estado[sess.key] || {}), ultimaAcao: agora, ultimoResultado: "flush-falhou" };
      continue;
    }

    try {
      log(`[${id}/${sess.key}] ${nome}: rotacionando sessão (/reset)...`);
      const r = oc(["agent", ...alvo, "-m", "/reset"], 120_000);
      const depois = sessoesComBinding(id);
      const ok = !depois.erro && !depois.lista.some((s) => s.key === sess.key && s.cli === sess.cli);
      log(`[${id}/${sess.key}] ${nome}: ${ok ? "rotacionada" : "RESET NÃO LIMPOU O BINDING"} (${r.replace(/\s+/g, " ").slice(0, 80)})`);
      estado[sess.key] = { ultimaAcao: agora, ultimoResultado: ok ? "rotacionada" : "reset-nao-limpou", tokensAntes: tokens };
      if (ok) agiu++;
    } catch (e) {
      log(`[${id}/${sess.key}] ${nome}: RESET FALHOU: ${e.message.slice(0, 200)}`);
      estado[sess.key] = { ...(estado[sess.key] || {}), ultimaAcao: agora, ultimoResultado: "reset-falhou" };
    }
  }
}

salvarEstado(estado);
log(`session-guard: ${agiu} agente(s) rotacionado(s). limite=${LIMITE}${DRY ? " (dry-run)" : ""}`);
