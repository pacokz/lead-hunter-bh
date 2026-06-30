#!/usr/bin/env node
// Fase 8 — pipeline diário: re-auditoria + re-score (sem custo de API Google). Roda via Task Scheduler.
import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const LH = resolve(HERE, "..", "openclaw-skill", "lead-hunter", "lh.mjs");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const log = [`=== PIPELINE ${stamp} ===`];

const run = (cmd) => {
  const r = spawnSync("node", [LH, cmd], { encoding: "utf8", timeout: 300000 });
  log.push(`\n$ lh ${cmd}  (exit ${r.status})\n${(r.stdout || "") + (r.stderr || "")}`);
};

run("audit-run");
run("score-run");
const st = spawnSync("node", [LH, "status"], { encoding: "utf8" });
log.push("\n--- STATUS FINAL ---\n" + (st.stdout || st.stderr || ""));

mkdirSync(resolve(HERE, "logs"), { recursive: true });
const out = log.join("\n");
writeFileSync(resolve(HERE, "logs", `pipeline-${stamp.slice(0, 10)}.log`), out);
console.log(out);
