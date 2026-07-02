import { cn } from "@/lib/utils";
import type { ScoreBand } from "@/lib/types";

const bandColors: Record<ScoreBand, string> = {
  PRIORIDADE: "#7C3AED",
  ALTO_POTENCIAL: "#15803D",
  REVISAR: "#B45309",
  BAIXO_POTENCIAL: "#A1A1AA",
  DESCARTAR: "#B91C1C",
};

export function ScoreRing({
  score,
  band,
  size = 44,
  className,
}: {
  score: number;
  band: ScoreBand;
  size?: number;
  className?: string;
}) {
  const stroke = size >= 60 ? 5 : 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = bandColors[band];

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Score ${score} de 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEEEF0" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c - filled}`}
        />
      </svg>
      <span
        className="tnum absolute font-display font-bold text-ink"
        style={{ fontSize: size >= 60 ? 18 : 13 }}
      >
        {score}
      </span>
    </div>
  );
}
