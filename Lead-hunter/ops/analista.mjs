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
if (digest.replace(/\s/g, "").length < 80) { console.log("sem conversas relevantes nos últimos 3 dias."); process.exit(0); }

const prompt = `Você é o analista de melhoria contínua do Lead Hunter BH (agentes: Sukuna=orquestra, Yuji=comercial, Megumi=diagnóstico, Nobara=cria demos). Leia o digest das conversas dos últimos 3 dias e identifique o que pode virar MELHORIA do sistema. Para cada candidato: (a) padrão/atrito observado, (b) recomendação — virar SKILL / ajustar SOUL / criar FIX / NÃO VALE, (c) por quê em 1 linha. Foque no que o Samuel teve que REPETIR, tarefas refeitas do zero, erros/travas. Conciso e prático (máx ~6 itens). Se não houver nada relevante: "nada a melhorar hoje". NÃO implemente nada — só proponha; o Samuel aprova.\n\n=== DIGEST ===\n${digest.slice(0, 24000)}`;
const r = spawnSync("claude", ["-p"], { input: prompt, encoding: "utf8", timeout: 200000 });
const analise = (r.stdout || "").trim();
if (!analise) { console.error("claude -p nao retornou:", r.stderr); process.exit(1); }

await postDiscord(`🔍 **Analista de Melhorias — ${date}**\n\n${analise}\n\n_Proposta automática — nada é criado sem seu OK._`, "Analista");
console.log("analise: ok");
