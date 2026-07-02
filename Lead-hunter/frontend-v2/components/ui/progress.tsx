import { cn } from "@/lib/utils";

export function Progress({
  value,
  max,
  className,
  warnAt = 0.75,
}: {
  value: number;
  max: number;
  className?: string;
  warnAt?: number;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const color = pct >= 0.92 ? "bg-bad" : pct >= warnAt ? "bg-warn" : "bg-violet-500";
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line-soft", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}
