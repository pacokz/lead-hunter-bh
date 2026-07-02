"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-9 w-full rounded-ctrl border border-line bg-white px-3 text-sm text-ink",
          "placeholder:text-ink-faint transition-colors",
          "hover:border-ink-faint focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
          className
        )}
        {...props}
      />
    );
  }
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-ctrl border border-line bg-white px-3 py-2 text-sm text-ink",
        "placeholder:text-ink-faint transition-colors resize-y min-h-[72px]",
        "hover:border-ink-faint focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
        className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-ctrl border border-line bg-white px-2.5 pr-8 text-sm text-ink transition-colors",
        "hover:border-ink-faint focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20",
        "appearance-none bg-no-repeat bg-[right_8px_center]",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2371717A%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-ink-muted">{hint}</span>}
    </label>
  );
}
