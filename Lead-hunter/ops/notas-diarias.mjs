#!/usr/bin/env node
// Memória dos agentes — NOTA DIÁRIA (crua, sem curadoria). Para cada agente, lê as sessões de hoje
// e escreve um log do dia em <workspace>/memory/AAAA-MM-DD.md. A consolicação (15/15 dias) destila
// isso no MEMORY.md de cada um. Determinístico, sem custo de token.
import { writeFileSync, mkdirSync, readdirSync, statSync, readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const OC = resolve(homedir(), ".openclaw");
const AGENTS = {
  main:           { nome: "Sukuna", ws: "workspace" },
  comercial:      { nome: "Yuji",   ws: "workspace-comercial" },
  diagnosticador: { nome: "Megumi", ws: "workspace-diagnosticador" },
  criadora:       { nome: "Nobara", ws: "workspace-criadora" },
  "diretor-arte": { nome: "Nanami", ws: "workspace-diretor-arte" },
};

// início do dia local
const now = new Date();
const SINCE = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).getTime();
const date = new Date(SINCE).toISOString().slice(0, 10);

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

let escritas = 0;
for (const [id, { nome, ws }] of Object.entries(AGENTS)) {
  const dir = resolve(OC, "agents", id, "sessions");
  let files = [];
  try { files = readdirSync(dir).filter((f) => f.endsWith(".jsonl") && f !== "sessions.json"); } catch { continue; }
  const linhas = [];
  for (const f of files) {
    const fp = resolve(dir, f);
    if (statSync(fp).mtimeMs < SINCE) continue;
    const msgs = [];
    for (const ln of readFileSync(fp, "utf8").split("\n").filter(Boolean)) {
      let d; try { d = JSON.parse(ln); } catch { continue; }
      if (d.type !== "message" || !d.message) continue;
      const ts = d.timestamp ? Date.parse(d.timestamp) : 0;
      if (ts && ts < SINCE) continue;
      let txt = textOf(d.message.content).replace(/\s+/g, " ").trim();
      if (!txt) continue;
      if (/^A background task completed/.test(txt)) txt = "[resultado de tarefa em background]";
      const hora = ts ? new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
      const who = d.message.role === "user" ? `Samuel→${nome}` : nome;
      msgs.push(`- ${hora} **${who}:** ${txt.slice(0, 700)}`);
    }
    if (msgs.length) linhas.push(`### sessão ${f.slice(0, 8)}\n` + msgs.join("\n"));
  }

  const memDir = resolve(OC, ws, "memory");
  mkdirSync(memDir, { recursive: true });
  const file = resolve(memDir, `${date}.md`);
  const body = linhas.length
    ? `# Nota diária — ${nome} — ${date}\n> Log cru do dia (sem curadoria). A consolidação destila no MEMORY.md.\n\n${linhas.join("\n\n")}\n`
    : `# Nota diária — ${nome} — ${date}\n> Sem atividade registrada hoje.\n`;
  writeFileSync(file, body);
  escritas++;
  console.log(`${nome}: ${file} (${linhas.length} sessões)`);
}
console.log(`Notas diárias escritas: ${escritas}/${Object.keys(AGENTS).length}.`);
