"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, MessageSquarePlus, Copy, Camera, X } from "lucide-react";
import { getJSON, postJSON, API, LeadContext, OutreachDraft } from "@/lib/api";
import { SiteBadge, BandBadge } from "@/components/badges";
import { FollowUpsPanel } from "@/components/follow-ups-panel";

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
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-800">{value ?? "—"}</span>
    </div>
  );
}

export default function LeadDetail() {
  const { placeId } = useParams<{ placeId: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["lead", placeId],
    queryFn: () => getJSON<LeadContext>(`/leads/${placeId}/context`),
  });
  const drafts = useQuery({
    queryKey: ["drafts", placeId],
    queryFn: () => getJSON<OutreachDraft[]>(`/leads/${placeId}/outreach`),
  });
  const genDraft = useMutation({
    mutationFn: () => postJSON(`/leads/${placeId}/outreach?channel=WHATSAPP`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drafts", placeId] }),
  });
  const runVisual = useMutation({
    mutationFn: () => postJSON(`/leads/${placeId}/audit?screenshots=true`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead", placeId] }),
  });
  const [zoom, setZoom] = useState<string | null>(null);

  return (
    <div>
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={14} /> Voltar
      </Link>

      {isLoading && <p className="mt-6 text-slate-500">Carregando…</p>}
      {error && <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">Erro: {String(error)}</p>}

      {data && (
        <>
          <div className="mt-3 flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{data.place.name}</h1>
            {data.score && <BandBadge value={data.score.band} />}
          </div>
          <p className="text-sm text-slate-500">
            {data.place.category} {data.pipeline_state && `· ${data.pipeline_state}`}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card title="Dados do Google">
              <Row label="Endereço" value={data.place.address} />
              <Row label="Telefone" value={data.place.phone} />
              <Row label="Nota" value={data.place.rating} />
              <Row label="Avaliações" value={data.place.reviews_count} />
              <Row label="Status" value={data.place.business_status} />
              <Row
                label="Instagram"
                value={data.place.instagram_handle ? `@${data.place.instagram_handle}` : null}
              />
              <div className="mt-3 flex gap-3 text-sm">
                {data.place.website && (
                  <a href={data.place.website} target="_blank" className="inline-flex items-center gap-1 text-blue-600">
                    Site <ExternalLink size={12} />
                  </a>
                )}
                {data.place.google_maps_uri && (
                  <a href={data.place.google_maps_uri} target="_blank" className="inline-flex items-center gap-1 text-blue-600">
                    Maps <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </Card>

            <Card title="Score de oportunidade">
              {data.score ? (
                <>
                  <div className="mb-3 flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900">{data.score.score}</span>
                    <span className="text-slate-400">/100</span>
                  </div>
                  <div className="space-y-2">
                    {data.score.components.map((c) => (
                      <div key={c.component}>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{c.component}</span>
                          <span>{c.value}/{c.weight}</span>
                        </div>
                        <div className="mt-0.5 h-2 rounded bg-slate-100">
                          <div
                            className="h-2 rounded bg-slate-800"
                            style={{ width: `${(c.value / c.weight) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">Sem score calculado.</p>
              )}
            </Card>

            <Card title="Auditoria do site">
              {data.audit ? (
                <>
                  <div className="mb-3"><SiteBadge value={data.audit.site_class} /></div>
                  <Row label="HTTPS" value={data.audit.https === null ? null : data.audit.https ? "Sim" : "Não"} />
                  <Row label="Responsivo" value={data.audit.responsive === null ? null : data.audit.responsive ? "Sim" : "Não"} />
                  <Row label="Status HTTP" value={data.audit.http_status} />
                  <Row label="Tempo de resposta" value={data.audit.response_time_s ? `${data.audit.response_time_s}s` : null} />
                  <Row label="Tem formulário" value={data.audit.has_form ? "Sim" : "Não"} />
                  <Row label="Tem WhatsApp" value={data.audit.has_whatsapp ? "Sim" : "Não"} />

                  <button
                    onClick={() => runVisual.mutate()}
                    disabled={runVisual.isPending}
                    className="mt-4 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    <Camera size={15} /> {runVisual.isPending ? "Capturando…" : "Rodar auditoria visual"}
                  </button>
                  {runVisual.isError && (
                    <p className="mt-2 text-xs text-red-600">Falha ao capturar. Tente de novo.</p>
                  )}

                  {data.audit.screenshots && data.audit.screenshots.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {data.audit.screenshots.map((s) => (
                        <figure key={s.viewport}>
                          <button
                            onClick={() => setZoom(`${API}${s.path}`)}
                            className="block w-full overflow-hidden rounded-lg border border-slate-200 hover:border-slate-400"
                            title="Clique para ampliar"
                          >
                            <img
                              src={`${API}${s.path}`}
                              alt={`Print ${s.viewport}`}
                              className="h-44 w-full bg-slate-50 object-cover object-top"
                            />
                          </button>
                          <figcaption className="mt-1 text-center text-xs capitalize text-slate-500">{s.viewport}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-slate-400">
                      Sem prints ainda — clique em “Rodar auditoria visual”.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400">Sem auditoria.</p>
              )}
            </Card>

            <Card title="Problemas encontrados">
              {data.audit && data.audit.issues.length > 0 ? (
                <ul className="space-y-2">
                  {data.audit.issues.map((i, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="font-medium text-slate-800">{i.type}</span>
                      <span className="ml-2 text-slate-500">{i.description}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">Nenhum problema registrado.</p>
              )}
            </Card>
          </div>

          <div className="mt-4">
            <Card title="Abordagem (rascunho para você enviar)">
              <button
                onClick={() => genDraft.mutate()}
                disabled={genDraft.isPending}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                <MessageSquarePlus size={15} /> {genDraft.isPending ? "Gerando…" : "Gerar rascunho (WhatsApp)"}
              </button>
              <div className="mt-4 space-y-3">
                {(drafts.data || []).length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum rascunho ainda.</p>
                )}
                {(drafts.data || []).map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">{d.channel} · {d.status}</span>
                      <button
                        onClick={() => navigator.clipboard?.writeText(d.text)}
                        className="inline-flex items-center gap-1 text-xs text-blue-600"
                      >
                        <Copy size={12} /> Copiar
                      </button>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-slate-700">{d.text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                Rascunho gerado por template — você revisa, ajusta e envia manualmente pelo seu WhatsApp/Instagram.
              </p>
            </Card>
          </div>

          <div className="mt-4">
            <FollowUpsPanel placeId={placeId} />
          </div>
        </>
      )}

      {zoom && (
        <div
          onClick={() => setZoom(null)}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/80 p-6"
        >
          <button
            onClick={() => setZoom(null)}
            className="fixed right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
          <img src={zoom} alt="Print ampliado" className="h-auto max-w-3xl rounded-lg shadow-2xl" />
        </div>
      )}
    </div>
  );
}
