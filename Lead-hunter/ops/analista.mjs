#!/usr/bin/env node
// Fase 8 — Analista de Melhorias: condensa transcripts de ontem, analisa com claude -p e posta no #melhorias.
import { spawnSync } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { postDiscord } from "./lib-discord.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
// 1) gera o digest condensado
spawnSync("node", [resolve(HERE, "analista-prep.mjs")], { encoding: "utf8" });
const date = new Date().toISOString().slice(0, 10);
let digest = "";
try { digest = readFileSync(resolve(homedir(), ".openclaw", "workspace", "_analise", `${date}.md`), "utf8"); } catch {}

// LEDGER de bloqueios objetivos dos gates (demo-publicar) — sinal de erro que o digest de conversa não vê
let ledgerTxt = "";
try {
  const raw = readFileSync(resolve(homedir(), ".openclaw", "demos-shared", "_ledger.jsonl"), "utf8").trim().split("\n");
  const since = Date.now() - 3 * 24 * 3600 * 1000;
  const rows = raw.map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((r) => r && Date.parse(r.ts) >= since);
  const byGate = {};
  for (const r of rows) { (byGate[r.gate] = byGate[r.gate] || []).push(`${r.slug}: ${r.reason}`); }
  ledgerTxt = Object.entries(byGate).map(([g, arr]) => `- ${g} (${arr.length}x): ${arr.slice(0, 6).join(" || ")}`).join("\n");
  if (rows.length) ledgerTxt = `${rows.length} bloqueio(s) de publicacao em 3 dias, por gate:\n${ledgerTxt}`;
} catch {}

if (digest.replace(/\s/g, "").length < 80 && !ledgerTxt) { console.log("sem conversas nem bloqueios relevantes nos últimos 3 dias."); process.exit(0); }

const prompt = `Você é o analista de melhoria contínua do Lead Hunter BH (agentes: Sukuna=orquestra, Yuji=comercial, Megumi=diagnóstico, Nobara=cria demos à mão, Nanami=diretor de arte/BRIEF). Cruze DUAS fontes: (1) o digest das conversas dos últimos 3 dias e (2) o LEDGER de bloqueios objetivos dos gates de publicação (o sinal mais forte: a Nobara TENTOU publicar e foi barrada). Identifique PADRÕES RECORRENTES (o mesmo gate barrando repetido, o mesmo erro de design, algo que o Samuel teve que repetir, tarefa refeita do zero).

Para cada padrão, classifique em UMA das duas faixas:
• **LIÇÃO (auto-aplicável)** — aprendizado de design/processo que cabe no livro de repetições (\`demos/_repetition-book.md\`), no \`anti-vibe-code.md\` ou numa referência. Ex: "3 demos barradas por carrossel no mobile → virar regra dura". Diga a lição em 1 frase pronta pra colar.
• **MUDANÇA (precisa OK do Samuel)** — mexer em código/gate/SOUL/skill. Diga o arquivo e a mudança concreta. NÃO implemente; o Samuel aprova.

Conciso (máx ~6 padrões). Se nada relevante: "nada a melhorar hoje".\n\n=== LEDGER (bloqueios dos gates, 3 dias) ===\n${ledgerTxt || "(sem bloqueios registrados)"}\n\n=== DIGEST (conversas) ===\n${digest.slice(0, 22000)}`;
const r = spawnSync("claude", ["-p"], { input: prompt, encoding: "utf8", timeout: 200000 });
const analise = (r.stdout || "").trim();
if (!analise) { console.error("claude -p nao retornou:", r.stderr); process.exit(1); }

await postDiscord(`🔍 **Analista de Melhorias — ${date}**\n_(lê conversas + ledger de bloqueios dos gates)_\n\n${analise}\n\n_LIÇÕES podem virar regra no livro; MUDANÇAS de código/SOUL só com seu OK._`, "Analista");
console.log("analise: ok");
