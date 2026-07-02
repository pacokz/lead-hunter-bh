"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { useCompleteFollowUp, useFollowUps } from "@/lib/queries";
import { fmtDateTime, fmtWeekday, isOverdue, isToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FollowUpAgenda } from "@/lib/types";

export default function FollowUpsPage() {
  const followUps = useFollowUps();
  const complete = useCompleteFollowUp();
  const { toast } = useToast();

  const pending = useMemo(
    () => (followUps.data ?? []).filter((f) => !f.done),
    [followUps.data]
  );

  const groups = useMemo(() => {
    const overdue = pending.filter((f) => f.scheduled_at && isOverdue(f.scheduled_at));
    const today = pending.filter((f) => f.scheduled_at && isToday(f.scheduled_at));
    const upcoming = pending.filter(
      (f) => !f.scheduled_at || (!isOverdue(f.scheduled_at) && !isToday(f.scheduled_at))
    );
    return [
      { label: "Atrasados", items: overdue },
      { label: "Hoje", items: today },
      { label: "Próximos", items: upcoming },
    ].filter((g) => g.items.length > 0);
  }, [pending]);

  async function markDone(fu: FollowUpAgenda) {
    await complete.mutateAsync(fu.id);
    toast("success", `Follow-up de ${fu.place_name ?? "lead"} concluído`);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Follow-ups"
        description="Agenda global dos próximos contatos — nada de lead esquecido. Agende novos no detalhe do lead."
      />

      {followUps.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      ) : followUps.isError ? (
        <ErrorState message={String(followUps.error)} onRetry={() => followUps.refetch()} />
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck2 className="h-5 w-5" aria-hidden />}
            title="Nenhum follow-up pendente"
            description="Agende follow-ups a partir do detalhe de um lead pra manter o ritmo de contato."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2
                className={cn(
                  "mb-2 font-display text-xs font-semibold uppercase tracking-wide",
                  group.label === "Atrasados"
                    ? "text-bad"
                    : group.label === "Hoje"
                      ? "text-violet-600"
                      : "text-ink-muted"
                )}
              >
                {group.label}
                <span className="tnum ml-1.5 font-sans font-normal text-ink-faint">
                  ({group.items.length})
                </span>
              </h2>
              <div className="space-y-2">
                {group.items.map((fu) => {
                  const overdue = fu.scheduled_at ? isOverdue(fu.scheduled_at) : false;
                  return (
                    <Card
                      key={fu.id}
                      className={cn(
                        "flex items-center gap-4 px-4 py-3",
                        overdue && "border-bad-line"
                      )}
                    >
                      <div className="w-24 shrink-0">
                        {fu.scheduled_at ? (
                          <>
                            <p className={cn("tnum text-sm font-semibold", overdue ? "text-bad" : "text-ink")}>
                              {fmtWeekday(fu.scheduled_at)}
                            </p>
                            <p className="tnum text-2xs text-ink-muted">
                              {fmtDateTime(fu.scheduled_at).split(" ").pop()}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-ink-faint">sem data</p>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/leads/${encodeURIComponent(fu.place_id)}`}
                          className="text-sm font-semibold text-ink hover:text-violet-600"
                        >
                          {fu.place_name ?? fu.place_id}
                        </Link>
                        <p className="truncate text-xs text-ink-muted">{fu.note ?? fu.type}</p>
                      </div>
                      <Button
                        size="sm"
                        loading={complete.isPending && complete.variables === fu.id}
                        onClick={() => markDone(fu)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Concluir
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
