// Circuit breaker de cota da conta Anthropic.
//
// Em 30/07/2026 a operacao ficou 2h congelada (15:48→17:50) sem ninguem saber por que. O que o log
// mostrou depois: 21 tentativas falhas com "You've hit your session limit · resets 5:50pm (UTC)",
// e 14 delas eram FALLBACK REDUNDANTE — o OpenClaw tentava opus-4-8, depois opus-4-7, depois
// sonnet-4-6, mas o teto e da CONTA, nao do modelo. A cadeia de fallback protege contra 529 de um
// modelo especifico (comprovado: 529 no 4.8 caiu pro 4.7 e completou em 11s); contra limite de
// conta ela so acrescenta latencia e queima mais tentativa.
//
// Este modulo NAO substitui o fallback do OpenClaw: ele evita CHAMAR o gateway enquanto a conta
// esta sabidamente bloqueada, e registra ate quando.
//
// Uso:
//   import { bloqueada, registrarSaida, marcarOk } from "./quota.mjs";
//   const b = bloqueada(); if (b) { /* nao chame o agente */ }
//   ... depois de rodar `openclaw agent`, passe a saida:
//   if (registrarSaida(saida)) { /* era limite de conta; ja ficou registrado */ }

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

const DIR = process.env.QUOTA_DIR || resolve(homedir(), "logs-ops");
const ESTADO = resolve(DIR, "quota-state.json");
const LOG = resolve(DIR, "quota.log");

const PADRAO_LIMITE = /hit your (session|usage) limit|session limit ·|rate limit exceeded for your account/i;
// "resets 5:50pm (UTC)" | "resets 17:50" | "resets at 5:50 pm"
const PADRAO_RESET = /resets?\s*(?:at\s*)?(\d{1,2}):(\d{2})\s*(am|pm)?/i;

function registrar(msg) {
  const linha = `${new Date().toISOString()} ${msg}`;
  console.error(linha);
  try {
    mkdirSync(DIR, { recursive: true });
    appendFileSync(LOG, linha + "\n");
  } catch {}
}

// Converte "5:50pm (UTC)" no proximo instante UTC correspondente. O horario vem do proprio
// provedor, entao e a melhor estimativa disponivel — nao chutamos janela de 5h.
function proximoReset(h, m, ampm) {
  let hora = Number(h);
  if (ampm) {
    const pm = ampm.toLowerCase() === "pm";
    if (pm && hora < 12) hora += 12;
    if (!pm && hora === 12) hora = 0;
  }
  const agora = new Date();
  const alvo = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate(), hora, Number(m), 0, 0));
  if (alvo <= agora) alvo.setUTCDate(alvo.getUTCDate() + 1); // reset ja passou hoje => e amanha
  return alvo;
}

/** Se a conta esta bloqueada, devolve { ate: Date, restanteMin: number, motivo }. Senao, null. */
export function bloqueada() {
  let e;
  try {
    e = JSON.parse(readFileSync(ESTADO, "utf8"));
  } catch {
    return null;
  }
  if (!e || !e.ate) return null;
  const ate = new Date(e.ate);
  if (!(ate > new Date())) return null; // ja resetou
  return { ate, restanteMin: Math.ceil((ate - new Date()) / 60000), motivo: e.motivo || "limite de cota da conta" };
}

/**
 * Analisa a saida de um `openclaw agent`. Se for limite de CONTA, abre o circuito ate o reset
 * e devolve true. Qualquer outro erro (inclusive 529 de modelo) devolve false — esse o fallback
 * do OpenClaw resolve, e nao queremos bloquear a operacao por causa dele.
 */
export function registrarSaida(saida) {
  const txt = String(saida || "");
  if (!PADRAO_LIMITE.test(txt)) return false;
  const m = txt.match(PADRAO_RESET);
  // Sem horario explicito, a janela da Anthropic e de 5h — usamos isso como teto conservador.
  const ate = m ? proximoReset(m[1], m[2], m[3]) : new Date(Date.now() + 5 * 60 * 60 * 1000);
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(ESTADO, JSON.stringify({ ate: ate.toISOString(), motivo: "limite de cota da conta", em: new Date().toISOString() }, null, 2));
  } catch {}
  registrar(`COTA ESTOURADA — circuito aberto ate ${ate.toISOString()} (${m ? "reset informado pelo provedor" : "sem horario na msg, assumindo janela de 5h"}). Nao vou tentar outros modelos: o teto e da conta.`);
  return true;
}

/** Chamar apos uma resposta bem-sucedida: fecha o circuito se ele estiver aberto por engano. */
export function marcarOk() {
  const b = bloqueada();
  if (!b) return;
  try {
    writeFileSync(ESTADO, JSON.stringify({ ate: null, motivo: null, em: new Date().toISOString() }, null, 2));
  } catch {}
  registrar("Conta respondeu normalmente antes do reset previsto — circuito fechado.");
}
