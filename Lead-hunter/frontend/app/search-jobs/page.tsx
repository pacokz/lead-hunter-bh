"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJSON, postJSON, Job } from "@/lib/api";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  RUNNING: "bg-blue-100 text-blue-700",
  DONE: "bg-emerald-100 text-emerald-700",
  ERROR: "bg-red-100 text-red-700",
};

export default function JobsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["jobs"], queryFn: () => getJSON<Job[]>("/jobs") });

  const exec = useMutation({
    mutationFn: (id: number) => postJSON<Job>(`/jobs/${id}/execute`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["jobs"] }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Search Jobs</h1>
      <p className="mt-1 text-sm text-slate-500">Cada job é uma busca (termo × região × página).</p>

      {isLoading && <p className="mt-8 text-slate-500">Carregando…</p>}
      {error && <p className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">Erro: {String(error)}</p>}

      {data && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Termo</th>
                <th className="px-4 py-3">Região</th>
                <th className="px-4 py-3 text-center">Pág</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Resultados</th>
                <th className="px-4 py-3 text-right">Tentativas</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Nenhum job. Crie uma campanha primeiro.</td></tr>
              )}
              {data.map((j) => (
                <tr key={j.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{j.term}</td>
                  <td className="px-4 py-3 text-slate-600">{j.region}</td>
                  <td className="px-4 py-3 text-center">{j.page}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[j.status] || ""}`}>
                      {j.status}
                    </span>
                    {j.error && <div className="mt-1 max-w-xs truncate text-xs text-red-500" title={j.error}>{j.error}</div>}
                  </td>
                  <td className="px-4 py-3 text-right">{j.results_count}</td>
                  <td className="px-4 py-3 text-right">{j.attempts}</td>
                  <td className="px-4 py-3 text-right">
                    {j.status !== "DONE" && (
                      <button
                        onClick={() => exec.mutate(j.id)}
                        disabled={exec.isPending}
                        className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                      >
                        Executar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {exec.error && <p className="mt-3 text-sm text-red-600">{String(exec.error)}</p>}
    </div>
  );
}
