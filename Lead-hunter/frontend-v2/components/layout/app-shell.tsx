"use client";

import { FlaskConical } from "lucide-react";
import { Sidebar } from "./sidebar";
import { OperatorPicker } from "@/components/domain/operator";
import { useOperator } from "@/lib/operator";
import { Badge } from "@/components/ui/badge";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { operatorId, setOperatorId } = useOperator();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="pl-56">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-line bg-white/85 px-6 backdrop-blur">
          <Badge className="border-warn-line bg-warn-bg text-warn" title="Todos os dados exibidos são fictícios — contratos estubados">
            <FlaskConical className="h-3 w-3" aria-hidden />
            Dados mock
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-muted">Operando como</span>
            <OperatorPicker value={operatorId} onChange={setOperatorId} />
          </div>
        </header>
        <main className="mx-auto min-h-[calc(100vh-48px)] max-w-[1440px] px-6 py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
