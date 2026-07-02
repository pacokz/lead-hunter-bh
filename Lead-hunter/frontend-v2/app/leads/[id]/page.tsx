"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarPlus,
  Globe,
  Instagram,
  KanbanSquare,
  MapPin,
  MessageCircle,
  MessageSquarePlus,
  MonitorSmartphone,
  Phone,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { ScoreRing } from "@/components/ui/score-ring";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  CrmStageBadge,
  IssueSeverityBadge,
  ScoreBandBadge,
  SiteCategoryBadge,
} from "@/components/domain/badges";
import { OperatorAvatar, OperatorPicker, OperatorTag } from "@/components/domain/operator";
import { Rating } from "@/components/domain/rating";
import { SiteShot } from "@/components/domain/site-shot";
import {
  useAddFollowUp,
  useAddInteraction,
  useDrafts,
  useGenerateDraft,
  useInteractions,
  useLead,
  usePromoteToCrm,
  useRequestDemo,
  useSetCrmOwner,
  useSetCrmStage,
} from "@/lib/queries";
import { useOperator } from "@/lib/operator";
import { CRM_STAGE_ORDER, CRM_STAGES, OPERATORS } from "@/lib/domain";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import type { CrmStage, InteractionKind, Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const lead = useLead(id);

  if (lead.isPending) {
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

  if (lead.isError) {
    return <ErrorState message={String(lead.error)} onRetry={() => lead.refetch()} />;
  }

  return <LeadDetail lead={lead.data} />;
}

function LeadDetail({ lead }: { lead: Lead }) {
  const { operatorId } = useOperator();
  const { toast } = useToast();
  const promote = usePromoteToCrm();
  const requestDemo = useRequestDemo();

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
            <h1 className="font-display text-xl font-bold tracking-tight text-ink">{lead.name}</h1>
            {lead.score && <ScoreBandBadge band={lead.score.band} />}
            <SiteCategoryBadge category={lead.audit?.category} />
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
            {lead.category} · {lead.region}
            <Rating rating={lead.rating} reviews={lead.reviews} />
            <span className="text-xs">encontrado {fmtRelative(lead.foundAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!lead.crm && lead.score && (
            <Button
              variant="secondary"
              loading={promote.isPending}
              onClick={async () => {
                await promote.mutateAsync({ leadId: lead.id, by: operatorId });
                toast("success", `Promovido pro CRM — responsável: ${OPERATORS[operatorId].shortName}`);
              }}
            >
              <KanbanSquare className="h-4 w-4" aria-hidden />
              Promover pro CRM
            </Button>
          )}
          {lead.demoId ? (
            <Button variant="primary" onClick={() => (window.location.href = "/demos")}>
              <MonitorSmartphone className="h-4 w-4" aria-hidden />
              Ver demo
            </Button>
          ) : (
            <Button
              variant="primary"
              loading={requestDemo.isPending}
              onClick={async () => {
                try {
                  await requestDemo.mutateAsync({ leadId: lead.id, by: operatorId });
                  toast("success", "Demo em rascunho criada — acompanhe na aba Demos");
                } catch (e) {
                  toast("error", e instanceof Error ? e.message : "Erro ao gerar demo");
                }
              }}
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Gerar demo
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <ScoreCard lead={lead} />
          <AuditCard lead={lead} />
          <OutreachCard lead={lead} />
        </div>
        <div className="space-y-4">
          <GoogleCard lead={lead} />
          <CrmCard lead={lead} />
          <InteractionsCard lead={lead} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ score

function ScoreCard({ lead }: { lead: Lead }) {
  if (!lead.score) {
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

  const { total, band, components, computedAt } = lead.score;

  return (
    <Card>
      <CardHeader
        title="Score de oportunidade"
        subtitle={`Determinístico e auditável — calculado ${fmtRelative(computedAt)}. A soma dos componentes é o total.`}
      />
      <div className="flex flex-col gap-5 px-4 pb-4 sm:flex-row sm:items-center">
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <ScoreRing score={total} band={band} size={84} />
          <ScoreBandBadge band={band} />
        </div>
        <dl className="min-w-0 flex-1 space-y-2.5">
          {components.map((c) => (
            <div key={c.key} title={c.hint}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <dt className="text-xs font-medium text-ink-soft">{c.label}</dt>
                <dd className="tnum text-xs font-semibold text-ink">
                  {c.points}
                  <span className="text-ink-faint">/{c.max}</span>
                </dd>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                <div
                  className={cn(
                    "h-full rounded-full",
                    c.points / c.max >= 0.75 ? "bg-violet-500" : c.points / c.max >= 0.4 ? "bg-violet-300" : "bg-line"
                  )}
                  style={{ width: `${(c.points / c.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ auditoria

function AuditCard({ lead }: { lead: Lead }) {
  const audit = lead.audit;

  return (
    <Card>
      <CardHeader
        title="Auditoria do site"
        subtitle={audit ? `Auditado ${fmtRelative(audit.auditedAt)}` : undefined}
        action={audit && <SiteCategoryBadge category={audit.category} />}
      />
      {!audit ? (
        <EmptyState
          icon={<Globe className="h-5 w-5" aria-hidden />}
          title="Não auditado ainda"
          description="A auditoria roda no pipeline diário ou sob demanda no backend."
        />
      ) : (
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            {audit.url && (
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Globe className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                <span className="font-medium">{audit.url.replace(/^https?:\/\//, "")}</span>
              </span>
            )}
            {audit.instagram && (
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Instagram className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {audit.instagram}
              </span>
            )}
            {audit.hasWhatsapp && (
              <span className="inline-flex items-center gap-1.5 text-ok">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                WhatsApp ativo
              </span>
            )}
            {!audit.url && !audit.instagram && (
              <span className="text-ink-muted">Nenhuma presença digital encontrada.</span>
            )}
          </div>

          {audit.issues.length > 0 ? (
            <ul className="space-y-1.5">
              {audit.issues.map((issue, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-ctrl border border-line-soft bg-paper/60 px-2.5 py-2"
                >
                  <IssueSeverityBadge severity={issue.severity} />
                  <span className="text-sm text-ink-soft">{issue.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">Nenhum problema registrado.</p>
          )}

          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-ink-muted">
              Screenshots da auditoria {audit.category === "SEM_SITE" && "(sem site pra capturar)"}
            </p>
            {audit.category === "SEM_SITE" ? (
              <div className="flex h-24 items-center justify-center rounded-ctrl border border-dashed border-line text-xs text-ink-faint">
                Nada capturado — o lead não tem site
              </div>
            ) : (
              <div className="grid grid-cols-[2fr_auto] gap-3">
                <SiteShot
                  seed={parseInt(lead.id.slice(-2), 10) || 0}
                  variant="desktop"
                  label={`Screenshot desktop ilustrativo de ${lead.name} (mock)`}
                />
                <SiteShot
                  seed={parseInt(lead.id.slice(-2), 10) || 0}
                  variant="mobile"
                  className="w-24"
                  label={`Screenshot mobile ilustrativo de ${lead.name} (mock)`}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ abordagem

function OutreachCard({ lead }: { lead: Lead }) {
  const drafts = useDrafts(lead.id);
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
                await generate.mutateAsync({ leadId: lead.id, channel });
                toast("success", "Rascunho gerado");
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
                    <span className="font-normal normal-case tracking-normal">
                      · {fmtDateTime(draft.generatedAt)}
                    </span>
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

function GoogleCard({ lead }: { lead: Lead }) {
  return (
    <Card>
      <CardHeader title="Dados do Google" subtitle="Vindos da Places API na coleta" />
      <div className="space-y-2.5 px-4 pb-4 text-sm">
        <p className="flex items-start gap-2 text-ink-soft">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
          {lead.address}
        </p>
        {lead.phone && (
          <p className="flex items-center gap-2 text-ink-soft">
            <Phone className="h-3.5 w-3.5 shrink-0 text-ink-faint" aria-hidden />
            <span className="tnum">{lead.phone}</span>
          </p>
        )}
        <div
          role="img"
          aria-label="Mapa ilustrativo da localização (mock)"
          className="relative mt-2 h-28 overflow-hidden rounded-ctrl border border-line bg-[linear-gradient(135deg,#EEF1F4_25%,#E6EAEF_25%,#E6EAEF_50%,#EEF1F4_50%,#EEF1F4_75%,#E6EAEF_75%)] bg-[length:24px_24px]"
        >
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
            <MapPin className="h-6 w-6 fill-violet-500 text-white drop-shadow" aria-hidden />
          </span>
          <span className="absolute bottom-1 right-1 rounded-sm bg-carbon/80 px-1 py-px text-[8px] font-medium uppercase tracking-wide text-white">
            mapa mock
          </span>
        </div>
        <p className="text-2xs text-ink-faint">
          place_id: <span className="tnum">{lead.placeId}</span>
        </p>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ crm

function CrmCard({ lead }: { lead: Lead }) {
  const { operatorId } = useOperator();
  const setStage = useSetCrmStage();
  const setOwner = useSetCrmOwner();
  const promote = usePromoteToCrm();
  const { toast } = useToast();

  if (!lead.crm) {
    return (
      <Card>
        <CardHeader title="CRM" />
        <EmptyState
          className="py-8"
          icon={<KanbanSquare className="h-5 w-5" aria-hidden />}
          title="Fora do CRM"
          description={
            lead.score
              ? "Promova esse lead pra começar a trabalhar a abordagem."
              : "Rode auditoria + score antes de promover."
          }
          action={
            lead.score && (
              <Button
                size="sm"
                variant="primary"
                loading={promote.isPending}
                onClick={async () => {
                  await promote.mutateAsync({ leadId: lead.id, by: operatorId });
                  toast("success", `Promovido — responsável: ${OPERATORS[operatorId].shortName}`);
                }}
              >
                Promover pro CRM
              </Button>
            )
          }
        />
      </Card>
    );
  }

  const crm = lead.crm;

  return (
    <Card>
      <CardHeader title="CRM" action={<CrmStageBadge stage={crm.stage} />} />
      <div className="space-y-3 px-4 pb-4">
        <Field label="Estágio">
          <Select
            value={crm.stage}
            disabled={setStage.isPending}
            onChange={async (e) => {
              await setStage.mutateAsync({
                leadId: lead.id,
                stage: e.target.value as CrmStage,
                by: operatorId,
              });
              toast("success", `Estágio atualizado por ${OPERATORS[operatorId].shortName}`);
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
          <OperatorPicker
            value={crm.owner}
            onChange={async (owner) => {
              await setOwner.mutateAsync({ leadId: lead.id, owner });
              toast("success", `Responsável agora é ${OPERATORS[owner].shortName}`);
            }}
          />
        </div>
        <p className="border-t border-line-soft pt-2.5 text-2xs text-ink-muted">
          Promovido por <OperatorTag id={crm.promotedBy} /> em {fmtDate(crm.promotedAt)} · último
          movimento {fmtRelative(crm.stageChangedAt)}
        </p>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ interações + follow-ups

const KIND_LABELS: Record<InteractionKind, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  LIGACAO: "Ligação",
  NOTA: "Nota",
};

function InteractionsCard({ lead }: { lead: Lead }) {
  const interactions = useInteractions(lead.id);
  const addInteraction = useAddInteraction();
  const addFollowUp = useAddFollowUp();
  const { operatorId } = useOperator();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<"interaction" | "followup" | null>(null);
  const [kind, setKind] = useState<InteractionKind>("WHATSAPP");
  const [note, setNote] = useState("");
  const [dueInDays, setDueInDays] = useState("1");
  const [fuNote, setFuNote] = useState("");

  return (
    <Card>
      <CardHeader
        title="Atividade"
        subtitle="Interações registradas — quem fez o quê"
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
            Nenhuma interação ainda. Registre a primeira abordagem quando enviar.
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
                  <OperatorAvatar id={it.by} size="sm" />
                  <span className="font-semibold text-ink-soft">{OPERATORS[it.by].shortName}</span>
                  <span>{KIND_LABELS[it.kind]}</span>
                  <span>· {fmtDateTime(it.at)}</span>
                </div>
                <p className="mt-1 text-sm text-ink-soft">{it.note}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <Dialog
        open={dialog === "interaction"}
        onClose={() => setDialog(null)}
        title={`Registrar interação — ${lead.name}`}
      >
        <div className="space-y-3">
          <Field label="Canal">
            <Select value={kind} onChange={(e) => setKind(e.target.value as InteractionKind)} className="w-full">
              {(Object.keys(KIND_LABELS) as InteractionKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
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
            <p className="text-2xs text-ink-muted">
              Registrando como <OperatorTag id={operatorId} />
            </p>
            <Button
              variant="primary"
              size="sm"
              disabled={!note.trim()}
              loading={addInteraction.isPending}
              onClick={async () => {
                await addInteraction.mutateAsync({ leadId: lead.id, kind, note: note.trim(), by: operatorId });
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
        title={`Agendar follow-up — ${lead.name}`}
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
            <p className="text-2xs text-ink-muted">
              Responsável: <OperatorTag id={operatorId} />
            </p>
            <Button
              variant="primary"
              size="sm"
              disabled={!fuNote.trim()}
              loading={addFollowUp.isPending}
              onClick={async () => {
                const due = new Date(Date.now() + parseInt(dueInDays, 10) * 86_400_000 + 3 * 3_600_000);
                await addFollowUp.mutateAsync({
                  leadId: lead.id,
                  dueAt: due.toISOString(),
                  note: fuNote.trim(),
                  owner: operatorId,
                  createdBy: operatorId,
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
