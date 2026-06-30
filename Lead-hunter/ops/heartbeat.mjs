#!/usr/bin/env node
// Fase 8 — heartbeat: checa gateway + backend + banco; avisa no #melhorias SÓ se algo cair.
import net from "net";
import { spawnSync } from "child_process";
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

const gw = await tcpUp(18789);
const be = await tcpUp(8000);
const db = spawnSync("docker", ["exec", "lead-hunter-db", "pg_isready", "-U", "lead"], { encoding: "utf8" }).status === 0;

const down = [];
if (!gw) down.push("Gateway OpenClaw (:18789) — agentes offline");
if (!be) down.push("Backend (:8000) — comandos de lead offline");
if (!db) down.push("Banco lead-hunter-db");

if (down.length) {
  await postDiscord("🚨 **ALERTA — serviço fora do ar:**\n- " + down.join("\n- ") + "\n\nProvável: Docker Desktop fechado ou o gateway caiu.", "Heartbeat");
  console.log("ALERTA:", down.join(" | "));
} else {
  console.log("heartbeat ok — gateway, backend e banco no ar.");
}
