"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gauge,
  KanbanSquare,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { ScoreBandBadge, SiteCategoryBadge } from "@/components/domain/badges";
import { OperatorAvatar } from "@/components/domain/operator";
import { Rating } from "@/components/domain/rating";
import { useFollowUps, useLeads, useSettings, useStats } from "@/lib/queries";
import { fmtInt, fmtRelative, isOverdue, isToday } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATS = [
  { key: "leadsFound", label: "Leads encontrados", icon: Search },
  { key: "leadsAudited", label: "Auditados", icon: ShieldCheck },
  { key: "inCrm", label: "No CRM", icon: KanbanSquare },
  { key: "demosReady", label: "Demos prontas", icon: MonitorSmartphone },
  { key: "followUpsToday", label: "Follow-ups hoje", icon: CalendarClock },
] as const;

export default function DashboardPage() {
  const stats = useStats();
  const leads = useLeads();
  const followUps = useFollowUps();
  const settings = useSettings();

  const hotLeads = (leads.data ?? [])
    .filter((l) => l.score && (l.score.band === "PRIORIDADE" || l.score.band === "ALTO_POTENCIAL"))
    .slice(0, 7);

  const agenda = (followUps.data ?? []).filter((f) => !f.done).slice(0, 6);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Dashboard"
        description="Visão geral da operação de prospecção em Belo Horizonte."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {STATS.map(({ key, label, icon: Icon }) => (
          <Card key={key} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-muted">{label}</p>
              <Icon className="h-3.5 w-3.5 text-violet-400" aria-hidden />
            </div>
            {stats.isPending ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : stats.isError ? (
              <p className="mt-1 text-sm text-bad">—</p>
            ) : (
              <p className="tnum mt-1 font-display text-2xl font-bold tracking-tight text-ink">
                {fmtInt(stats.data[key])}
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Leads prioritários"
            subtitle="Maior score de oportunidade, ainda com espaço pra abordagem"
            action={
              <Link
                href="/leads"
                className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
              >
                Ver todos <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            }
          />
          {leads.isPending ? (
            <div className="space-y-3 px-4 pb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : leads.isError ? (
            <ErrorState onRetry={() => leads.refetch()} />
          ) : hotLeads.length === 0 ? (
            <EmptyState
              icon={<Gauge className="h-5 w-5" aria-hidden />}
              title="Nenhum lead quente no momento"
              description="Rode uma campanha de busca e o pipeline de auditoria pra descobrir oportunidades."
            />
          ) : (
            <ul className="divide-y divide-line-soft px-2 pb-2">
              {hotLeads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center gap-3 rounded-ctrl px-2 py-2.5 transition-colors hover:bg-paper"
                  >
                    <ScoreRing score={lead.score!.total} band={lead.score!.band} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{lead.name}</p>
                        <ScoreBandBadge band={lead.score!.band} />
                      </div>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {lead.category} · {lead.region}
                      </p>
                    </div>
                    <SiteCategoryBadge category={lead.audit?.category} />
                    <Rating rating={lead.rating} reviews={lead.reviews} />
                    {lead.crm && <OperatorAvatar id={lead.crm.owner} size="sm" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Próximos contatos"
              subtitle="Agenda de follow-ups pendentes"
              action={
                <Link
                  href="/follow-ups"
                  className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700"
                >
                  Agenda <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              }
            />
            {followUps.isPending ? (
              <div className="space-y-3 px-4 pb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : followUps.isError ? (
              <ErrorState onRetry={() => followUps.refetch()} />
            ) : agenda.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 className="h-5 w-5" aria-hidden />}
                title="Agenda limpa"
                description="Nenhum follow-up pendente."
              />
            ) : (
              <ul className="divide-y divide-line-soft px-2 pb-2">
                {agenda.map((fu) => {
                  const overdue = isOverdue(fu.dueAt);
                  const today = isToday(fu.dueAt);
                  return (
                    <li key={fu.id}>
                      <Link
                        href={`/leads/${fu.leadId}`}
                        className="block rounded-ctrl px-2 py-2.5 transition-colors hover:bg-paper"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">{fu.leadName}</p>
                          <span
                            className={cn(
                              "tnum shrink-0 text-2xs font-semibold",
                              overdue ? "text-bad" : today ? "text-violet-600" : "text-ink-muted"
                            )}
                          >
                            {overdue ? "atrasado" : fmtRelative(fu.dueAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <OperatorAvatar id={fu.owner} size="sm" />
                          <p className="truncate text-xs text-ink-muted">{fu.note}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="px-4 py-3.5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-ink-muted">Cota Google Places (hoje)</p>
              {settings.data && (
                <span className="tnum text-xs font-semibold text-ink">
                  {settings.data.quota.dailyUsed}/{settings.data.quota.dailyLimit}
                </span>
              )}
            </div>
            {settings.isPending ? (
              <Skeleton className="h-1.5 w-full" />
            ) : settings.isError ? (
              <p className="text-xs text-bad">Erro ao carregar cota</p>
            ) : (
              <Progress
                value={settings.data.quota.dailyUsed}
                max={settings.data.quota.dailyLimit}
              />
            )}
            <p className="mt-2 text-2xs text-ink-faint">
              Buscas novas gastam cota — priorize auditar e pontuar o que já foi coletado.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
