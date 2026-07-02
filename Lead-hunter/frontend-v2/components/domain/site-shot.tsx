// Miniatura ilustrativa de site (wireframe em CSS puro, determinística por seed).
// Deixa claro que é mock: nunca renderiza conteúdo real, só a estrutura.

import { cn } from "@/lib/utils";

const PALETTES = [
  ["#7C3AED", "#EDE4FD"],
  ["#0F766E", "#CCFBF1"],
  ["#B45309", "#FEF3C7"],
  ["#BE185D", "#FCE7F3"],
  ["#0369A1", "#E0F2FE"],
  ["#15803D", "#DCFCE7"],
];

export function SiteShot({
  seed = 0,
  variant = "desktop",
  className,
  label,
}: {
  seed?: number;
  variant?: "desktop" | "mobile";
  className?: string;
  label?: string;
}) {
  const [accent, tint] = PALETTES[seed % PALETTES.length];
  const heroLeft = seed % 2 === 0;

  return (
    <div
      aria-label={label ?? "Prévia ilustrativa (mock)"}
      role="img"
      className={cn(
        "relative overflow-hidden rounded-ctrl border border-line bg-white",
        variant === "desktop" ? "aspect-[16/10]" : "aspect-[9/16]",
        className
      )}
    >
      <div className="flex h-[12%] min-h-4 items-center gap-1 border-b border-line-soft px-2">
        <span className="h-1.5 w-6 rounded-full" style={{ background: accent }} />
        <span className="ml-auto h-1 w-4 rounded-full bg-line" />
        <span className="h-1 w-4 rounded-full bg-line" />
        <span className="h-1.5 w-5 rounded-sm" style={{ background: accent, opacity: 0.85 }} />
      </div>
      <div
        className={cn(
          "flex h-[42%] items-center gap-2 px-2 py-1.5",
          heroLeft ? "flex-row" : "flex-row-reverse"
        )}
        style={{ background: tint }}
      >
        <div className="flex-1 space-y-1">
          <span className="block h-2 w-4/5 rounded-full bg-ink/70" />
          <span className="block h-1.5 w-3/5 rounded-full bg-ink/30" />
          <span className="mt-1.5 block h-2 w-8 rounded-sm" style={{ background: accent }} />
        </div>
        <div className="h-4/5 w-2/5 rounded-md bg-white/70" />
      </div>
      <div className="grid grid-cols-3 gap-1.5 px-2 py-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-0.5 rounded-sm border border-line-soft p-1">
            <span className="block h-3 w-full rounded-sm bg-line-soft" />
            <span className="block h-1 w-4/5 rounded-full bg-line" />
          </div>
        ))}
      </div>
      {variant === "mobile" && (
        <div className="space-y-1 px-2">
          <span className="block h-1 w-full rounded-full bg-line-soft" />
          <span className="block h-1 w-5/6 rounded-full bg-line-soft" />
          <span className="block h-2 w-10 rounded-sm" style={{ background: accent }} />
        </div>
      )}
      <span className="absolute bottom-1 right-1 rounded-sm bg-carbon/80 px-1 py-px text-[8px] font-medium uppercase tracking-wide text-white">
        mock
      </span>
    </div>
  );
}
