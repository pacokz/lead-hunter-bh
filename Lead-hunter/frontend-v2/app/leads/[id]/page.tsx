"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  Globe,
  ImagePlus,
  Instagram,
  KanbanSquare,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  Phone,
  ScanSearch,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ScoreRing } from "@/components/ui/score-ring";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  CrmStageBadge,
  IssueSeverityBadge,
  ScoreBandBadge,
  SiteCategoryBadge,
} from "@/components/domain/badges";
import { Rating } from "@/components/domain/rating";
import {
  useAddFollowUp,
  useAddInteraction,
  useCompleteFollowUp,
  useCreateDemoRequest,
  useCrmBoard,
  useDemoRequests,
  useDrafts,
  useGenerateDraft,
  useInteractions,
  useLeadContext,
  useLeadFollowUps,
  useMe,
  usePromoteSingle,
  useSetCrmOwner,
  useSetCrmStage,
  useSetDemoRequestStatus,
  useUploadDemoAssets,
} from "@/lib/queries";
import { API } from "@/lib/api";
import { OperatorAvatar, OperatorTag } from "@/components/domain/operator";
import { operatorById } from "@/lib/operators";
import { CRM_STAGE_ORDER, CRM_STAGES, SCORE_COMPONENT_LABELS } from "@/lib/domain";
import { fmtDateTime, fmtRelative, isOverdue } from "@/lib/format";
import type { CrmStage, LeadContext } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const placeId = decodeURIComponent(id);
  const ctx = useLeadContext(placeId);

  if (ctx.isPending) {
    return (
      <div className="animate-fade-up space-y-4">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Skeleton className="h-64 w-full rounded-card" />
            <Skeleton className="h-48 w-full rounded-card" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-card" />
            <Skeleton className="h-40 w-full rounded-card" />
          </div>
        </div>
      </div>
    );
  }

  if (ctx.isError) {
    return <ErrorState message={String(ctx.error)} onRetry={() => ctx.refetch()} />;
  }

  return <LeadDetail ctx={ctx.data} />;
}

