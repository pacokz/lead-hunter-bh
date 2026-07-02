"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GripVertical, Instagram, KanbanSquare, Phone } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { SiteCategoryBadge } from "@/components/domain/badges";
import { useCrmBoard, usePromoteQualified, useSetCrmStage } from "@/lib/queries";
import { CRM_STAGE_ORDER, CRM_STAGES } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { CrmCard, CrmStage } from "@/lib/types";

export default function CrmPage() {
  const board = useCrmBoard();
  const setStage = useSetCrmStage();
  const promote = usePromoteQualified();
  const { toast } = useToast();

  const [dragged, setDragged] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<CrmStage | null>(null);

  const cards = board.data ?? [];

  const byStage = useMemo(() => {
    const map = new Map<CrmStage, CrmCard[]>();
    for (const stage of CRM_STAGE_ORDER) map.set(stage, []);
    for (const card of cards) {
      (map.get(card.stage) ?? map.get("NOVO")!).push(card);
    }
    for (const list of map.values()) list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    return map;
  }, [cards]);

  async function drop(stage: CrmStage) {
    setOverStage(null);
    if (!dragged) return;
    const card = cards.find((c) => c.place_id === dragged);
    setDragged(null);
    if (!card || card.stage === stage) return;
    await setStage.mutateAsync({ placeId: card.place_id, stage });
    toast("success", `${card.name} → ${CRM_STAGES[stage].label}`);
  }

  return (
    <div className="flex h-[calc(100vh-96px)] flex-col animate-fade-up">
      <PageHeader
        title="CRM"
        description="Arraste os cards entre estágios pra acompanhar cada negociação."
        action={
          <Button
            variant="primary"
            loading={promote.isPending}
            title="Move todos os leads ALTO POTENCIAL e PRIORIDADE que ainda não estão no CRM"
            onClick={async () => {
              const res = await promote.mutateAsync();
              toast(
                "success",
                res.promoted > 0
                  ? `${res.promoted} lead(s) promovido(s)`
                  : "Nenhum lead novo pra promover"
              );
            }}
          >
            Promover qualificados
          </Button>
        }
      />

      {board.isPending ? (
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-64 shrink-0 rounded-card" />
          ))}
        </div>
      ) : board.isError ? (
        <ErrorState message={String(board.error)} onRetry={() => board.refetch()} />
      ) : cards.length === 0 ? (
        <EmptyState
          icon={<KanbanSquare className="h-5 w-5" aria-hidden />}
          title="CRM vazio"
          description="Promova os leads qualificados (ALTO POTENCIAL e PRIORIDADE) pra eles aparecerem aqui."
          action={
            <Button
              size="sm"
              variant="primary"
              loading={promote.isPending}
              onClick={async () => {
                const res = await promote.mutateAsync();
                toast("success", `${res.promoted} lead(s) promovido(s)`);
              }}
            >
              Promover qualificados
            </Button>
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
                  {items.map((card) => (
                    <KanbanCard
                      key={card.place_id}
                      card={card}
                      dragging={dragged === card.place_id}
                      onDragStart={() => setDragged(card.place_id)}
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
  card,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  card: CrmCard;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label={`${card.name} — ${CRM_STAGES[card.stage].label}`}
      className={cn(
        "group cursor-grab rounded-ctrl border border-line bg-white p-2.5 shadow-card transition-all active:cursor-grabbing",
        dragging && "rotate-1 opacity-60 shadow-pop ring-2 ring-violet-400"
      )}
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
        <div className="min-w-0 flex-1">
          <Link
            href={`/leads/${encodeURIComponent(card.place_id)}`}
            className="block truncate text-sm font-semibold text-ink hover:text-violet-600"
            draggable={false}
          >
            {card.name}
          </Link>
          {card.phone && <p className="tnum text-2xs text-ink-muted">{card.phone}</p>}
        </div>
        {card.score !== null && (
          <span
            className={cn(
              "tnum shrink-0 rounded px-1.5 py-0.5 font-display text-xs font-bold",
              card.band === "PRIORIDADE" ? "bg-violet-500 text-white" : "bg-line-soft text-ink-soft"
            )}
          >
            {card.score}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <SiteCategoryBadge category={card.site_class} />
        <span className="flex items-center gap-1.5 text-ink-faint">
          {card.phone && <Phone className="h-3 w-3" aria-label="Tem telefone" />}
          {card.instagram_handle && <Instagram className="h-3 w-3" aria-label="Tem Instagram" />}
        </span>
      </div>
    </article>
  );
}
