#!/usr/bin/env node
// Vigia deterministico dos pedidos do botao GERAR SITE — substitui o heartbeat de LLM do Sukuna.
//
// Antes: o HEARTBEAT.md do Sukuna mandava rodar `demo-pedidos` a cada 30 min. Isso gastava um turno
// de LLM (Opus) so pra, na esmagadora maioria das vezes, responder "HEARTBEAT_OK" porque nao havia
// pedido. Em 30/07/2026 foram 32 heartbeats concluidos num dia — 52% de TODOS os turnos do dia foram
// manutencao (heartbeat + flush), nao trabalho.
//
// Agora: este script roda o mesmo comando por codigo (custo zero) e SO acorda o Sukuna quando ha
// pedido PENDING de verdade. Sem pedido, ninguem e chamado.
//
// Uso:  node ops/pedidos-watch.mjs [--dry-run]
// Cron: */30 * * * *

import { execFileSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { resolve, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import { bloqueada } from "../openclaw-skill/lead-hunter/quota.mjs";

const DRY = process.argv.includes("--dry-run");
const DIR = resolve(homedir(), "logs-ops");
const LOG = resolve(DIR, "pedidos-watch.log");
const VISTOS = resolve(DIR, "pedidos-vistos.json");
const LH = resolve(dirname(fileURLToPath(import.meta.url)), "..", "openclaw-skill", "lead-hunter", "lh.mjs");

function log(msg) {
  const linha = `${new Date().toISOString()} ${msg}`;
  console.log(linha);
  try {
    mkdirSync(DIR, { recursive: true });
    appendFileSync(LOG, linha + "\n");
  } catch {}
}

let saida = "";
try {
  saida = execFileSync("node", [LH, "demo-pedidos"], { encoding: "utf8", timeout: 120000 });
} catch (e) {
  // Backend fora do ar e informacao operacional, nao motivo pra acordar agente.
  log(`FALHA ao consultar pedidos (backend fora do ar?): ${String(e.message).slice(0, 200)}`);
  process.exit(0);
}

const pendentes = [...saida.matchAll(/\[PENDING\]\s+#(\d+)\s+(.*)/g)].map((m) => ({ id: m[1], nome: m[2].trim() }));
if (!pendentes.length) {
  log("nenhum pedido PENDING — ninguem foi acordado (era aqui que se gastava um turno Opus).");
  process.exit(0);
}

// Nao reacordar pelo mesmo pedido a cada ciclo: o agente ja marca IN_PROGRESS, mas ate ele fazer
// isso pode passar mais de um ciclo, e acordar duas vezes duplica trabalho.
let vistos = {};
try {
  vistos = JSON.parse(readFileSync(VISTOS, "utf8"));
} catch {}
const agora = Date.now();
const REPETIR_APOS_MIN = 60;
const novos = pendentes.filter((p) => !vistos[p.id] || (agora - vistos[p.id]) / 60000 > REPETIR_APOS_MIN);

if (!novos.length) {
  log(`${pendentes.length} pedido(s) PENDING, mas todos ja avisados nos ultimos ${REPETIR_APOS_MIN}min — nao vou acordar de novo.`);
  process.exit(0);
}

const b = bloqueada();
if (b) {
  log(`${novos.length} pedido(s) novo(s), mas a conta esta sem cota por ~${b.restanteMin}min — nao acordo agora; o proximo ciclo tenta.`);
  process.exit(0);
}

const lista = novos.map((p) => `#${p.id} ${p.nome}`).join("; ");
log(`${novos.length} pedido(s) PENDING: ${lista} — acordando o Sukuna.`);
if (DRY) process.exit(0);

const msg =
  `Ha ${novos.length} pedido(s) PENDING no botao GERAR SITE: ${lista}. ` +
  `Assuma o fluxo do seu HEARTBEAT.md: marque demo-pedido-status <id> IN_PROGRESS, rode demo-data, ` +
  `avise no Discord que entrou em producao citando as instrucoes do Samuel, e siga o pipeline. ` +
  `Voce foi acordado por um vigia deterministico — se nao houvesse pedido, ninguem teria te chamado.`;

try {
  const r = execFileSync("openclaw", ["agent", "--agent", "main", "--message", msg, "--timeout", "900"], { encoding: "utf8", timeout: 960000 });
  log(`Sukuna acordado: ${r.replace(/\s+/g, " ").slice(0, 200)}`);
  for (const p of novos) vistos[p.id] = agora;
  try {
    writeFileSync(VISTOS, JSON.stringify(vistos, null, 2));
  } catch {}
} catch (e) {
  log(`FALHA ao acordar o Sukuna: ${String(e.message).slice(0, 200)}`);
}
