"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck2, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { OperatorAvatar, OperatorTag } from "@/components/domain/operator";
import { useCompleteFollowUp, useFollowUps } from "@/lib/queries";
import { useOperator } from "@/lib/operator";
import { OPERATOR_LIST } from "@/lib/domain";
import { fmtDateTime, fmtWeekday, isOverdue, isToday } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FollowUp } from "@/lib/types";

const ALL = "__all__";
type Tab = "pending" | "done";

export default function FollowUpsPage() {
  const followUps = useFollowUps();
  const complete = useCompleteFollowUp();
  const { operatorId } = useOperator();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("pending");
  const [owner, setOwner] = useState<string>(ALL);

  const filtered = useMemo(
    () =>
      (followUps.data ?? []).filter(
        (f) => (tab === "pending" ? !f.done : f.done) && (owner === ALL || f.owner === owner)
      ),
    [followUps.data, tab, owner]
  );

  const pendingCount = (followUps.data ?? []).filter((f) => !f.done).length;
  const doneCount = (followUps.data ?? []).filter((f) => f.done).length;

  const groups = useMemo(() => {
    if (tab === "done") return [{ label: "Concluídos", items: filtered }];
    const overdue = filtered.filter((f) => isOverdue(f.dueAt));
    const today = filtered.filter((f) => isToday(f.dueAt));
    const upcoming = filtered.filter((f) => !isOverdue(f.dueAt) && !isToday(f.dueAt));
    return [
      { label: "Atrasados", items: overdue },
      { label: "Hoje", items: today },
      { label: "Próximos", items: upcoming },
    ].filter((g) => g.items.length > 0);
  }, [filtered, tab]);

  async function markDone(fu: FollowUp) {
    await complete.mutateAsync({ id: fu.id, by: operatorId });
    toast("success", `Follow-up de ${fu.leadName} concluído`);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Follow-ups"
        description="Agenda global dos próximos contatos — nada de lead esquecido."
        action={
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Filtrar por responsável">
            <option value={ALL}>Todos os responsáveis</option>
            {OPERATOR_LIST.map((op) => (
              <option key={op.id} value={op.id}>Só {op.shortName}</option>
            ))}
          </Select>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "pending", label: "Pendentes", count: pendingCount },
          { value: "done", label: "Concluídos", count: doneCount },
        ]}
        className="mb-4"
      />

      {followUps.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-card" />
          ))}
        </div>
      ) : followUps.isError ? (
        <ErrorState onRetry={() => followUps.refetch()} />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CalendarCheck2 className="h-5 w-5" aria-hidden />}
            title={tab === "pending" ? "Nenhum follow-up pendente" : "Nada concluído ainda"}
            description={
              tab === "pending"
                ? "Agende follow-ups a partir do detalhe de um lead pra manter o ritmo de contato."
                : "Os follow-ups marcados como feitos aparecem aqui."
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h2
                className={cn(
                  "mb-2 font-display text-xs font-semibold uppercase tracking-wide",
                  group.label === "Atrasados" ? "text-bad" : group.label === "Hoje" ? "text-violet-600" : "text-ink-muted"
                )}
              >
                {group.label}
                <span className="tnum ml-1.5 font-sans font-normal text-ink-faint">
                  ({group.items.length})
                </span>
              </h2>
              <div className="space-y-2">
                {group.items.map((fu) => (
                  <Card
                    key={fu.id}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3",
                      !fu.done && isOverdue(fu.dueAt) && "border-bad-line"
                    )}
                  >
                    <div className="w-24 shrink-0">
                      <p
                        className={cn(
                          "tnum text-sm font-semibold",
                          !fu.done && isOverdue(fu.dueAt) ? "text-bad" : "text-ink"
                        )}
                      >
                        {fmtWeekday(fu.dueAt)}
                      </p>
                      <p className="tnum text-2xs text-ink-muted">{fmtDateTime(fu.dueAt).split(" ").pop()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/leads/${fu.leadId}`}
                        className="text-sm font-semibold text-ink hover:text-violet-600"
                      >
                        {fu.leadName}
                      </Link>
                      <p className="truncate text-xs text-ink-muted">{fu.note}</p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <OperatorAvatar id={fu.owner} />
                    </div>
                    {fu.done ? (
                      <p className="flex shrink-0 items-center gap-1.5 text-xs text-ok">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {fu.doneBy && <OperatorTag id={fu.doneBy} prefix="por" />}
                      </p>
                    ) : (
                      <Button
                        size="sm"
                        loading={complete.isPending && complete.variables?.id === fu.id}
                        onClick={() => markDone(fu)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Concluir
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
