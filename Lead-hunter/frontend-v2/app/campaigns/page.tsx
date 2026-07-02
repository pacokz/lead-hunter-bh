"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  Radar,
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
import { OperatorTag } from "@/components/domain/operator";
import { useCampaigns, useCreateCampaign, useRunJob, useSettings } from "@/lib/queries";
import { useOperator } from "@/lib/operator";
import { fmtDateTime, fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Campaign, CampaignStatus, JobStatus } from "@/lib/types";

const JOB_STATUS: Record<JobStatus, { label: string; className: string; icon: React.ElementType }> = {
  PENDENTE: { label: "Pendente", className: "bg-paper text-ink-muted border-line", icon: Clock },
  EXECUTANDO: { label: "Executando", className: "bg-sky2-bg text-sky2 border-sky2-line", icon: Loader2 },
  CONCLUIDO: { label: "Concluído", className: "bg-ok-bg text-ok border-ok-line", icon: CheckCircle2 },
  ERRO: { label: "Erro", className: "bg-bad-bg text-bad border-bad-line", icon: AlertCircle },
};

const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; className: string }> = {
  ATIVA: { label: "Ativa", className: "bg-violet-100 text-violet-700 border-violet-200" },
  CONCLUIDA: { label: "Concluída", className: "bg-ok-bg text-ok border-ok-line" },
  PAUSADA: { label: "Pausada", className: "bg-warn-bg text-warn border-warn-line" },
};

export default function CampaignsPage() {
  const campaigns = useCampaigns();
  const settings = useSettings();
  const createCampaign = useCreateCampaign();
  const { operatorId } = useOperator();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [region, setRegion] = useState("");

  const quota = settings.data?.quota;
  const quotaExhausted = !!quota && quota.dailyUsed >= quota.dailyLimit;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Campanhas"
        description="Buscas na Google Places API por categoria + região. Cada página de busca gasta 1 requisição da cota."
        action={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            Nova campanha
          </Button>
        }
      />

      <Card className="mb-4 px-4 py-3.5">
        {settings.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : settings.isError || !quota ? (
          <p className="text-sm text-bad">Não foi possível carregar a cota.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-muted">Cota diária</p>
                <p className="tnum text-xs font-semibold text-ink">
                  {quota.dailyUsed}/{quota.dailyLimit}
                </p>
              </div>
              <Progress value={quota.dailyUsed} max={quota.dailyLimit} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium text-ink-muted">Cota mensal</p>
                <p className="tnum text-xs font-semibold text-ink">
                  {quota.monthlyUsed}/{quota.monthlyLimit}
                </p>
              </div>
              <Progress value={quota.monthlyUsed} max={quota.monthlyLimit} />
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

      {campaigns.isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-card" />
          ))}
        </div>
      ) : campaigns.isError ? (
        <ErrorState onRetry={() => campaigns.refetch()} />
      ) : campaigns.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Radar className="h-5 w-5" aria-hidden />}
            title="Nenhuma campanha ainda"
            description="Crie a primeira busca — ex.: dentistas na Savassi — pra alimentar o funil."
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
            <CampaignCard key={c.id} campaign={c} quotaExhausted={quotaExhausted} />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title="Nova campanha de busca">
        <div className="space-y-3">
          <Field label="Categoria" hint="Segmentos vêm das Configurações">
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
              <option value="">Selecione...</option>
              {(settings.data?.categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Região de BH">
            <Select value={region} onChange={(e) => setRegion(e.target.value)} className="w-full">
              <option value="">Selecione...</option>
              {(settings.data?.regions ?? []).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          {category && region && (
            <p className="rounded-ctrl bg-violet-50 px-3 py-2 text-xs text-violet-700">
              Termo de busca: <strong>&ldquo;{category.toLowerCase()} em {region}&rdquo;</strong> — serão
              criados 3 jobs (3 páginas de resultado), executados sob demanda.
            </p>
          )}
          <div className="flex items-center justify-between">
            <p className="text-2xs text-ink-muted">
              Criando como <OperatorTag id={operatorId} />
            </p>
            <Button
              variant="primary"
              size="sm"
              disabled={!category || !region}
              loading={createCampaign.isPending}
              onClick={async () => {
                await createCampaign.mutateAsync({ category, region, by: operatorId });
                setDialogOpen(false);
                setCategory("");
                setRegion("");
                toast("success", "Campanha criada — execute os jobs quando quiser gastar cota");
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

function CampaignCard({ campaign, quotaExhausted }: { campaign: Campaign; quotaExhausted: boolean }) {
  const runJob = useRunJob();
  const { toast } = useToast();

  const totalNew = campaign.jobs.reduce((acc, j) => acc + j.newLeads, 0);
  const totalFound = campaign.jobs.reduce((acc, j) => acc + j.found, 0);
  const status = CAMPAIGN_STATUS[campaign.status];

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {campaign.term}
            <Badge className={status.className}>{status.label}</Badge>
          </span>
        }
        subtitle={
          <span className="flex items-center gap-2">
            <OperatorTag id={campaign.createdBy} prefix="criada por" />
            <span>· {fmtRelative(campaign.createdAt)}</span>
            <span className="tnum">
              · {totalFound} encontrados, <strong className="text-ink-soft">{totalNew} novos</strong>
            </span>
          </span>
        }
      />
      <div className="px-4 pb-4">
        <ul className="divide-y divide-line-soft rounded-ctrl border border-line-soft">
          {campaign.jobs.map((job) => {
            const cfg = JOB_STATUS[job.status];
            const Icon = cfg.icon;
            return (
              <li key={job.id} className="flex items-center gap-3 px-3 py-2">
                <Badge className={cfg.className}>
                  <Icon className={cn("h-3 w-3", job.status === "EXECUTANDO" && "animate-spin")} aria-hidden />
                  {cfg.label}
                </Badge>
                <span className="text-sm text-ink-soft">Página {job.page}</span>
                {job.status === "CONCLUIDO" && (
                  <span className="tnum text-xs text-ink-muted">
                    {job.found} lugares · {job.newLeads} novos · {job.executedAt && fmtDateTime(job.executedAt)}
                  </span>
                )}
                {job.status === "ERRO" && (
                  <span className="truncate text-xs text-bad" title={job.error}>{job.error}</span>
                )}
                {(job.status === "PENDENTE" || job.status === "ERRO") && (
                  <Button
                    size="sm"
                    className="ml-auto"
                    disabled={quotaExhausted}
                    title={quotaExhausted ? "Cota diária esgotada" : undefined}
                    loading={runJob.isPending && runJob.variables?.id === job.id}
                    onClick={async () => {
                      const updated = await runJob.mutateAsync({ id: job.id });
                      const done = updated.jobs.find((j) => j.id === job.id);
                      toast("success", `Job executado: ${done?.newLeads ?? 0} leads novos`);
                    }}
                  >
                    <Play className="h-3 w-3" aria-hidden />
                    {job.status === "ERRO" ? "Tentar de novo" : "Executar"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
