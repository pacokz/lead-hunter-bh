"use client";

import { Database, ShieldAlert } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Badge } from "@/components/ui/badge";
import { OperatorAvatar } from "@/components/domain/operator";
import { useMe } from "@/lib/queries";

export function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const operator = me.data?.operator;

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-56">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-line bg-white/85 px-6 backdrop-blur">
          <Badge className="border-line bg-paper text-ink-muted" title="Conectado ao backend Lead Hunter (Supabase)">
            <Database className="h-3 w-3 text-violet-500" aria-hidden />
            Dados reais
          </Badge>
          {operator ? (
            <span
              className="flex items-center gap-2 text-xs text-ink-muted"
              title={me.data?.email ?? undefined}
            >
              Logado como
              <span className="flex items-center gap-1.5 font-medium text-ink">
                <OperatorAvatar id={operator.id} size="sm" />
                {operator.shortName}
              </span>
            </span>
          ) : me.isPending ? (
            <span className="text-xs text-ink-faint">...</span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-warn" title="Sem header do Cloudflare Access — ações não serão atribuídas">
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
              Sem identificação
            </span>
          )}
        </header>
        <main className="mx-auto min-h-[calc(100vh-48px)] max-w-[1440px] px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
