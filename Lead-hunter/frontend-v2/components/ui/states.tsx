import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-line-soft text-ink-muted">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      {description && <p className="max-w-sm text-xs text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-14 text-center", className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-bad-bg text-bad">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="font-display text-sm font-semibold text-ink">Algo deu errado</p>
      <p className="max-w-sm text-xs text-ink-muted">
        {message ?? "Não conseguimos carregar os dados. Tente de novo."}
      </p>
      {onRetry && (
        <Button size="sm" onClick={onRetry} className="mt-2">
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function TableSkeleton({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0" aria-label="Carregando..." role="status">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-3 border-b border-line-soft px-3 py-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-1/4" : "w-1/12 flex-1")} />
          ))}
        </div>
      ))}
    </div>
  );
}
