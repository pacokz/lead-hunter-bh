"use client";

import { useQuery } from "@tanstack/react-query";
import { getJSON, Stats } from "@/lib/api";
import { SITE_LABELS, BAND_LABELS } from "@/components/badges";

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent || "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stats"],
    queryFn: () => getJSON<Stats>("/stats"),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Visão geral da operação de prospecção.</p>

      {isLoading && <p className="mt-8 text-slate-500">Carregando…</p>}
      {error && (
        <p className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar. A API está rodando em :8000? ({String(error)})
        </p>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Total de empresas" value={data.total_places} />
            <Stat label="Sem site" value={data.sem_site} accent="text-amber-600" />
            <Stat label="Sites ruins (oportunidade)" value={data.sites_ruins} accent="text-orange-600" />
            <Stat label="Prioritários" value={data.prioritarios} accent="text-emerald-600" />
            <Stat label="Auditados" value={data.audited} />
            <Stat label="Com score" value={data.scored} />
            <Stat label="Campanhas" value={data.campaigns} />
            <Stat label="Jobs com erro" value={data.jobs_error} accent={data.jobs_error ? "text-red-600" : undefined} />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-700">Uso da API Google</div>
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-slate-500">Hoje</span>
                <span className="font-medium">{data.api_today}</span>
              </div>
              <div className="mt-1 flex justify-between text-sm">
                <span className="text-slate-500">Mês</span>
                <span className="font-medium">{data.api_month}</span>
              </div>
            </div>

            <Breakdown title="Por status de site" data={data.by_site_class} labels={SITE_LABELS} />
            <Breakdown title="Por faixa de score" data={data.by_band} labels={BAND_LABELS} />
          </div>
        </>
      )}
    </div>
  );
}

function Breakdown({
  title,
  data,
  labels,
}: {
  title: string;
  data: Record<string, number>;
  labels: Record<string, string>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="text-sm font-semibold text-slate-700">{title}</div>
      <div className="mt-3 space-y-1">
        {entries.length === 0 && <div className="text-sm text-slate-400">Sem dados ainda.</div>}
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between text-sm">
            <span className="text-slate-500">{labels[k] || k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
