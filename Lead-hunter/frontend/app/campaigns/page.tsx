"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getJSON, postJSON, Campaign } from "@/lib/api";

export default function CampaignsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["campaigns"], queryFn: () => getJSON<Campaign[]>("/campaigns") });

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [terms, setTerms] = useState("");
  const [regions, setRegions] = useState("");
  const [maxPages, setMaxPages] = useState(1);

  const create = useMutation({
    mutationFn: () =>
      postJSON<Campaign>("/campaigns", {
        name,
        category: category || null,
        terms: terms.split(",").map((t) => t.trim()).filter(Boolean),
        regions: regions.split(",").map((t) => t.trim()).filter(Boolean),
        max_pages: maxPages,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      setName("");
      setTerms("");
      setRegions("");
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Campanhas</h1>
      <p className="mt-1 text-sm text-slate-500">Crie campanhas de busca (termo × região).</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">Nova campanha</div>
          <div className="space-y-3">
            <Field label="Nome">
              <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="Clínicas Centro-Sul" />
            </Field>
            <Field label="Categoria">
              <input value={category} onChange={(e) => setCategory(e.target.value)} className="input" placeholder="clínica odontológica" />
            </Field>
            <Field label="Termos (separados por vírgula)">
              <input value={terms} onChange={(e) => setTerms(e.target.value)} className="input" placeholder="clínica odontológica, dentista" />
            </Field>
            <Field label="Regiões (separadas por vírgula)">
              <input value={regions} onChange={(e) => setRegions(e.target.value)} className="input" placeholder="Savassi, Lourdes" />
            </Field>
            <Field label="Máx. páginas">
              <input type="number" min={1} max={3} value={maxPages} onChange={(e) => setMaxPages(Number(e.target.value))} className="input w-24" />
            </Field>
            <button
              onClick={() => create.mutate()}
              disabled={!name || !terms || !regions || create.isPending}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {create.isPending ? "Criando…" : "Criar campanha"}
            </button>
            {create.error && <p className="text-sm text-red-600">{String(create.error)}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 text-sm font-semibold text-slate-700">Campanhas existentes</div>
          <div className="space-y-2">
            {(data || []).length === 0 && <p className="text-sm text-slate-400">Nenhuma campanha ainda.</p>}
            {(data || []).map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.category}</div>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{c.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}
