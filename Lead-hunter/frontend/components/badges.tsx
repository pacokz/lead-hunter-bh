export const SITE_LABELS: Record<string, string> = {
  SEM_SITE: "Sem site",
  FORA_DO_AR: "Fora do ar",
  REDE_SOCIAL: "Só rede social",
  SITE_OBSOLETO: "Obsoleto",
  SITE_FRACO: "Fraco",
  SITE_RAZOAVEL: "Razoável",
  SITE_BOM: "Bom",
};

export const BAND_LABELS: Record<string, string> = {
  PRIORIDADE: "Prioridade",
  ALTO_POTENCIAL: "Alto potencial",
  REVISAR: "Revisar",
  BAIXO_POTENCIAL: "Baixo potencial",
  DESCARTAR: "Descartar",
};

const SITE_COLORS: Record<string, string> = {
  SEM_SITE: "bg-amber-100 text-amber-800",
  FORA_DO_AR: "bg-red-100 text-red-800",
  REDE_SOCIAL: "bg-fuchsia-100 text-fuchsia-800",
  SITE_OBSOLETO: "bg-orange-100 text-orange-800",
  SITE_FRACO: "bg-yellow-100 text-yellow-800",
  SITE_RAZOAVEL: "bg-slate-100 text-slate-700",
  SITE_BOM: "bg-emerald-100 text-emerald-800",
};

const BAND_COLORS: Record<string, string> = {
  PRIORIDADE: "bg-red-600 text-white",
  ALTO_POTENCIAL: "bg-emerald-600 text-white",
  REVISAR: "bg-amber-500 text-white",
  BAIXO_POTENCIAL: "bg-slate-400 text-white",
  DESCARTAR: "bg-slate-200 text-slate-600",
};

export function SiteBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-slate-400">—</span>;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SITE_COLORS[value] || "bg-slate-100"}`}>
      {SITE_LABELS[value] || value}
    </span>
  );
}

export function BandBadge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BAND_COLORS[value] || "bg-slate-100"}`}>
      {BAND_LABELS[value] || value}
    </span>
  );
}
