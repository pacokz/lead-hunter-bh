#!/usr/bin/env node
// Fase 8 — Analista de Melhorias (prep): condensa os transcripts das últimas ~26h num digest
// dentro do workspace do Sukuna, pra ele analisar o que virar skill/ajuste sem custo alto de token.
import { writeFileSync, mkdirSync, readdirSync, statSync, readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const OC = resolve(homedir(), ".openclaw");
const AGENTS = { main: "Sukuna", comercial: "Yuji", diagnosticador: "Megumi", criadora: "Nobara", "diretor-arte": "Nanami" };
const HEARTBEAT_RE = /OpenClaw heartbeat poll|HEARTBEAT_OK|No pending requests|nenhum pedido pendente|sem pedidos pendentes|\[heartbeat/i;
const SINCE = Date.now() - 74 * 3600 * 1000; // ~3 dias (Analista roda de 3 em 3 dias)

function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => typeof c === "string" ? c
      : c.type === "text" ? c.text
      : c.type === "tool_use" ? `[tool:${c.name}]`
      : c.type === "tool_result" ? "[tool_result]" : "").join(" ");
  }
  return "";
}

const out = [];
let totalMsg = 0, totalSess = 0;

for (const [id, nome] of Object.entries(AGENTS)) {
  const dir = resolve(OC, "agents", id, "sessions");
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith(".jsonl") && f !== "sessions.json"); } catch { continue; }
  for (const f of files) {
    const fp = resolve(dir, f);
    if (statSync(fp).mtimeMs < SINCE) continue;
    const msgs = [];
    let heartbeats = 0;
    for (const ln of readFileSync(fp, "utf8").split("\n").filter(Boolean)) {
      let d; try { d = JSON.parse(ln); } catch { continue; }
      if (d.type !== "message" || !d.message) continue;
      const ts = d.timestamp ? Date.parse(d.timestamp) : 0;
      if (ts && ts < SINCE) continue;
      let txt = textOf(d.message.content).replace(/\s+/g, " ").trim();
      if (!txt) continue;
      // ruído de heartbeat: colapsa numa contagem em vez de encher o digest (proposta 08/07)
      if (HEARTBEAT_RE.test(txt)) { heartbeats++; continue; }
      if (/^A background task completed/.test(txt)) txt = "[resultado de tarefa em background]";
      const who = d.message.role === "user" ? `Samuel→${nome}` : nome;
      msgs.push(`- **${who}:** ${txt.slice(0, 600)}`);
    }
    if (heartbeats) msgs.push(`- _(${heartbeats} troca(s) de heartbeat omitida(s))_`);
    if (!msgs.length || (msgs.length === 1 && heartbeats)) continue; // sessão só de heartbeat = ignora
    totalSess++; totalMsg += msgs.length;
    out.push(`\n## ${nome} — sessão ${f.slice(0, 8)}\n` + msgs.join("\n"));
  }
}

const date = new Date().toISOString().slice(0, 10);
const header = `# Digest de conversas — ${date}\n> ${totalSess} sessões, ${totalMsg} mensagens dos últimos ~3 dias. Use pra análise de melhorias.\n`;
const destDir = resolve(OC, "workspace", "_analise");
mkdirSync(destDir, { recursive: true });
const file = resolve(destDir, `${date}.md`);
writeFileSync(file, header + out.join("\n"));
console.log(`Digest escrito: ${file}\n${totalSess} sessões, ${totalMsg} mensagens.`);
