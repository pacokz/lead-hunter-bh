"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Toast {
  id: number;
  kind: "success" | "error";
  message: string;
}

const Ctx = createContext<{ toast: (kind: Toast["kind"], message: string) => void }>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++counter.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2 rounded-card border bg-carbon px-3.5 py-2.5 text-sm text-white shadow-pop animate-fade-up",
              t.kind === "success" ? "border-carbon-line" : "border-bad"
            )}
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-violet-300" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 text-red-400" aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  return useContext(Ctx);
}
