"use client";

import { cn } from "@/lib/utils";
import { OPERATORS, OPERATOR_LIST } from "@/lib/domain";
import type { OperatorId } from "@/lib/types";

const colors: Record<OperatorId, string> = {
  samuel: "bg-violet-500 text-white",
  jose: "bg-teal2 text-white",
};

export function OperatorAvatar({
  id,
  size = "md",
  className,
}: {
  id: OperatorId;
  size?: "sm" | "md";
  className?: string;
}) {
  const op = OPERATORS[id];
  return (
    <span
      title={op.name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold",
        colors[id],
        size === "sm" ? "h-5 w-5 text-[9px]" : "h-6 w-6 text-[10px]",
        className
      )}
    >
      {op.initials}
    </span>
  );
}

export function OperatorTag({ id, prefix }: { id: OperatorId; prefix?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
      <OperatorAvatar id={id} size="sm" />
      {prefix ? `${prefix} ` : ""}
      {OPERATORS[id].shortName}
    </span>
  );
}

export function OperatorPicker({
  value,
  onChange,
  compact,
}: {
  value: OperatorId;
  onChange: (id: OperatorId) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Responsável"
      className="inline-flex items-center gap-0.5 rounded-ctrl bg-line-soft p-0.5"
    >
      {OPERATOR_LIST.map((op) => {
        const active = op.id === value;
        return (
          <button
            key={op.id}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(op.id)}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-xs font-medium transition-colors",
              active ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"
            )}
          >
            <OperatorAvatar id={op.id} size="sm" />
            {!compact && op.shortName}
          </button>
        );
      })}
    </div>
  );
}