function LeadDetail({ ctx }: { ctx: LeadContext }) {
  const { place, audit, score } = ctx;

  return (
    <div className="animate-fade-up">
      <Link
        href="/leads"
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Voltar pra lista
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-bold tracking-tight text-ink">{place.name}</h1>
            {score && <ScoreBandBadge band={score.band} />}
            <SiteCategoryBadge category={audit?.site_class} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {place.category}
            {place.rating !== null && (
              <Rating rating={place.rating} reviews={place.reviews_count ?? 0} />
            )}
            {ctx.pipeline_state && (
              <span className="text-xs text-ink-faint">pipeline: {ctx.pipeline_state}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {place.google_maps_uri && (
            <a
              href={place.google_maps_uri}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 rounded-ctrl border border-line bg-white px-4 text-sm font-medium text-ink transition-colors hover:border-ink-faint hover:bg-paper"
            >
              <MapPin className="h-4 w-4 text-violet-500" aria-hidden />
              Google Maps
              <ExternalLink className="h-3 w-3 text-ink-faint" aria-hidden />
            </a>
          )}
          <GenerateSiteAction placeId={place.place_id} leadName={place.name} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <ScoreCard ctx={ctx} />
          <AuditCard ctx={ctx} />
          <OutreachCard placeId={place.place_id} />
        </div>
        <div className="space-y-4">
          <GoogleCard ctx={ctx} />
          <CrmCard placeId={place.place_id} />
          <ActivityCard ctx={ctx} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ gerar site

const REQUEST_STATUS_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Site pedido · aguardando agentes", className: "bg-warn-bg text-warn border-warn-line" },
  IN_PROGRESS: { label: "Site em produção", className: "bg-violet-100 text-violet-700 border-violet-200" },
};

function GenerateSiteAction({ placeId, leadName }: { placeId: string; leadName: string }) {
  const requests = useDemoRequests(placeId);
  const createRequest = useCreateDemoRequest();
  const uploadAssets = useUploadDemoAssets();
  const setStatus = useSetDemoRequestStatus();
  const me = useMe();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);

  const openReq = (requests.data ?? []).find(
    (r) => r.status === "PENDING" || r.status === "IN_PROGRESS"
  );

  if (openReq) {
    const cfg = REQUEST_STATUS_LABEL[openReq.status];
    return (
      <span className="flex items-center gap-1.5">
        <Badge className={cfg.className} title={openReq.notes ?? undefined}>
          <Sparkles className="h-3 w-3" aria-hidden />
          {cfg.label}
          {openReq.files.length > 0 && ` · ${openReq.files.length} arquivo${openReq.files.length > 1 ? "s" : ""}`}
        </Badge>
        {openReq.status === "PENDING" && (
          <button
            aria-label="Cancelar pedido de site"
            title="Cancelar pedido"
            disabled={setStatus.isPending}
            onClick={async () => {
              await setStatus.mutateAsync({ id: openReq.id, status: "CANCELLED" });
              toast("success", "Pedido cancelado");
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-bad-bg hover:text-bad"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </span>
    );
  }

  async function submit() {
    setSending(true);
    try {
      await createRequest.mutateAsync({
        placeId,
        notes: notes.trim() || null,
        createdBy: me.data?.operator?.id ?? null,
      });
      if (files.length > 0) {
        const up = await uploadAssets.mutateAsync({ placeId, files });
        if (up.skipped > 0) toast("error", `${up.skipped} arquivo(s) ignorado(s) (formato não aceito)`);
      }
      setOpen(false);
      setNotes("");
      setFiles([]);
      toast("success", "Pedido enviado — os agentes assumem a partir daqui");
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Erro ao pedir o site");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" aria-hidden />
        Gerar site
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Gerar site — ${leadName}`} className="max-w-lg">
        <div className="space-y-3">
          <p className="rounded-ctrl bg-violet-50 px-3 py-2 text-xs leading-relaxed text-violet-700">
            O pedido entra na fila dos agentes: o <strong>Nanami</strong> pesquisa referências e
            escreve o brief, a <strong>Nobara</strong> cria e publica (com gate de QA). O material
            que você subir aqui vira a matéria-prima do site.
          </p>
          <Field label="Instruções (opcional)" hint="Tom, foco, serviços a destacar, cor da marca...">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: foco em implantes, tom sóbrio, usar o dourado do logo"
            />
          </Field>
          <Field
            label="Fotos e vídeos do lead (opcional)"
            hint="Baixe do Instagram do cliente e solte aqui — jpg, png, webp, mp4"
          >
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-ctrl border border-dashed border-line bg-paper/60 px-3 py-4 text-sm text-ink-muted transition-colors hover:border-violet-300 hover:text-ink">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {files.length > 0
                ? `${files.length} arquivo${files.length > 1 ? "s" : ""} selecionado${files.length > 1 ? "s" : ""}`
                : "Escolher arquivos"}
              <input
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.gif,.mp4,.mov,.webm"
                className="sr-only"
                onChange={(e) => setFiles([...(e.target.files ?? [])])}
              />
            </label>
          </Field>
          {files.length > 0 && (
            <ul className="max-h-24 space-y-1 overflow-y-auto scrollbar-thin">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs text-ink-soft">
                  <span className="truncate">{f.name}</span>
                  <button
                    aria-label={`Remover ${f.name}`}
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                    className="text-ink-faint hover:text-bad"
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <Button variant="primary" size="sm" loading={sending} onClick={submit}>
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Enviar pedido
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

// ------------------------------------------------------------------ score

function ScoreCard({ ctx }: { ctx: LeadContext }) {
  const score = ctx.score;

  if (!score) {
    return (
      <Card>
        <CardHeader title="Score de oportunidade" />
        <EmptyState
          icon={<ScanSearch className="h-5 w-5" aria-hidden />}
          title="Ainda não pontuado"
          description="Esse lead foi coletado mas o pipeline de auditoria + score ainda não rodou."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Score de oportunidade"
        subtitle="Determinístico e auditável — a soma dos componentes é o total."
      />
      <div className="flex flex-col gap-5 px-4 pb-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <ScoreRing score={score.score} band={score.band} size={84} />
          <ScoreBandBadge band={score.band} />
        </div>
        <dl className="min-w-0 flex-1 space-y-2.5">
          {score.components.map((c) => {
            const meta = SCORE_COMPONENT_LABELS[c.component] ?? { label: c.component, hint: "" };
            return (
              <div key={c.component} title={meta.hint}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <dt className="text-xs font-medium text-ink-soft">{meta.label}</dt>
                  <dd className="tnum text-xs font-semibold text-ink">
                    {c.value}
                    <span className="text-ink-faint">/{c.weight}</span>
                  </dd>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      c.value / c.weight >= 0.75
                        ? "bg-violet-500"
                        : c.value / c.weight >= 0.4
                          ? "bg-violet-300"
                          : "bg-line"
                    )}
                    style={{ width: `${Math.min(100, (c.value / c.weight) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </dl>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ auditoria

function FactChip({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return null;
  return (
    <Badge className={ok ? "border-ok-line bg-ok-bg text-ok" : "border-bad-line bg-bad-bg text-bad"}>
      {ok ? <CheckCircle2 className="h-3 w-3" aria-hidden /> : <XCircle className="h-3 w-3" aria-hidden />}
      {label}
    </Badge>
  );
}

function AuditCard({ ctx }: { ctx: LeadContext }) {
  const audit = ctx.audit;
  const site = audit?.final_url || ctx.place.website;

  return (
    <Card>
      <CardHeader
        title="Auditoria do site"
        action={audit && <SiteCategoryBadge category={audit.site_class} />}
      />
      {!audit ? (
        <EmptyState
          icon={<Globe className="h-5 w-5" aria-hidden />}
          title="Não auditado ainda"
          description="A auditoria roda no pipeline diário ou no botão &quot;Processar agora&quot; em Campanhas."
        />
      ) : (
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {site && (
              <a
                href={site.startsWith("http") ? site : `https://${site}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-medium text-violet-600 hover:text-violet-700"
              >
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {site.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )}
            {ctx.place.instagram_handle && (
              <a
                href={`https://instagram.com/${ctx.place.instagram_handle.replace("@", "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink"
              >
                <Instagram className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {ctx.place.instagram_handle}
              </a>
            )}
            {!site && !ctx.place.instagram_handle && (
              <span className="text-ink-muted">Nenhuma presença digital encontrada.</span>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-1.5">
            <FactChip ok={audit.https} label="HTTPS" />
            <FactChip ok={audit.responsive} label="Responsivo" />
            <FactChip ok={audit.has_whatsapp} label="WhatsApp" />
            <FactChip ok={audit.has_form} label="Formulário" />
            {audit.http_status !== null && (
              <Badge
                className={
                  audit.http_status >= 200 && audit.http_status < 400
                    ? "border-line bg-paper text-ink-muted"
                    : "border-bad-line bg-bad-bg text-bad"
                }
              >
                HTTP {audit.http_status}
              </Badge>
            )}
            {audit.response_time_s !== null && (
              <Badge className="border-line bg-paper text-ink-muted tnum">
                {audit.response_time_s.toFixed(1)}s de resposta
              </Badge>
            )}
          </div>

          {audit.title && (
            <p className="mb-3 truncate text-xs text-ink-muted" title={audit.title}>
              <span className="font-medium text-ink-soft">Título:</span> {audit.title}
            </p>
          )}

          {audit.issues.length > 0 ? (
            <ul className="space-y-1.5">
              {audit.issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-ctrl border border-line-soft bg-paper/60 px-2.5 py-2"
                >
                  <IssueSeverityBadge severity={issue.severity} />
                  <span className="text-sm text-ink-soft">
                    {issue.description ?? issue.type}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">Nenhum problema registrado.</p>
          )}

          {audit.screenshots.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-ink-muted">
                Screenshots da auditoria (site atual do lead)
              </p>
              <div className="flex flex-wrap gap-3">
                {audit.screenshots.map((s) => (
                  <a
                    key={s.viewport}
                    href={`${API}${s.path}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`Abrir screenshot ${s.viewport} em tamanho real`}
                    className={cn(
                      "block overflow-hidden rounded-ctrl border border-line bg-paper transition-shadow hover:shadow-pop",
                      s.viewport === "mobile" ? "w-28" : "min-w-0 flex-1 basis-56"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${API}${s.path}`}
                      alt={`Screenshot ${s.viewport} do site atual`}
                      className="max-h-44 w-full object-cover object-top"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ abordagem

function OutreachCard({ placeId }: { placeId: string }) {
  const drafts = useDrafts(placeId);
  const generate = useGenerateDraft();
  const { toast } = useToast();
  const [channel, setChannel] = useState<"WHATSAPP" | "INSTAGRAM">("WHATSAPP");

  return (
    <Card>
      <CardHeader
        title="Abordagem"
        subtitle="Rascunhos prontos pra copiar. O envio é sempre manual — WhatsApp ou DM."
        action={
          <div className="flex items-center gap-2">
            <Select
              value={channel}
              onChange={(e) => setChannel(e.target.value as typeof channel)}
              className="h-8"
              aria-label="Canal do rascunho"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="INSTAGRAM">Instagram DM</option>
            </Select>
            <Button
              size="sm"
              variant="primary"
              loading={generate.isPending}
              onClick={async () => {
                try {
                  await generate.mutateAsync({ placeId, channel });
                  toast("success", "Rascunho gerado");
                } catch (e) {
                  toast("error", e instanceof Error ? e.message : "Erro ao gerar rascunho");
                }
              }}
            >
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
              Gerar rascunho
            </Button>
          </div>
        }
      />
      <div className="px-4 pb-4">
        {drafts.isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : drafts.isError ? (
          <ErrorState onRetry={() => drafts.refetch()} className="py-6" />
        ) : drafts.data.length === 0 ? (
          <EmptyState
            className="py-8"
            icon={<MessageCircle className="h-5 w-5" aria-hidden />}
            title="Nenhum rascunho ainda"
            description="Gere um rascunho personalizado com o gancho certo pro estado do site desse lead."
          />
        ) : (
          <div className="space-y-3">
            {drafts.data.map((draft) => (
              <div key={draft.id} className="rounded-ctrl border border-line bg-paper/50 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-muted">
                    {draft.channel === "WHATSAPP" ? (
                      <MessageCircle className="h-3 w-3 text-ok" aria-hidden />
                    ) : (
                      <Instagram className="h-3 w-3 text-rose2" aria-hidden />
                    )}
                    {draft.channel === "WHATSAPP" ? "WhatsApp" : "Instagram DM"}
                  </span>
                  <CopyButton text={draft.text} />
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                  {draft.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ google

function GoogleCard({ ctx }: { ctx: LeadContext }) {
  const { place } = ctx;
  return (
    <Card>
      <CardHeader title="Dados do Google" subtitle="Vindos da Places API na coleta" />
      <div className="space-y-2.5 px-4 pb-4 text-sm">
        {place.address && (
          <p className="flex items-start gap-2 text-ink-soft">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
            {place.address}
          </p>
        )}
        {place.phone && (
          <p className="flex items-center gap-2 text-ink-soft">
            <Phone className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
            <span className="tnum">{place.phone}</span>
          </p>
        )}
        {place.business_status && place.business_status !== "OPERATIONAL" && (
          <Badge className="border-warn-line bg-warn-bg text-warn">{place.business_status}</Badge>
        )}
        <p className="break-all text-2xs text-ink-faint">
          place_id: <span className="tnum">{place.place_id}</span>
        </p>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ crm

function CrmCard({ placeId }: { placeId: string }) {
  const board = useCrmBoard();
  const setStage = useSetCrmStage();
  const setOwner = useSetCrmOwner();
  const promote = usePromoteSingle();
  const me = useMe();
  const { toast } = useToast();

  const card = (board.data ?? []).find((c) => c.place_id === placeId);
  const OWNER_OPTIONS = ["samuel", "jose"];

  return (
    <Card>
      <CardHeader title="CRM" action={card && <CrmStageBadge stage={card.stage} />} />
      {board.isPending ? (
        <div className="px-4 pb-4">
          <Skeleton className="h-16 w-full" />
        </div>
      ) : board.isError ? (
        <ErrorState onRetry={() => board.refetch()} className="py-6" />
      ) : !card ? (
        <EmptyState
          className="py-8"
          icon={<KanbanSquare className="h-5 w-5" aria-hidden />}
          title="Fora do CRM"
          description="Promova este lead pra começar a trabalhar a abordagem."
          action={
            <Button
              size="sm"
              variant="primary"
              loading={promote.isPending}
              onClick={async () => {
                await promote.mutateAsync({ placeId, by: me.data?.operator?.id ?? null });
                toast("success", "Lead promovido pro CRM (Novo)");
              }}
            >
              Promover este lead
            </Button>
          }
        />
      ) : (
        <div className="space-y-3 px-4 pb-4">
          <Field label="Estágio">
            <Select
              value={card.stage}
              disabled={setStage.isPending}
              onChange={async (e) => {
                await setStage.mutateAsync({ placeId, stage: e.target.value as CrmStage });
                toast("success", `Movido pra ${CRM_STAGES[e.target.value as CrmStage].label}`);
              }}
              className="w-full"
            >
              {CRM_STAGE_ORDER.map((s) => (
                <option key={s} value={s}>{CRM_STAGES[s].label}</option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-1.5 text-xs font-medium text-ink-soft">Responsável</p>
            <div className="inline-flex items-center gap-0.5 rounded-ctrl bg-line-soft p-0.5" role="radiogroup" aria-label="Responsável">
              {OWNER_OPTIONS.map((id) => {
                const op = operatorById(id)!;
                const active = card.owner === id;
                return (
                  <button
                    key={id}
                    role="radio"
                    aria-checked={active}
                    disabled={setOwner.isPending}
                    onClick={async () => {
                      if (active) return;
                      await setOwner.mutateAsync({ placeId, owner: id });
                      toast("success", `Responsável agora é ${op.shortName}`);
                    }}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-xs font-medium transition-colors",
                      active ? "bg-white text-ink shadow-card" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <OperatorAvatar id={id} size="sm" />
                    {op.shortName}
                  </button>
                );
              })}
              {card.owner && !OWNER_OPTIONS.includes(card.owner) && (
                <span className="px-2 text-xs text-ink-muted">
                  <OperatorTag id={card.owner} />
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ atividade

const CHANNEL_OPTIONS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM", label: "Instagram" },
  { value: "EMAIL", label: "E-mail" },
  { value: "", label: "Nota interna" },
];

function channelLabel(channel: string | null) {
  return CHANNEL_OPTIONS.find((c) => c.value === (channel ?? ""))?.label ?? channel ?? "Nota";
}

function ActivityCard({ ctx }: { ctx: LeadContext }) {
  const placeId = ctx.place.place_id;
  const interactions = useInteractions(placeId);
  const followUps = useLeadFollowUps(placeId);
  const addInteraction = useAddInteraction();
  const addFollowUp = useAddFollowUp();
  const completeFollowUp = useCompleteFollowUp();
  const me = useMe();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<"interaction" | "followup" | null>(null);
  const [channel, setChannel] = useState("WHATSAPP");
  const [note, setNote] = useState("");
  const [dueInDays, setDueInDays] = useState("1");
  const [fuNote, setFuNote] = useState("");

  const pendingFus = (followUps.data ?? []).filter((f) => !f.done);

  return (
    <Card>
      <CardHeader
        title="Atividade"
        subtitle="Interações e follow-ups deste lead"
        action={
          <div className="flex gap-1.5">
            <Button size="sm" onClick={() => setDialog("followup")}>
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
              Follow-up
            </Button>
            <Button size="sm" variant="primary" onClick={() => setDialog("interaction")}>
              <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
              Registrar
            </Button>
          </div>
        }
      />
      <div className="px-4 pb-4">
        {pendingFus.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {pendingFus.map((fu) => {
              const overdue = fu.scheduled_at ? isOverdue(fu.scheduled_at) : false;
              return (
                <div
                  key={fu.id}
                  className={cn(
                    "flex items-center gap-2 rounded-ctrl border px-2.5 py-2",
                    overdue ? "border-bad-line bg-bad-bg/40" : "border-line-soft bg-paper/60"
                  )}
                >
                  <CalendarPlus
                    className={cn("h-3.5 w-3.5 shrink-0", overdue ? "text-bad" : "text-violet-500")}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink-soft">{fu.note ?? fu.type}</p>
                    {fu.scheduled_at && (
                      <p className={cn("tnum text-2xs", overdue ? "text-bad" : "text-ink-muted")}>
                        {overdue ? "atrasado · " : ""}
                        {fmtRelative(fu.scheduled_at)}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    loading={completeFollowUp.isPending && completeFollowUp.variables === fu.id}
                    onClick={async () => {
                      await completeFollowUp.mutateAsync(fu.id);
                      toast("success", "Follow-up concluído");
                    }}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {interactions.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : interactions.isError ? (
          <ErrorState onRetry={() => interactions.refetch()} className="py-6" />
        ) : interactions.data.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-muted">
            Nenhuma interação ainda. Registre quando enviar a abordagem.
          </p>
        ) : (
          <ol className="relative space-y-3 border-l border-line-soft pl-4">
            {interactions.data.map((it) => (
              <li key={it.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -left-[21.5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-violet-300"
                />
                <div className="flex items-center gap-2 text-2xs text-ink-muted">
                  {it.created_by && <OperatorAvatar id={it.created_by} size="sm" />}
                  <span className="font-semibold text-ink-soft">{channelLabel(it.channel)}</span>
                  {it.direction && <span>({it.direction === "outbound" ? "enviado" : "recebido"})</span>}
                  {it.created_at && <span>· {fmtDateTime(it.created_at)}</span>}
                </div>
                {it.content && <p className="mt-1 text-sm text-ink-soft">{it.content}</p>}
              </li>
            ))}
          </ol>
        )}
      </div>

      <Dialog
        open={dialog === "interaction"}
        onClose={() => setDialog(null)}
        title={`Registrar interação — ${ctx.place.name}`}
      >
        <div className="space-y-3">
          <Field label="Canal">
            <Select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full">
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="O que aconteceu">
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex.: enviei a demo, visualizou e pediu preço"
            />
          </Field>
          <div className="flex items-center justify-between">
            {me.data?.operator && (
              <p className="text-2xs text-ink-muted">
                Registrando como <OperatorTag id={me.data.operator.id} />
              </p>
            )}
            <Button
              variant="primary"
              size="sm"
              className="ml-auto"
              disabled={!note.trim()}
              loading={addInteraction.isPending}
              onClick={async () => {
                await addInteraction.mutateAsync({
                  placeId,
                  channel: channel || null,
                  content: note.trim(),
                  createdBy: me.data?.operator?.id ?? null,
                });
                setNote("");
                setDialog(null);
                toast("success", "Interação registrada");
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={dialog === "followup"}
        onClose={() => setDialog(null)}
        title={`Agendar follow-up — ${ctx.place.name}`}
      >
        <div className="space-y-3">
          <Field label="Quando">
            <Select value={dueInDays} onChange={(e) => setDueInDays(e.target.value)} className="w-full">
              <option value="0">Hoje, mais tarde</option>
              <option value="1">Amanhã</option>
              <option value="2">Em 2 dias</option>
              <option value="3">Em 3 dias</option>
              <option value="7">Em 1 semana</option>
            </Select>
          </Field>
          <Field label="Lembrete">
            <Input
              value={fuNote}
              onChange={(e) => setFuNote(e.target.value)}
              placeholder="Ex.: cobrar resposta da proposta"
            />
          </Field>
          <div className="flex items-center justify-between">
            {me.data?.operator && (
              <p className="text-2xs text-ink-muted">
                Responsável: <OperatorTag id={me.data.operator.id} />
              </p>
            )}
            <Button
              variant="primary"
              size="sm"
              className="ml-auto"
              disabled={!fuNote.trim()}
              loading={addFollowUp.isPending}
              onClick={async () => {
                const due = new Date(
                  Date.now() + parseInt(dueInDays, 10) * 86_400_000 + 3 * 3_600_000
                );
                await addFollowUp.mutateAsync({
                  placeId,
                  scheduledAt: due.toISOString(),
                  note: fuNote.trim(),
                  createdBy: me.data?.operator?.id ?? null,
                });
                setFuNote("");
                setDialog(null);
                toast("success", "Follow-up agendado");
              }}
            >
              Agendar
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
