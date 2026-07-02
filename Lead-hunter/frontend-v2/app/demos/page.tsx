"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  ImageOff,
  MapPin,
  MonitorSmartphone,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useDemos } from "@/lib/queries";
import { demoFileUrl } from "@/lib/api";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Demo, DemoStatus } from "@/lib/types";

const STATUS: Record<DemoStatus, { label: string; className: string }> = {
  RASCUNHO: { label: "Rascunho", className: "bg-paper text-ink-muted border-line" },
  EM_QA: { label: "Em QA", className: "bg-warn-bg text-warn border-warn-line" },
  APROVADA: { label: "Aprovada", className: "bg-ok-bg text-ok border-ok-line" },
  PUBLICADA: { label: "Publicada", className: "bg-violet-500 text-white border-violet-500" },
};

export default function DemosPage() {
  const demos = useDemos();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Demos"
        description="Prévias de site geradas pelos agentes (Nanami dirige, Nobara executa). Publicar tem gate de QA — nota mínima 7 e zero blocker."
      />

      {demos.isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-72 w-full rounded-card" />
          ))}
        </div>
      ) : demos.isError ? (
        <ErrorState message={String(demos.error)} onRetry={() => demos.refetch()} />
      ) : demos.data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<MonitorSmartphone className="h-5 w-5" aria-hidden />}
            title="Nenhuma demo encontrada"
            description="Peça uma demo pros agentes no Discord — quando a Nobara gerar, ela aparece aqui automaticamente."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {demos.data.map((demo) => (
            <DemoCard key={demo.slug} demo={demo} />
          ))}
        </div>
      )}
    </div>
  );
}

function DemoCard({ demo }: { demo: Demo }) {
  const viewports = (["desktop", "tablet", "mobile"] as const).filter((v) => demo.screenshots[v]);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">(
    viewports[0] ?? "desktop"
  );
  const status = STATUS[demo.status];
  const shot = demo.screenshots[viewport];
  const blocked = demo.blockers.length > 0 || (demo.craft_score !== null && demo.craft_score < 7);

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-2 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-display text-sm font-semibold text-ink">
              {demo.place_id ? (
                <Link
                  href={`/leads/${encodeURIComponent(demo.place_id)}`}
                  className="hover:text-violet-600"
                  title={`Abrir o lead ${demo.lead_name ?? demo.name}`}
                >
                  {demo.name}
                </Link>
              ) : (
                demo.name
              )}
            </h2>
            <Badge className={status.className}>{status.label}</Badge>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <span className="tnum">{demo.slug}</span>
            {demo.bairro && (
              <>
                <span>·</span>
                <MapPin className="h-3 w-3" aria-hidden />
                {demo.bairro}
              </>
            )}
            {demo.updated_at && <span>· {fmtRelative(demo.updated_at)}</span>}
          </p>
        </div>
        {viewports.length > 1 && (
          <Tabs
            value={viewport}
            onChange={setViewport}
            options={viewports.map((v) => ({
              value: v,
              label: v === "desktop" ? "Desktop" : v === "tablet" ? "Tablet" : "Mobile",
            }))}
          />
        )}
      </div>

      <div className="px-4 pt-3">
        {shot ? (
          <a
            href={demo.published_url ?? (demo.preview_path ? demoFileUrl(demo.preview_path) : "#")}
            target="_blank"
            rel="noreferrer"
            title="Abrir a demo em nova aba"
            className={cn(
              "block overflow-hidden rounded-ctrl border border-line bg-paper transition-shadow hover:shadow-pop",
              viewport === "mobile" ? "mx-auto w-48" : ""
            )}
          >
            {/* screenshot real do QA (Playwright) servido pelo backend */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={demoFileUrl(shot)}
              alt={`Screenshot ${viewport} da demo ${demo.name}`}
              className="max-h-72 w-full object-cover object-top"
              loading="lazy"
            />
          </a>
        ) : (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 rounded-ctrl border border-dashed border-line text-ink-faint">
            <ImageOff className="h-5 w-5" aria-hidden />
            <p className="text-xs">Sem screenshot de QA ainda</p>
          </div>
        )}
      </div>

      <div className="flex-1 px-4 pb-3 pt-3">
        {demo.craft_score === null && demo.blockers.length === 0 ? (
          <p className="flex items-center gap-2 rounded-ctrl border border-dashed border-line px-3 py-2.5 text-xs text-ink-muted">
            <ShieldAlert className="h-4 w-4 shrink-0 text-warn" aria-hidden />
            QA visual ainda não rodou pra esta demo.
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
                {blocked ? "QA reprovou — não publicável" : "QA aprovado"}
              </p>
              {demo.craft_score !== null && (
                <p className="tnum text-xs text-ink-soft">
                  Craft score{" "}
                  <strong className={demo.craft_score < 7 ? "text-bad" : "text-ink"}>
                    {demo.craft_score.toFixed(1)}
                  </strong>
                  /10 <span className="text-ink-faint">(mín. 7,0)</span>
                </p>
              )}
            </div>
            {demo.blockers.length > 0 && (
              <ul className="mt-2 space-y-1">
                {demo.blockers.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-ink-soft">
                    <Badge className="bg-bad-bg text-bad border-bad-line">Blocker</Badge>
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {demo.craft_issues.length > 0 && (
              <ul className="mt-2 space-y-1">
                {demo.craft_issues.slice(0, 3).map((issue, i) => (
                  <li key={i} className="text-xs leading-relaxed text-ink-muted">
                    · {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-line-soft px-4 py-3">
        {demo.published_url ? (
          <a
            href={demo.published_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {demo.published_url.replace("https://", "")}
          </a>
        ) : demo.preview_path ? (
          <a
            href={demoFileUrl(demo.preview_path)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            Abrir prévia local
          </a>
        ) : (
          <span className="text-xs text-ink-faint">Sem arquivo de prévia</span>
        )}
        <span className="ml-auto text-2xs text-ink-faint">
          {demo.status === "PUBLICADA"
            ? "no ar pela Vercel"
            : "publicação via agentes (gate de QA)"}
        </span>
      </div>
    </Card>
  );
}
