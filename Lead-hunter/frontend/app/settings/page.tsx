"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { getJSON, postJSON, Settings, Category, Region } from "@/lib/api";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 text-sm font-semibold text-slate-700">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["settings"], queryFn: () => getJSON<Settings>("/settings") });
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => getJSON<Category[]>("/categories") });
  const regions = useQuery({ queryKey: ["regions"], queryFn: () => getJSON<Region[]>("/regions") });

  const [catName, setCatName] = useState("");
  const [catPriority, setCatPriority] = useState(50);
  const [regName, setRegName] = useState("");

  const addCat = useMutation({
    mutationFn: () => postJSON("/categories", { name: catName, priority: catPriority }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); setCatName(""); },
  });
  const addReg = useMutation({
    mutationFn: () => postJSON("/regions", { name: regName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["regions"] }); setRegName(""); },
  });

  const s = settings.data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
      <p className="mt-1 text-sm text-slate-500">Parâmetros do sistema, categorias e regiões.</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Parâmetros">
          {s && (
            <>
              <Row label="Ambiente" value={s.app_env} />
              <Row label="Limite diário API" value={s.api_daily_limit} />
              <Row label="Limite mensal API" value={s.api_monthly_limit} />
              <Row label="Nota mínima" value={s.min_rating} />
              <Row label="Reviews mínimos" value={s.min_reviews} />
              <Row label="Score mínimo" value={s.min_score} />
              <Row
                label="Chave Google"
                value={
                  s.google_key_set ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600"><Check size={14} /> Configurada</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600"><X size={14} /> Ausente</span>
                  )
                }
              />
            </>
          )}
          <p className="mt-3 text-xs text-slate-400">A chave do Google fica só no backend (.env), nunca no frontend.</p>
        </Card>

        <Card title="Categorias (nichos)">
          <div className="mb-3 max-h-56 space-y-1 overflow-auto">
            {(categories.data || []).map((c) => (
              <div key={c.id} className="flex justify-between text-sm">
                <span className="text-slate-700">{c.name}</span>
                <span className="text-slate-400">{c.priority}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="nova categoria" className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <input type="number" value={catPriority} onChange={(e) => setCatPriority(Number(e.target.value))} className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <button onClick={() => addCat.mutate()} disabled={!catName || addCat.isPending} className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-40">+</button>
          </div>
        </Card>

        <Card title="Regiões de BH">
          <div className="mb-3 max-h-56 space-y-1 overflow-auto">
            {(regions.data || []).map((r) => (
              <div key={r.id} className="text-sm text-slate-700">{r.name}</div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="nova região" className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
            <button onClick={() => addReg.mutate()} disabled={!regName || addReg.isPending} className="rounded-lg bg-slate-900 px-3 py-1 text-sm text-white disabled:opacity-40">+</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
