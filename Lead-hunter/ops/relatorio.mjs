#!/usr/bin/env node
// Fase 8 — relatório diário da operação (voz da Sukuna), postado no #melhorias.
import { spawnSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { postDiscord } from "./lib-discord.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const LH = resolve(HERE, "..", "openclaw-skill", "lead-hunter", "lh.mjs");
const status = spawnSync("node", [LH, "status"], { encoding: "utf8" }).stdout || "";
const leads = spawnSync("node", [LH, "leads", "5"], { encoding: "utf8" }).stdout || "";

const prompt = `Você é a Sukuna, orquestradora do Lead Hunter BH. Escreva um relatório diário CURTO e direto pro Samuel (PT-BR), tom de quem comanda a operação, baseado nos dados abaixo. Destaque: 3-5 leads quentes pra atacar hoje, o que precisa de ação, e qualquer alerta (jobs com erro, etc.). Sem enrolação, sem inventar dado.\n\nSTATUS:\n${status}\n\nTOP LEADS:\n${leads}`;
const r = spawnSync("claude", ["-p", prompt], { encoding: "utf8", timeout: 150000 });
const report = (r.stdout || "").trim() || ("Status cru:\n" + status);

await postDiscord("📊 **Relatório diário da operação**\n\n" + report, "Sukuna");
console.log("relatorio: ok");
