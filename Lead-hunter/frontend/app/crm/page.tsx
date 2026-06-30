"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJSON, postJSON, CrmCard } from "@/lib/api";
import { SiteBadge } from "@/components/badges";

const STAGES: { key: string; label: string }[] = [
  { key: "NOVO", label: "Novo" },
  { key: "QUALIFICADO", label: "Qualificado" },
  { key: "DEMO_PRONTA", label: "Demo pronta" },
  { key: "CONTATO_PENDENTE", label: "Contato pendente" },
  { key: "CONTATADO", label: "Contatado" },
  { key: "FOLLOW_UP", label: "Follow-up" },
  { key: "RESPONDEU", label: "Respondeu" },
  { key: "REUNIAO", label: "Reunião" },
  { key: "GANHO", label: "Ganho" },
  { key: "PERDIDO", label: "Perdido" },
];

export default function CrmPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["crm"], queryFn: () => getJSON<CrmCard[]>("/crm") });

  const promote = useMutation({
    mutationFn: () => postJSON("/crm/promote"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) =>
      postJSON(`/leads/${id}/crm/stage?stage=${stage}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm"] }),
  });

  const byStage = (stage: string) => (data || []).filter((c) => c.stage === stage);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="mt-1 text-sm text-slate-500">Pipeline comercial — {data?.length ?? 0} leads.</p>
        </div>
        <button
          onClick={() => promote.mutate()}
          disabled={promote.isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {promote.isPending ? "Promovendo…" : "Promover leads quentes"}
        </button>
      </div>

      {isLoading && <p className="mt-8 text-slate-500">Carregando…</p>}

      <div className="mt-6 flex gap-3 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const cards = byStage(s.key);
          return (
            <div key={s.key} className="flex w-64 shrink-0 flex-col rounded-xl bg-slate-100 p-2">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold uppercase text-slate-500">{s.label}</span>
                <span className="text-xs text-slate-400">{cards.length}</span>
              </div>
              <div className="space-y-2">
                {cards.map((c) => (
                  <div key={c.place_id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <Link href={`/leads/${c.place_id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600">
                      {c.name}
                    </Link>
                    <div className="mt-2 flex items-center gap-2">
                      {c.score != null && (
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-white">{c.score}</span>
                      )}
                      <SiteBadge value={c.site_class} />
                    </div>
                    {c.phone && <div className="mt-1 text-xs text-slate-500">{c.phone}</div>}
                    <select
                      value={c.stage}
                      onChange={(e) => move.mutate({ id: c.place_id, stage: e.target.value })}
                      className="mt-2 w-full rounded border border-slate-200 px-1 py-1 text-xs text-slate-600"
                    >
                      {STAGES.map((st) => (
                        <option key={st.key} value={st.key}>{st.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
