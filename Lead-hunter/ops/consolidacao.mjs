#!/usr/bin/env node
// Memória dos agentes — CONSOLIDAÇÃO (a cada 3 dias, junto com o Analista). Para cada agente, lê o
// MEMORY.md atual + as notas diárias dos últimos ~4 dias e usa `claude -p` (na voz do agente, via
// SOUL) pra reescrever um MEMORY.md curado e enxuto. Guarda backups datados (últimos 5) por
// segurança. Posta resumo no Discord.
import { spawnSync } from "child_process";
import { writeFileSync, readFileSync, readdirSync, statSync, copyFileSync, existsSync, unlinkSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";
import { postDiscord } from "./lib-discord.mjs";

const OC = resolve(homedir(), ".openclaw");
const AGENTS = {
  main:           { nome: "Sukuna", ws: "workspace" },
  comercial:      { nome: "Yuji",   ws: "workspace-comercial" },
  diagnosticador: { nome: "Megumi", ws: "workspace-diagnosticador" },
  criadora:       { nome: "Nobara", ws: "workspace-criadora" },
};
const JANELA = Date.now() - 4 * 24 * 3600 * 1000; // só as notas desde a última consolidação (+buffer)
const date = new Date().toISOString().slice(0, 10);

function read(p) { try { return readFileSync(p, "utf8"); } catch { return ""; } }

const resumo = [];
for (const [, { nome, ws }] of Object.entries(AGENTS)) {
  const memDir = resolve(OC, ws, "memory");
  let notas = [];
  try {
    notas = readdirSync(memDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f) && statSync(resolve(memDir, f)).mtimeMs >= JANELA)
      .sort();
  } catch {}
  const corpoNotas = notas.map((f) => read(resolve(memDir, f))).join("\n\n").trim();
  if (corpoNotas.replace(/\s/g, "").length < 120) { resumo.push(`• ${nome}: sem notas novas, mantido.`); continue; }

  const memPath = resolve(OC, ws, "MEMORY.md");
  const memAtual = read(memPath);
  const soul = read(resolve(OC, ws, "SOUL.md")).slice(0, 4000);

  const prompt = `Você é ${nome}, agente do Lead Hunter BH. Abaixo está sua identidade (SOUL), seu MEMORY.md ATUAL e suas NOTAS DIÁRIAS dos últimos ~15 dias.
Tarefa: reescrever seu MEMORY.md — memória de LONGO PRAZO curada. Funda o atual com o que as notas trouxeram de novo (decisões, lições, leads/demos trabalhados, estado da operação). **NÃO descarte nenhuma lição, decisão ou histórico que ainda seja válido** — só remova o que ficou de fato obsoleto/superado e deduplique. Mantenha CONCISO e em 1ª pessoa, na sua voz, em português. Preserve o cabeçalho explicando que é memória operacional.
IMPORTANTÍSSIMO: responda APENAS com o conteúdo markdown do novo MEMORY.md — sem comentário, sem cerca de código, sem "aqui está".

=== SOUL ===
${soul}

=== MEMORY.md ATUAL ===
${memAtual}

=== NOTAS DIÁRIAS (últimos ~15 dias) ===
${corpoNotas.slice(0, 18000)}`;

  const r = spawnSync("claude", ["-p"], { input: prompt, encoding: "utf8", timeout: 200000 });
  let novo = (r.stdout || "").trim().replace(/^```(?:markdown|md)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (novo.length < 200 || !/^#/.test(novo)) { resumo.push(`• ${nome}: claude -p falhou, MEMORY.md mantido.`); continue; }

  if (existsSync(memPath)) {
    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    copyFileSync(memPath, resolve(OC, ws, `MEMORY.${stamp}.bak`));
    // mantém só os 5 backups mais recentes
    try {
      const baks = readdirSync(resolve(OC, ws)).filter((f) => /^MEMORY\..+\.bak$/.test(f)).sort();
      for (const f of baks.slice(0, -5)) unlinkSync(resolve(OC, ws, f));
    } catch {}
  }
  writeFileSync(memPath, novo + "\n");
  resumo.push(`• ${nome}: consolidado (${notas.length} notas → MEMORY.md).`);
  console.log(`${nome}: MEMORY.md consolidado a partir de ${notas.length} notas.`);
}

await postDiscord(`🧠 **Consolidação de memória — ${date}**\n\n${resumo.join("\n")}\n\n_MEMORY.md de cada agente atualizado a partir das notas diárias (backup .bak guardado)._`, "Memória");
console.log("consolidacao: ok");
