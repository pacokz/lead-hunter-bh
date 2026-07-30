#!/usr/bin/env node
// Medidor de consumo por janela. Existe porque rebaixar modelo sem medir e fe, nao engenharia.
//
// Le o journal do openclaw e os transcripts da CLI e responde, para um intervalo:
//   - quantos turnos, por modelo e por agente
//   - quanto tempo cada turno levou
//   - quanto contexto cada turno carregou (input + cache lido + cache criado)
//   - quanto disso foi manutencao (heartbeat/flush) versus trabalho
//
// Em 30/07/2026 a medicao mostrou: 86 turnos concluidos no dia, 85 em Opus 4.8, e 52% deles eram
// manutencao. Sem esse numero ninguem teria olhado pro heartbeat.
//
// Uso:  node ops/medir.mjs --desde '14:40' [--ate '18:10']
//       node ops/medir.mjs --desde '-2 hours'

import { execFileSync } from "child_process";
import { readdirSync, statSync, openSync, readSync, fstatSync, closeSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const DESDE = arg("--desde", "-3 hours");
const ATE = arg("--ate", null);

const PROJ = resolve(homedir(), ".claude", "projects");

// Descobre o agente dono de cada sessao da CLI, olhando em qual workspace o transcript vive.
function mapaSessaoAgente() {
  const mapa = new Map();
  let dirs = [];
  try {
    dirs = readdirSync(PROJ);
  } catch {
    return mapa;
  }
  for (const d of dirs) {
    const m = d.match(/workspace(-[a-z-]+)?$/);
    if (!m) continue;
    const agente = m[1] ? m[1].slice(1) : "main";
    try {
      for (const f of readdirSync(resolve(PROJ, d))) {
        if (f.endsWith(".jsonl")) mapa.set(f.replace(/\.jsonl$/, ""), agente);
      }
    } catch {}
  }
  return mapa;
}

// Ultimo usage do transcript = contexto que aquele turno carregou.
function contextoDoTranscript(sessionId, mapa) {
  const agente = mapa.get(sessionId);
  if (!agente) return null;
  const dir = readdirSync(PROJ).find((d) => d.endsWith(agente === "main" ? "workspace" : `workspace-${agente}`));
  if (!dir) return null;
  const arq = resolve(PROJ, dir, `${sessionId}.jsonl`);
  let fd;
  try {
    fd = openSync(arq, "r");
  } catch {
    return null;
  }
  try {
    const { size } = fstatSync(fd);
    const bytes = Math.min(2 * 1024 * 1024, size);
    const buf = Buffer.alloc(bytes);
    readSync(fd, buf, 0, bytes, Math.max(0, size - bytes));
    let tok = null;
    for (const l of buf.toString("utf8").split("\n")) {
      if (!l.trim()) continue;
      let j;
      try {
        j = JSON.parse(l);
      } catch {
        continue;
      }
      const u = j.message?.usage;
      if (!u) continue;
      const t = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
      if (t > 0) tok = t;
    }
    return tok;
  } finally {
    closeSync(fd);
  }
}

const args = ["-u", "openclaw", "--since", DESDE, "--no-pager"];
if (ATE) args.push("--until", ATE);
let jl = "";
try {
  jl = execFileSync("journalctl", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  console.error(`falhou ao ler o journal: ${e.message}`);
  process.exit(1);
}

const execs = [];
const turnos = [];
for (const linha of jl.split("\n")) {
  const mE = linha.match(/cli exec: provider=(\S+) model=(\S+) promptChars=(\d+) trigger=(\S+) useResume=(\S+) session=(\S+) resumeSession=(\S+) reuse=(\S+)/);
  if (mE) {
    execs.push({ modelo: mE[2], promptChars: Number(mE[3]), trigger: mE[4], resume: mE[5] === "true", sessao: mE[7] });
    continue;
  }
  const mT = linha.match(/live session turn(?: (failed))?: provider=\S+ model=(\S+) durationMs=(\d+)/);
  if (mT) turnos.push({ falhou: Boolean(mT[1]), modelo: mT[2], ms: Number(mT[3]) });
}

const mapa = mapaSessaoAgente();
const porModelo = {};
const porTrigger = {};
let msTotal = 0;
for (const t of turnos) {
  porModelo[t.modelo] = (porModelo[t.modelo] || 0) + 1;
  msTotal += t.ms;
}
for (const e of execs) porTrigger[e.trigger] = (porTrigger[e.trigger] || 0) + 1;

const manutencao = (porTrigger.heartbeat || 0);
const total = execs.length;

console.log(`\n=== JANELA: desde ${DESDE}${ATE ? ` ate ${ATE}` : ""} ===\n`);
console.log(`execucoes iniciadas : ${total}`);
console.log(`turnos concluidos   : ${turnos.filter((t) => !t.falhou).length}`);
console.log(`turnos falhados     : ${turnos.filter((t) => t.falhou).length}`);
console.log(`tempo total de turno: ${(msTotal / 60000).toFixed(1)} min`);
console.log(`\nPOR MODELO (turnos):`);
for (const [m, n] of Object.entries(porModelo).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${m}  ${((n / turnos.length) * 100).toFixed(0)}%`);
}
console.log(`\nPOR TRIGGER (execucoes):`);
for (const [t, n] of Object.entries(porTrigger).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(3)}  ${t}`);
}
if (total) console.log(`\nmanutencao (heartbeat): ${manutencao}/${total} = ${((manutencao / total) * 100).toFixed(0)}%`);

console.log(`\nCONTEXTO POR SESSAO ATIVA (ultimo turno de cada):`);
const vistos = new Set();
for (const e of execs) {
  if (e.sessao === "none" || vistos.has(e.sessao)) continue;
  vistos.add(e.sessao);
}
const linhas = [];
for (const [sid, agente] of mapa) {
  const tok = contextoDoTranscript(sid, mapa);
  if (tok && tok > 1000) linhas.push({ agente, sid: sid.slice(0, 8), tok });
}
for (const l of linhas.sort((a, b) => b.tok - a.tok).slice(0, 12)) {
  console.log(`  ${String(Math.round(l.tok / 1000)).padStart(4)}k  ${l.agente.padEnd(16)} ${l.sid}`);
}
console.log();
