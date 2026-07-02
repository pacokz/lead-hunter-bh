"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Lock,
  MonitorSmartphone,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { DemoStatusBadge, QaSeverityBadge } from "@/components/domain/badges";
import { OperatorTag } from "@/components/domain/operator";
import { SiteShot } from "@/components/domain/site-shot";
import { usePublishDemo, useDemos, useRerunQa } from "@/lib/queries";
import { useOperator } from "@/lib/operator";
import { demoIsBlocked } from "@/lib/domain";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Demo } from "@/lib/types";

export default function DemosPage() {
  const demos = useDemos();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Demos"
        description="Prévias de site geradas por lead. Publicar exige QA limpo — problema grave trava o botão."
      />

      {demos.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-card" />
          ))}
        </div>
      ) : demos.isError ? (
        <ErrorState onRetry={() => demos.refetch()} />
      ) : demos.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MonitorSmartphone className="h-5 w-5" aria-hidden />}
            title="Nenhuma demo ainda"
            description="Gere uma demo a partir do detalhe de um lead quente."
            action={
              <Link
                href="/leads"
                className="rounded-ctrl bg-violet-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600"
              >
                Ir pra Leads
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {demos.data.map((demo) => (
            <DemoCard key={demo.id} demo={demo} />
          ))}
        </div>
      )}
    </div>
  );
}

function DemoCard({ demo }: { demo: Demo }) {
  const publish = usePublishDemo();
  const rerunQa = useRerunQa();
  const { toast } = useToast();
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const { operatorId } = useOperator();

  const blocked = demoIsBlocked(demo.qa?.issues, demo.qa?.craftScore);
  const blockers = (demo.qa?.issues ?? []).filter((i) => i.severity === "BLOCKER");
  const canPublish = demo.status !== "PUBLICADA" && demo.qa && !blocked;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-sm font-semibold text-ink">
              <Link href={`/leads/${demo.leadId}`} className="hover:text-violet-600">
                {demo.leadName}
              </Link>
            </h2>
            <DemoStatusBadge status={demo.status} />
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="tnum">{demo.slug}</span>
            <span>·</span>
            <OperatorTag id={demo.createdBy} prefix="por" />
            <span>· {fmtRelative(demo.createdAt)}</span>
          </p>
        </div>
        <Tabs
          value={viewport}
          onChange={setViewport}
          options={[
            { value: "desktop", label: "Desktop" },
            { value: "mobile", label: "Mobile" },
          ]}
        />
      </div>

      <div className="px-4 pt-3">
        <SiteShot
          seed={demo.themeSeed}
          variant={viewport}
          className={cn("mx-auto", viewport === "mobile" && "w-40")}
          label={`Prévia ilustrativa da demo de ${demo.leadName} (mock)`}
        />
      </div>

      <div className="flex-1 px-4 pb-3 pt-3">
        {!demo.qa ? (
          <p className="flex items-center gap-2 rounded-ctrl border border-dashed border-line px-3 py-2.5 text-xs text-ink-muted">
            <ShieldAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden />
            QA ainda não rodou — rascunho não pode ser publicado.
          </p>
        ) : (
          <div
            className={cn(
              "rounded-ctrl border px-3 py-2.5",
              blocked ? "border-bad-line bg-bad-bg/40" : "border-ok-line bg-ok-bg/40"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className={cn("flex items-center gap-1.5 text-xs font-semibold", blocked ? "text-bad" : "text-ok")}>
                {blocked ? (
                  <ShieldAlert className="h-4 w-4" aria-hidden />
                ) : (
                  <ShieldCheck className="h-4 w-4" aria-hidden />
                )}
                {blocked ? "QA reprovou — publicação bloqueada" : "QA aprovado"}
              </p>
              <p className="tnum text-xs text-ink-soft">
                Craft score{" "}
                <strong className={demo.qa.craftScore < 7 ? "text-bad" : "text-ink"}>
                  {demo.qa.craftScore.toFixed(1)}
                </strong>
                /10 <span className="text-ink-faint">(mín. 7,0)</span>
              </p>
            </div>
            {demo.qa.issues.length > 0 && (
              <ul className="mt-2 space-y-1">
                {demo.qa.issues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-ink-soft">
                    <QaSeverityBadge severity={issue.severity} />
                    <span className="text-2xs uppercase tracking-wide text-ink-faint">{issue.viewport}</span>
                    {issue.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-line-soft px-4 py-3">
        {demo.status === "PUBLICADA" && demo.publishedUrl ? (
          <a
            href={demo.publishedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {demo.publishedUrl.replace("https://", "")}
          </a>
        ) : (
          <>
            <Button
              size="sm"
              loading={rerunQa.isPending && rerunQa.variables?.id === demo.id}
              onClick={async () => {
                const updated = await rerunQa.mutateAsync({ id: demo.id });
                const stillBlocked = demoIsBlocked(updated.qa?.issues, updated.qa?.craftScore);
                toast(
                  stillBlocked ? "error" : "success",
                  stillBlocked ? "QA re-executado — ainda há bloqueio" : "QA re-executado — liberada pra publicar"
                );
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              {demo.qa ? "Re-rodar QA" : "Rodar QA"}
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="ml-auto"
              disabled={!canPublish}
              title={
                !demo.qa
                  ? "Rode o QA primeiro"
                  : blocked
                    ? blockers.length > 0
                      ? "Resolva os problemas BLOCKER antes de publicar"
                      : "Craft score abaixo de 7,0"
                    : undefined
              }
              loading={publish.isPending && publish.variables?.id === demo.id}
              onClick={async () => {
                try {
                  const updated = await publish.mutateAsync({ id: demo.id, by: operatorId });
                  toast("success", `Publicada: ${updated.publishedUrl}`);
                } catch (e) {
                  toast("error", e instanceof Error ? e.message : "Falha ao publicar");
                }
              }}
            >
              {!canPublish && <Lock className="h-3.5 w-3.5" aria-hidden />}
              {canPublish && <Rocket className="h-3.5 w-3.5" aria-hidden />}
              Publicar
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}