"use client";

import { Database } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-56">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-line bg-white/85 px-6 backdrop-blur">
          <Badge className="border-line bg-paper text-ink-muted" title="Conectado ao backend Lead Hunter (Supabase)">
            <Database className="h-3 w-3 text-violet-500" aria-hidden />
            Dados reais
          </Badge>
          <span className="text-xs text-ink-muted">Balmor · uso interno</span>
        </header>
        <main className="mx-auto min-h-[calc(100vh-48px)] max-w-[1440px] px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
