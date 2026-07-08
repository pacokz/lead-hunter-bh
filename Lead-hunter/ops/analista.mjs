#!/usr/bin/env node
// Fase 8 — Analista de Melhorias: condensa transcripts de ontem, analisa com claude -p e posta no #melhorias.
import { spawnSync } from "child_process";
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
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

const prompt = `Você é o analista de melhoria contínua do Lead Hunter BH (agentes: Sukuna=orquestra, Yuji=comercial, Megumi=diagnóstico, Nobara=cria demos à mão, Nanami=diretor de arte/BRIEF). Cruze DUAS fontes: (1) o digest das conversas dos últimos 3 dias e (2) o LEDGER de bloqueios objetivos dos gates de publicação (o sinal mais forte: a Nobara TENTOU publicar e foi barrada). Identifique PADRÕES RECORRENTES (o mesmo gate barrando repetido, o mesmo erro de design, algo que o Samuel repetiu, tarefa refeita do zero).

Responda SÓ com um JSON válido (sem markdown, sem texto fora do objeto) neste formato:
{"resumo":"1-2 frases do que mais apareceu","licoes":["regra de design/processo pronta pra colar no livro de repetições — 1 frase imperativa, ex: 'NUNCA carrossel full-width no mobile sem affordance'"],"mudancas":[{"arquivo":"caminho/do/arquivo","mudanca":"o que mudar, concreto","porque":"1 linha"}]}
- "licoes" = aprendizado de DESIGN/PROCESSO que a Nobara/Nanami devem seguir (vai ser APLICADO automaticamente num arquivo que elas leem). Só o que for regra clara e recorrente. Máx 5.
- "mudancas" = mexer em CÓDIGO/GATE/SOUL/skill (NÃO é auto-aplicado; vira proposta pro Samuel aprovar). Máx 5.
- Se não houver nada de uma categoria, use []. Se nada relevante: {"resumo":"nada a melhorar hoje","licoes":[],"mudancas":[]}.

=== LEDGER (bloqueios dos gates, 3 dias) ===\n${ledgerTxt || "(sem bloqueios registrados)"}\n\n=== DIGEST (conversas) ===\n${digest.slice(0, 20000)}`;

const r = spawnSync("claude", ["-p"], { input: prompt, encoding: "utf8", timeout: 200000 });
const raw = (r.stdout || "").trim();
if (!raw) { console.error("claude -p nao retornou:", r.stderr); process.exit(1); }

// extrai o primeiro objeto JSON (o claude -p as vezes embrulha em prosa/fences)
let data;
try { data = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)); }
catch { // fallback: nao consegui parsear -> so posta o texto cru pro Samuel, nada auto-aplicado
  await postDiscord(`🔍 **Analista de Melhorias — ${date}** (saída não estruturada)\n\n${raw.slice(0, 1500)}\n\n_Nada auto-aplicado (não consegui parsear)._`, "Analista");
  process.exit(0);
}

const licoes = (data.licoes || []).filter((x) => typeof x === "string" && x.trim());
const mudancas = (data.mudancas || []).filter((m) => m && m.arquivo && m.mudanca);
const SHARED = resolve(homedir(), ".openclaw", "demos-shared");

// ── TIER A: LIÇÕES auto-aplicadas (append-only, datado, reversível) ──
if (licoes.length) {
  const bloco = `\n## ${date} — aprendido automaticamente pelo Analista\n` + licoes.map((l) => `- ${l}`).join("\n") + "\n";
  try { appendFileSync(resolve(SHARED, "_licoes-aprendidas.md"), bloco); } catch (e) { console.error("falha ao gravar licoes:", e.message); }
}

// ── TIER B: MUDANÇAS de código/SOUL viram PROPOSTA pra aprovar (nunca auto-aplicado) ──
let propostaPath = null;
if (mudancas.length) {
  const dir = resolve(SHARED, "_propostas"); if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  propostaPath = resolve(dir, `${date}.md`);
  const body = `# Propostas de mudança — ${date}\n> Geradas pelo Analista. Requerem aprovação do Samuel; NÃO foram aplicadas.\n\n`
    + mudancas.map((m, i) => `## ${i + 1}. ${m.arquivo}\n- **Mudança:** ${m.mudanca}\n- **Por quê:** ${m.porque || "—"}\n`).join("\n");
  try { writeFileSync(propostaPath, body); } catch (e) { console.error("falha ao gravar proposta:", e.message); }
}

// ── Discord: resumo do que foi auto-aplicado + o que precisa de OK ──
let msg = `🔍 **Analista de Melhorias — ${date}**\n_(cruza conversas + ledger de bloqueios)_\n\n**${data.resumo || "análise concluída"}**\n`;
if (licoes.length) msg += `\n✅ **${licoes.length} lição(ões) aplicada(s) automaticamente** em \`_licoes-aprendidas.md\` (Nobara/Nanami passam a seguir):\n` + licoes.map((l) => `• ${l}`).join("\n") + "\n";
if (mudancas.length) msg += `\n🛠️ **${mudancas.length} mudança(s) de código/SOUL — PRECISAM do seu OK** (proposta em \`_propostas/${date}.md\`):\n` + mudancas.map((m) => `• \`${m.arquivo}\`: ${m.mudanca}`).join("\n") + "\n";
if (!licoes.length && !mudancas.length) msg += "\n_Nada a melhorar hoje._";
await postDiscord(msg, "Analista");
console.log(`analise: ok (${licoes.length} licoes auto-aplicadas, ${mudancas.length} propostas)`);
