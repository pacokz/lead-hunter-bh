"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GripVertical, KanbanSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { SiteCategoryBadge } from "@/components/domain/badges";
import { OperatorAvatar } from "@/components/domain/operator";
import { useLeads, useSetCrmStage } from "@/lib/queries";
import { useOperator } from "@/lib/operator";
import { CRM_STAGE_ORDER, CRM_STAGES, OPERATORS, OPERATOR_LIST } from "@/lib/domain";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CrmStage, Lead, OperatorId } from "@/lib/types";
import { Select } from "@/components/ui/input";

const ALL = "__all__";

export default function CrmPage() {
  const leads = useLeads();
  const setStage = useSetCrmStage();
  const { operatorId } = useOperator();
  const { toast } = useToast();

  const [ownerFilter, setOwnerFilter] = useState<string>(ALL);
  const [dragged, setDragged] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<CrmStage | null>(null);

  const cards = useMemo(
    () =>
      (leads.data ?? []).filter(
        (l) => l.crm && (ownerFilter === ALL || l.crm.owner === ownerFilter)
      ),
    [leads.data, ownerFilter]
  );

  const byStage = useMemo(() => {
    const map = new Map<CrmStage, Lead[]>();
    for (const stage of CRM_STAGE_ORDER) map.set(stage, []);
    for (const lead of cards) map.get(lead.crm!.stage)!.push(lead);
    return map;
  }, [cards]);

  async function drop(stage: CrmStage) {
    setOverStage(null);
    if (!dragged) return;
    const lead = cards.find((l) => l.id === dragged);
    setDragged(null);
    if (!lead || lead.crm!.stage === stage) return;
    await setStage.mutateAsync({ leadId: lead.id, stage, by: operatorId });
    toast(
      "success",
      `${lead.name} → ${CRM_STAGES[stage].label} (por ${OPERATORS[operatorId].shortName})`
    );
  }

  return (
    <div className="flex h-[calc(100vh-96px)] flex-col animate-fade-up">
      <PageHeader
        title="CRM"
        description="Arraste os cards entre estágios. Toda movimentação fica atribuída ao operador ativo."
        action={
          <Select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filtrar por responsável"
          >
            <option value={ALL}>Todos os responsáveis</option>
            {OPERATOR_LIST.map((op) => (
              <option key={op.id} value={op.id}>Só {op.shortName}</option>
            ))}
          </Select>
        }
      />

      {leads.isPending ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-64 shrink-0 rounded-card" />
          ))}
        </div>
      ) : leads.isError ? (
        <ErrorState onRetry={() => leads.refetch()} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare className="h-5 w-5" aria-hidden />}
          title="CRM vazio"
          description="Promova leads quentes na tela de Leads pra eles aparecerem aqui."
          action={
            <Link
              href="/leads"
              className="rounded-ctrl bg-violet-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600"
            >
              Ir pra Leads
            </Link>
          }
        />
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {CRM_STAGE_ORDER.map((stage) => {
            const items = byStage.get(stage)!;
            const isOver = overStage === stage;
            return (
              <section
                key={stage}
                aria-label={`Coluna ${CRM_STAGES[stage].label}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverStage(stage);
                }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={() => drop(stage)}
                className={cn(
                  "flex w-64 shrink-0 flex-col rounded-card border bg-paper/60 transition-colors",
                  isOver ? "border-violet-400 bg-violet-50/70" : "border-line"
                )}
              >
                <header className="flex items-center justify-between px-3 py-2.5">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {CRM_STAGES[stage].label}
                  </h2>
                  <span className="tnum rounded-full bg-line px-1.5 text-2xs font-semibold text-ink-muted">
                    {items.length}
                  </span>
                </header>
                <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2 scrollbar-thin">
                  {items.length === 0 && (
                    <p className="px-2 py-4 text-center text-2xs text-ink-faint">
                      {isOver ? "Solte aqui" : "Vazio"}
                    </p>
                  )}
                  {items.map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      dragging={dragged === lead.id}
                      onDragStart={() => setDragged(lead.id)}
                      onDragEnd={() => {
                        setDragged(null);
                        setOverStage(null);
                      }}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  lead,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const crm = lead.crm!;
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${lead.name} — ${CRM_STAGES[crm.stage].label}, responsável ${OPERATORS[crm.owner].shortName}`}
      className={cn(
        "group cursor-grab rounded-ctrl border border-line bg-white p-2.5 shadow-card transition-all active:cursor-grabbing",
        dragging && "rotate-1 opacity-60 shadow-pop ring-2 ring-violet-400"
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${lead.id}`}
            className="block truncate text-sm font-semibold text-ink hover:text-violet-600"
            draggable={false}
          >
            {lead.name}
          </Link>
          <p className="text-2xs text-ink-muted">
            {lead.category} · {lead.region}
          </p>
        </div>
        {lead.score && (
          <span
            className={cn(
              "tnum shrink-0 rounded px-1.5 py-0.5 font-display text-xs font-bold",
              lead.score.band === "PRIORIDADE"
                ? "bg-violet-500 text-white"
                : "bg-line-soft text-ink-soft"
            )}
          >
            {lead.score.total}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <SiteCategoryBadge category={lead.audit?.category} />
        <div className="flex items-center gap-1.5">
          <span className="text-2xs text-ink-faint">{fmtRelative(crm.stageChangedAt)}</span>
          <OperatorAvatar id={crm.owner} size="sm" />
        </div>
      </div>
    </article>
  );
}
