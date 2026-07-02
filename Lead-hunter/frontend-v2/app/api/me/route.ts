import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { operatorFromEmail } from "@/lib/operators";

export const dynamic = "force-dynamic";

// Identidade do operador logado. Em produção o Cloudflare Access injeta o
// header cf-access-authenticated-user-email depois do login por PIN; em dev
// (sem Access) cai no fallback DEV_OPERATOR_EMAIL ou anônimo.
export async function GET() {
  const h = await headers();
  const email =
    h.get("cf-access-authenticated-user-email") ??
    process.env.DEV_OPERATOR_EMAIL ??
    null;

  const operator = operatorFromEmail(email);
  return NextResponse.json({
    email,
    operator,
    authenticated: !!h.get("cf-access-authenticated-user-email"),
  });
}
