#!/usr/bin/env node
// Fase 8 — backup diário do Postgres via pg_dump. Mantém os últimos 14.
// VPS: dumpa o Supabase lendo DATABASE_URL do .env (precisa de postgresql-client instalado).
import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, statSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const dir = resolve(HERE, "backups");
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().slice(0, 10);
const file = resolve(dir, `leadhunter-${stamp}.sql`);

// lê a DATABASE_URL do .env e limpa o driver "+psycopg" (pg_dump não entende)
const env = Object.fromEntries(
  readFileSync(resolve(HERE, "..", ".env"), "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);
const url = (env.DATABASE_URL || "").replace("+psycopg", "");
if (!url) { console.error("BACKUP FALHOU: DATABASE_URL não encontrada no .env"); process.exit(1); }

const r = spawnSync("pg_dump", [url], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024, timeout: 180000 });
if (r.status !== 0 || !r.stdout) {
  console.error("BACKUP FALHOU:", r.stderr || `(exit ${r.status})`); process.exit(1);
}
writeFileSync(file, r.stdout);
console.log(`backup OK: ${file} (${(r.stdout.length / 1024).toFixed(0)} KB)`);

// retenção: mantém os 14 mais recentes
const olds = readdirSync(dir).filter((f) => f.endsWith(".sql"))
  .map((f) => ({ f, t: statSync(resolve(dir, f)).mtimeMs })).sort((a, b) => b.t - a.t);
for (const { f } of olds.slice(14)) { try { unlinkSync(resolve(dir, f)); } catch {} }
