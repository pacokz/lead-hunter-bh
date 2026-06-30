// Helper: posta no Discord via webhook (URL fica em ops/.webhook.txt, fora do git/chat).
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

export function webhookUrl() {
  try { return readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), ".webhook.txt"), "utf8").trim(); }
  catch { return null; }
}

export async function postDiscord(content, username = "Lead Hunter") {
  const url = webhookUrl();
  if (!url) { console.error("[discord] sem ops/.webhook.txt — post pulado. Conteúdo:\n" + content); return false; }
  const chunks = content.match(/[\s\S]{1,1900}/g) || [content];
  for (const c of chunks) {
    try {
      await fetch(url, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, content: c }) });
    } catch (e) { console.error("[discord] falha no post:", e.message); return false; }
  }
  return true;
}
