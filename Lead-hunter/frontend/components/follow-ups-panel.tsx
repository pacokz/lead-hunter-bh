"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Trash2, Plus, MessageSquare } from "lucide-react";
import { getJSON, postJSON, FollowUp, Interaction } from "@/lib/api";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
async function del(path: string) {
  const r = await fetch(`${API}${path}`, { method: "DELETE" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

function fmt(dt: string | null) {
  if (!dt) return { label: "sem data", overdue: false };
  const d = new Date(dt);
  return {
    label: d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    overdue: d.getTime() < Date.now(),
  };
}

export function FollowUpsPanel({ placeId }: { placeId: string }) {
  const qc = useQueryClient();
  const fkey = ["followups", placeId];
  const ikey = ["interactions", placeId];

  const followups = useQuery({ queryKey: fkey, queryFn: () => getJSON<FollowUp[]>(`/leads/${placeId}/follow-ups`) });
  const interactions = useQuery({ queryKey: ikey, queryFn: () => getJSON<Interaction[]>(`/leads/${placeId}/interactions`) });

  // form follow-up
  const [type, setType] = useState("call");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const createFU = useMutation({
    mutationFn: () =>
      postJSON(`/leads/${placeId}/follow-ups`, {
        type,
        // datetime-local é hora local sem fuso; converte pra ISO com fuso pra não deslocar na volta
        scheduled_at: when ? new Date(when).toISOString() : null,
        note: note || null,
      }),
    onSuccess: () => {
      setWhen(""); setNote("");
      qc.invalidateQueries({ queryKey: fkey });
      qc.invalidateQueries({ queryKey: ["followups-upcoming"] });
    },
  });
  const doneFU = useMutation({
    mutationFn: (id: number) => postJSON(`/follow-ups/${id}/done`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: fkey }); qc.invalidateQueries({ queryKey: ["followups-upcoming"] }); },
  });
  const delFU = useMutation({
    mutationFn: (id: number) => del(`/follow-ups/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: fkey }); qc.invalidateQueries({ queryKey: ["followups-upcoming"] }); },
  });

  // form interação
  const [channel, setChannel] = useState("WHATSAPP");
  const [direction, setDirection] = useState("outbound");
  const [content, setContent] = useState("");
  const logIt = useMutation({
    mutationFn: () => postJSON(`/leads/${placeId}/interactions`, { channel, direction, content: content || null }),
    onSuccess: () => {
      setContent("");
      qc.invalidateQueries({ queryKey: ikey });
      // faz o lead subir pra aba "Contatados" na tela de Leads
      qc.invalidateQueries({ queryKey: ["ranked"] });
    },
  });

  const inputCls = "rounded-lg border border-slate-300 px-2 py-1.5 text-sm";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Follow-ups */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <CalendarClock size={15} /> Follow-ups
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
            <option value="call">Ligação</option>
            <option value="mensagem">Mensagem</option>
          </select>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
          <input
            placeholder="Sobre o quê? (ex: confirmar se viu a demo)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputCls} min-w-[180px] flex-1`}
          />
          <button
            onClick={() => createFU.mutate()}
            disabled={createFU.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Plus size={14} /> Agendar
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {(followups.data || []).length === 0 && <p className="text-sm text-slate-400">Nenhum follow-up.</p>}
          {(followups.data || []).map((f) => {
            const { label, overdue } = fmt(f.scheduled_at);
            return (
              <div key={f.id} className={`flex items-center gap-2 rounded-lg border p-2 ${f.done ? "border-slate-100 bg-slate-50 opacity-60" : "border-slate-200"}`}>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${overdue && !f.done ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>{label}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  <span className="text-slate-400">{f.type === "mensagem" ? "msg" : "call"} · </span>
                  {f.done ? <span className="line-through">{f.note}</span> : f.note || <span className="text-slate-400">—</span>}
                </span>
                {!f.done && (
                  <button onClick={() => doneFU.mutate(f.id)} title="Concluir" className="rounded p-1 text-emerald-600 hover:bg-emerald-50">
                    <Check size={15} />
                  </button>
                )}
                <button onClick={() => delFU.mutate(f.id)} title="Excluir" className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interações */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MessageSquare size={15} /> Contatos registrados
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <select value={channel} onChange={(e) => setChannel(e.target.value)} className={inputCls}>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="EMAIL">E-mail</option>
          </select>
          <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputCls}>
            <option value="outbound">Eu → lead</option>
            <option value="inbound">Lead → eu</option>
          </select>
          <input
            placeholder="O que rolou? (ex: mandei a prévia)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={`${inputCls} min-w-[180px] flex-1`}
          />
          <button
            onClick={() => logIt.mutate()}
            disabled={logIt.isPending || !content}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Plus size={14} /> Registrar
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {(interactions.data || []).length === 0 && <p className="text-sm text-slate-400">Nenhum contato registrado.</p>}
          {(interactions.data || []).map((it) => {
            const { label } = fmt(it.created_at);
            return (
              <div key={it.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-sm">
                <span className="text-xs font-medium text-slate-500">
                  {label} · {it.channel || "—"} · {it.direction === "inbound" ? "recebido" : "enviado"}
                </span>
                {it.content && <p className="text-slate-700">{it.content}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
