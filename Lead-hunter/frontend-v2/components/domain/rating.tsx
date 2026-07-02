import { Star } from "lucide-react";
import { fmtInt } from "@/lib/format";

export function Rating({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <span className="tnum text-sm font-semibold text-ink">{rating.toFixed(1)}</span>
      <span className="tnum text-xs text-ink-muted">({fmtInt(reviews)})</span>
    </span>
  );
}
