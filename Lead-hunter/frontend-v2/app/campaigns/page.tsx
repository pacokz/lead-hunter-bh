"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  Radar,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useBackendSettings,
  useBackendStats,
  useCampaigns,
  useCategories,
  useCreateCampaign,
  useJobs,
  useRegions,
  useRunJob,
  useRunPipeline,
} from "@/lib/queries";
import { CAMPAIGN_STATUSES, JOB_STATUSES } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Campaign, JobStatus, SearchJob } from "@/lib/types";

const JOB_ICONS: Record<JobStatus, React.ElementType> = {
  PENDING: Clock,
  RUNNING: Loader2,
  DONE: CheckCircle2,
  ERROR: AlertCircle,
};

export default function CampaignsPage() {
  const campaigns = useCampaigns();
  const jobs = useJobs();
  const settings = useBackendSettings();
  const stats = useBackendStats();
  const categories = useCategories();
  const regions = useRegions();
  const createCampaign = useCreateCampaign();
  const runPipeline = useRunPipeline();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");
  const [maxPages, setMaxPages] = useState("1");

  const jobsByCampaign = useMemo(() => {
    const map = new Map<number, SearchJob[]>();
    for (const job of jobs.data ?? []) {
      const list = map.get(job.campaign_id) ?? [];
      list.push(job);
      map.set(job.campaign_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.id - b.id);
    return map;
  }, [jobs.data]);

  const quotaExhausted =
    !!stats.data && !!settings.data && stats.data.api_today >= settings.data.api_daily_limit;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Campanhas"
        description="Buscas na Google Places API por categoria + região. Cada página de busca gasta 1 requisição da cota."
        action={
          <>
            <Button
              loading={runPipeline.isPending}
              title="Audita e pontua o que já foi coletado — sem custo de API Google"
              onClick={async () => {
                const res = await runPipeline.mutateAsync();
                toast("success", `Pipeline: ${res.audited} auditados, ${res.scored} pontuados`);
              }}
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              Processar agora
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Nova campanha
            </Button>
          </>
        }
      />

      <Card className="mb-4 px-4 py-3.5">
        {stats.isPending || settings.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : stats.isError || settings.isError ? (
          <p className="text-sm text-bad">Não foi possível carregar a cota.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-muted">Cota diária</p>
                <p className="tnum text-xs font-semibold text-ink">
                  {stats.data.api_today}/{settings.data.api_daily_limit}
                </p>
              </div>
              <Progress value={stats.data.api_today} max={settings.data.api_daily_limit} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-muted">Cota mensal</p>
                <p className="tnum text-xs font-semibold text-ink">
                  {stats.data.api_month}/{settings.data.api_monthly_limit}
                </p>
              </div>
              <Progress value={stats.data.api_month} max={settings.data.api_monthly_limit} />
            </div>
          </div>
        )}
        {quotaExhausted && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-bad">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
            Cota diária esgotada — jobs novos só amanhã.
          </p>
        )}
      </Card>

      {campaigns.isPending || jobs.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-card" />
          ))}
        </div>
      ) : campaigns.isError ? (
        <ErrorState message={String(campaigns.error)} onRetry={() => campaigns.refetch()} />
      ) : campaigns.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Radar className="h-5 w-5" aria-hidden />}
            title="Nenhuma campanha ainda"
            description="Crie a primeira busca — ex.: clínica odontológica na Savassi — pra alimentar o funil."
            action={
              <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
                Criar campanha
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.data.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              jobs={jobsByCampaign.get(c.id) ?? []}
              quotaExhausted={quotaExhausted}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Nova campanha de busca">
        <div className="space-y-3">
          <Field label="Categoria" hint="Gerencie a lista em Configurações">
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
              <option value="">Selecione...</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Região de BH">
            <Select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full">
              <option value="">Selecione...</option>
              {(regions.data ?? []).map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Páginas de resultado" hint="Cada página = 1 job = 1 requisição (até 20 lugares)">
            <Select value={maxPages} onChange={(e) => setMaxPages(e.target.value)} className="w-full">
              <option value="1">1 página (~20 lugares)</option>
              <option value="2">2 páginas (~40 lugares)</option>
              <option value="3">3 páginas (~60 lugares)</option>
            </Select>
          </Field>
          {category && region && (
            <p className="rounded-ctrl bg-violet-50 px-3 py-2 text-xs text-violet-700">
              Termo de busca: <strong>&ldquo;{category} em {region}&rdquo;</strong> — os jobs são
              executados sob demanda, quando você quiser gastar cota.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              variant="primary"
              size="sm"
              disabled={!category || !region}
              loading={createCampaign.isPending}
              onClick={async () => {
                try {
                  await createCampaign.mutateAsync({
                    category,
                    region,
                    maxPages: parseInt(maxPages, 10),
                  });
                  setDialogOpen(false);
                  setCategory("");
                  setRegion("");
                  toast("success", "Campanha criada — execute os jobs quando quiser");
                } catch (e) {
                  toast("error", e instanceof Error ? e.message : "Erro ao criar campanha");
                }
              }}
            >
              Criar campanha
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function CampaignCard({
  campaign,
  jobs,
  quotaExhausted,
}: {
  campaign: Campaign;
  jobs: SearchJob[];
  quotaExhausted: boolean;
}) {
  const runJob = useRunJob();
  const { toast } = useToast();

  const totalFound = jobs.reduce((acc, j) => acc + (j.results_count ?? 0), 0);
  const status = CAMPAIGN_STATUSES[campaign.status] ?? CAMPAIGN_STATUSES.DRAFT;

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {campaign.name}
            <Badge className={status.className}>{status.label}</Badge>
          </span>
        }
        subtitle={
          <span className="tnum">
            {campaign.category ?? "sem categoria"} · {jobs.length} job{jobs.length === 1 ? "" : "s"} ·{" "}
            {totalFound} lugares encontrados
          </span>
        }
      />
      <div className="px-4 pb-4">
        {jobs.length === 0 ? (
          <p className="rounded-ctrl border border-dashed border-line px-3 py-3 text-center text-xs text-ink-muted">
            Nenhum job gerado pra esta campanha.
          </p>
        ) : (
          <ul className="divide-y divide-line-soft rounded-ctrl border border-line-soft">
            {jobs.map((job) => {
              const cfg = JOB_STATUSES[job.status] ?? JOB_STATUSES.PENDING;
              const Icon = JOB_ICONS[job.status] ?? Clock;
              return (
                <li key={job.id} className="flex items-center gap-3 px-3 py-2">
                  <Badge className={cfg.className}>
                    <Icon className={cn("h-3 w-3", job.status === "RUNNING" && "animate-spin")} aria-hidden />
                    {cfg.label}
                  </Badge>
                  <span className="min-w-0 truncate text-sm text-ink-soft">
                    {job.term} · {job.region} · pág. {job.page}
                  </span>
                  {job.status === "DONE" && (
                    <span className="tnum shrink-0 text-xs text-ink-muted">
                      {job.results_count} lugares
                    </span>
                  )}
                  {job.status === "ERROR" && job.error && (
                    <span className="truncate text-xs text-bad" title={job.error}>
                      {job.error}
                    </span>
                  )}
                  {(job.status === "PENDING" || job.status === "ERROR") && (
                    <Button
                      size="sm"
                      className="ml-auto shrink-0"
                      disabled={quotaExhausted}
                      title={quotaExhausted ? "Cota diária esgotada" : undefined}
                      loading={runJob.isPending && runJob.variables === job.id}
                      onClick={async () => {
                        try {
                          const done = await runJob.mutateAsync(job.id);
                          toast("success", `Job executado: ${done.results_count} lugares`);
                        } catch (e) {
                          toast("error", e instanceof Error ? e.message : "Erro ao executar job");
                        }
                      }}
                    >
                      <Play className="h-3 w-3" aria-hidden />
                      {job.status === "ERROR" ? "Tentar de novo" : "Executar"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
