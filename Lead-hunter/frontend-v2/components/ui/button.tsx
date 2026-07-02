"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-violet-500 text-white hover:bg-violet-600 active:bg-violet-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
  secondary:
    "bg-white text-ink border border-line hover:border-ink-faint hover:bg-paper active:bg-line-soft",
  ghost: "bg-transparent text-ink-soft hover:bg-line-soft hover:text-ink",
  danger: "bg-white text-bad border border-bad-line hover:bg-bad-bg",
  dark: "bg-carbon text-white hover:bg-carbon-raised border border-carbon-line",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "secondary", size = "md", loading, disabled, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-ctrl font-medium transition-colors select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
