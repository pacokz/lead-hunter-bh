#!/usr/bin/env node
// Fase 8 — heartbeat: checa gateway + backend + banco; avisa no #melhorias SÓ se algo cair.
// VPS: gateway/backend por TCP; banco pelo /health/db do backend (Supabase, sem container local).
import net from "net";
import { postDiscord } from "./lib-discord.mjs";

function tcpUp(port, host = "localhost", timeout = 4000) {
  return new Promise((res) => {
    const s = net.connect({ port, host });
    const done = (v) => { s.destroy(); res(v); };
    s.setTimeout(timeout);
    s.once("connect", () => done(true));
    s.once("timeout", () => done(false));
    s.once("error", () => done(false));
  });
}

async function dbUp() {
  try {
    const r = await fetch("http://localhost:8000/health/db", { signal: AbortSignal.timeout(5000) });
    const j = await r.json();
    return j.database === "connected";
  } catch { return false; }
}

const gw = await tcpUp(18789);
const be = await tcpUp(8000);
const db = be ? await dbUp() : false; // sem backend não dá pra checar o banco

const down = [];
if (!gw) down.push("Gateway OpenClaw (:18789) — agentes offline");
if (!be) down.push("Backend (:8000) — comandos de lead offline");
if (!db) down.push("Banco (Supabase) — sem conexão");

if (down.length) {
  await postDiscord("🚨 **ALERTA — serviço fora do ar:**\n- " + down.join("\n- ") + "\n\nProvável: um serviço da VPS caiu — veja `systemctl status openclaw` / `docker compose ps`.", "Heartbeat");
  console.log("ALERTA:", down.join(" | "));
} else {
  console.log("heartbeat ok — gateway, backend e banco no ar.");
}
