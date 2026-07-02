import { cn } from "@/lib/utils";
import { operatorById } from "@/lib/operators";

const COLORS: Record<string, string> = {
  samuel: "bg-violet-500 text-white",
  jose: "bg-teal2 text-white",
};

export function OperatorAvatar({
  id,
  size = "md",
  className,
}: {
  id: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const op = operatorById(id);
  if (!op) return null;
  return (
    <span
      title={op.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold",
        COLORS[op.id] ?? "bg-ink-soft text-white",
        size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]",
        className
      )}
    >
      {op.initials}
    </span>
  );
}

export function OperatorTag({
  id,
  prefix,
  className,
}: {
  id: string | null | undefined;
  prefix?: string;
  className?: string;
}) {
  const op = operatorById(id);
  if (!op) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-ink-muted", className)}>
      <OperatorAvatar id={op.id} size="sm" />
      {prefix ? `${prefix} ` : ""}
      {op.shortName}
    </span>
  );
}
