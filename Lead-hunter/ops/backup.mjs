#!/usr/bin/env node
// Fase 8 — backup diário do Postgres (container lead-hunter-db) via pg_dump. Mantém os últimos 14.
import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const dir = resolve(HERE, "backups");
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const file = resolve(dir, `leadhunter-${stamp}.sql`);

const r = spawnSync("docker", ["exec", "lead-hunter-db", "pg_dump", "-U", "lead", "leadhunter"],
  { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 180000 });
if (r.status !== 0 || !r.stdout) {
  console.error("BACKUP FALHOU:", r.stderr || `(exit ${r.status})`); process.exit(1);
}
writeFileSync(file, r.stdout);
console.log(`backup OK: ${file} (${(r.stdout.length / 1024).toFixed(0)} KB)`);

// retenção: mantém os 14 mais recentes
const olds = readdirSync(dir).filter((f) => f.endsWith(".sql"))
  .map((f) => ({ f, t: statSync(resolve(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
for (const { f } of olds.slice(14)) { try { unlinkSync(resolve(dir, f)); } catch {} }
