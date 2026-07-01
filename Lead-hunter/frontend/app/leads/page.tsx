"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getJSON, RankedLead } from "@/lib/api";
import { SiteBadge, BandBadge, BAND_LABELS, SITE_LABELS } from "@/components/badges";

const PAGE_SIZE = 50;

export default function LeadsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ranked"],
    queryFn: () => getJSON<RankedLead[]>("/leads/ranked?limit=1000"),
  });

  const [search, setSearch] = useState("");
  const [band, setBand] = useState("");
  const [site, setSite] = useState("");
  const [niche, setNiche] = useState("");
  const [page, setPage] = useState(1);

  const niches = useMemo(() => {
    const set = new Set<string>();
    for (const l of data || []) if (l.category) set.add(l.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);

  const filtered = useMemo(() => {
    return (data || []).filter((l) => {
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (band && l.band !== band) return false;
      if (site && l.site_class !== site) return false;
      if (niche && l.category !== niche) return false;
      return true;
    });
  }, [data, search, band, site, niche]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  // volta pra primeira página sempre que um filtro muda
  useEffect(() => setPage(1), [search, band, site, niche]);
  // corrige a página se o total encolher (ex.: filtro reduziu resultados)
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const from = filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, filtered.length);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
      <p className="mt-1 text-sm text-slate-500">Ranqueados por score de oportunidade.</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <input
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select value={band} onChange={(e) => setBand(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todas as faixas</option>
          {Object.entries(BAND_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={site} onChange={(e) => setSite(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todos os sites</option>
          {Object.entries(SITE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={niche} onChange={(e) => setNiche(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          <option value="">Todos os nichos</option>
          {niches.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <span className="ml-auto self-center text-sm text-slate-500">{filtered.length} leads</span>
      </div>

      {isLoading && <p className="mt-8 text-slate-500">Carregando…</p>}
      {error && <p className="mt-8 rounded-lg bg-red-50 p-4 text-sm text-red-700">Erro: {String(error)}</p>}

      {data && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Faixa</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3 text-right">Nota</th>
                <th className="px-4 py-3 text-right">Reviews</th>
                <th className="px-4 py-3">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paged.map((l) => (
                <tr key={l.place_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{l.score}</td>
                  <td className="px-4 py-3"><BandBadge value={l.band} /></td>
                  <td className="px-4 py-3">
                    <Link href={`/leads/${l.place_id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {l.name}
                    </Link>
                    {l.instagram_handle && <span className="ml-2 text-xs text-fuchsia-600">@{l.instagram_handle}</span>}
                  </td>
                  <td className="px-4 py-3"><SiteBadge value={l.site_class} /></td>
                  <td className="px-4 py-3 text-right">{l.rating ?? "—"}</td>
                  <td className="px-4 py-3 text-right">{l.reviews_count ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{l.phone || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">
            {from}–{to} de {filtered.length}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-slate-50"
            >
              Anterior
            </button>
            <span className="text-sm text-slate-600">
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:bg-slate-50"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
