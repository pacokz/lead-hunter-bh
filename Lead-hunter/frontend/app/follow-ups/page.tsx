"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Phone, MessageCircle } from "lucide-react";
import { getJSON, postJSON, FollowUpAgenda } from "@/lib/api";

function fmt(dt: string | null): { label: string; overdue: boolean } {
  if (!dt) return { label: "sem data", overdue: false };
  const d = new Date(dt);
  const overdue = d.getTime() < Date.now();
  return {
    label: d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    overdue,
  };
}

export default function FollowUpsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["followups-upcoming"],
    queryFn: () => getJSON<FollowUpAgenda[]>("/follow-ups/upcoming"),
  });
  const done = useMutation({
    mutationFn: (id: number) => postJSON(`/follow-ups/${id}/done`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["followups-upcoming"] }),
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <CalendarClock className="text-slate-700" size={22} />
        <h1 className="text-2xl font-bold text-slate-900">Follow-ups pendentes</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Próximos retornos agendados, dos mais urgentes pros mais distantes. Não deixe lead quente esfriar.
      </p>

      {isLoading && <p className="mt-6 text-slate-500">Carregando…</p>}
      {error && <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">Erro: {String(error)}</p>}

      {data && data.length === 0 && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
          Nenhum follow-up pendente. 🎉
        </p>
      )}

      {data && data.length > 0 && (
        <div className="mt-6 space-y-2">
          {data.map((f) => {
            const { label, overdue } = fmt(f.scheduled_at);
            const Icon = f.type === "mensagem" ? MessageCircle : Phone;
            return (
              <div
                key={f.id}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4"
              >
                <span
                  className={`inline-flex w-28 shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${
                    overdue ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <CalendarClock size={12} /> {label}
                </span>
                <Icon size={16} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <Link href={`/leads/${f.place_id}`} className="font-medium text-slate-800 hover:text-blue-600">
                    {f.place_name || f.place_id}
                  </Link>
                  {f.note && <p className="truncate text-sm text-slate-500">{f.note}</p>}
                </div>
                {overdue && <span className="shrink-0 text-xs font-semibold text-red-600">atrasado</span>}
                <button
                  onClick={() => done.mutate(f.id)}
                  disabled={done.isPending}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Check size={14} /> Concluir
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
