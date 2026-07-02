"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Gauge,
  KanbanSquare,
  Search,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { ScoreBandBadge, SiteCategoryBadge } from "@/components/domain/badges";
import { Rating } from "@/components/domain/rating";
import {
  useBackendSettings,
  useBackendStats,
  useFollowUps,
  useLeads,
  useStats,
} from "@/lib/queries";
import { fmtInt, fmtRelative, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATS = [
  { key: "leadsFound", label: "Leads encontrados", icon: Search },
  { key: "leadsAudited", label: "Auditados", icon: ShieldCheck },
  { key: "prioritarios", label: "Prioritários", icon: Gauge },
  { key: "inCrm", label: "No CRM", icon: KanbanSquare },
  { key: "followUpsToday", label: "Follow-ups hoje", icon: CalendarClock },
] as const;

export default function DashboardPage() {
  const stats = useStats();
  const leads = useLeads();
  const followUps = useFollowUps();
  const settings = useBackendSettings();
  const backendStats = useBackendStats();

  const hotLeads = (leads.data ?? [])
    .filter((l) => l.band === "PRIORIDADE" || l.band === "ALTO_POTENCIAL")
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
            subtitle="Maior score de oportunidade — os melhores candidatos a abordar"
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
                  <Skeleton className="h-9 w-11 rounded-ctrl" />
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
                <li key={lead.place_id}>
                  <Link
                    href={`/leads/${encodeURIComponent(lead.place_id)}`}
                    className="flex items-center gap-3 rounded-ctrl px-2 py-2.5 transition-colors hover:bg-paper"
                  >
                    <span
                      className={cn(
                        "tnum inline-flex h-8 w-10 shrink-0 items-center justify-center rounded-ctrl font-display text-sm font-bold",
                        lead.band === "PRIORIDADE" ? "bg-violet-500 text-white" : "bg-line-soft text-ink"
                      )}
                    >
                      {lead.score}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{lead.name}</p>
                        <ScoreBandBadge band={lead.band} />
                      </div>
                      {lead.category && (
                        <p className="mt-0.5 truncate text-xs text-ink-muted">{lead.category}</p>
                      )}
                    </div>
                    <SiteCategoryBadge category={lead.site_class} />
                    {lead.rating !== null && (
                      <Rating rating={lead.rating} reviews={lead.reviews_count ?? 0} />
                    )}
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
                  const overdue = fu.scheduled_at ? isOverdue(fu.scheduled_at) : false;
                  return (
                    <li key={fu.id}>
                      <Link
                        href={`/leads/${encodeURIComponent(fu.place_id)}`}
                        className="block rounded-ctrl px-2 py-2.5 transition-colors hover:bg-paper"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium text-ink">
                            {fu.place_name ?? fu.place_id}
                          </p>
                          <span
                            className={cn(
                              "tnum shrink-0 text-2xs font-semibold",
                              overdue ? "text-bad" : "text-ink-muted"
                            )}
                          >
                            {fu.scheduled_at
                              ? overdue
                                ? "atrasado"
                                : fmtRelative(fu.scheduled_at)
                              : "sem data"}
                          </span>
                        </div>
                        {fu.note && <p className="mt-1 truncate text-xs text-ink-muted">{fu.note}</p>}
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
              {backendStats.data && settings.data && (
                <span className="tnum text-xs font-semibold text-ink">
                  {backendStats.data.api_today}/{settings.data.api_daily_limit}
                </span>
              )}
            </div>
            {backendStats.isPending || settings.isPending ? (
              <Skeleton className="h-1.5 w-full" />
            ) : backendStats.isError || settings.isError ? (
              <p className="text-xs text-bad">Erro ao carregar cota</p>
            ) : (
              <Progress
                value={backendStats.data.api_today}
                max={settings.data.api_daily_limit}
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
