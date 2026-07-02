import type { CampaignStatus, CrmStage, IssueSeverity, JobStatus, ScoreBand, SiteCategory } from "./types";

export const SCORE_BANDS: Record<ScoreBand, { label: string; className: string }> = {
  PRIORIDADE: {
    label: "Prioridade",
    className: "bg-violet-500 text-white border-violet-500",
  },
  ALTO_POTENCIAL: {
    label: "Alto potencial",
    className: "bg-ok-bg text-ok border-ok-line",
  },
  REVISAR: {
    label: "Revisar",
    className: "bg-warn-bg text-warn border-warn-line",
  },
  BAIXO_POTENCIAL: {
    label: "Baixo potencial",
    className: "bg-paper text-ink-muted border-line",
  },
  DESCARTAR: {
    label: "Descartar",
    className: "bg-bad-bg text-bad border-bad-line",
  },
};

export const SITE_CATEGORIES: Record<SiteCategory, { label: string; className: string }> = {
  SEM_SITE: { label: "Sem site", className: "bg-bad-bg text-bad border-bad-line" },
  FORA_DO_AR: { label: "Fora do ar", className: "bg-warn-bg text-warn border-warn-line" },
  REDE_SOCIAL: { label: "Só rede social", className: "bg-rose2-bg text-rose2 border-rose2-line" },
  SITE_OBSOLETO: { label: "Site obsoleto", className: "bg-warn-bg text-warn border-warn-line" },
  SITE_FRACO: { label: "Site fraco", className: "bg-sky2-bg text-sky2 border-sky2-line" },
  SITE_RAZOAVEL: { label: "Site razoável", className: "bg-paper text-ink-muted border-line" },
  SITE_BOM: { label: "Site bom", className: "bg-ok-bg text-ok border-ok-line" },
};

export const CRM_STAGES: Record<CrmStage, { label: string; className: string }> = {
  NOVO: { label: "Novo", className: "bg-paper text-ink-soft border-line" },
  QUALIFICADO: { label: "Qualificado", className: "bg-sky2-bg text-sky2 border-sky2-line" },
  DEMO_PRONTA: { label: "Demo pronta", className: "bg-violet-100 text-violet-700 border-violet-200" },
  CONTATO_PENDENTE: { label: "Contato pendente", className: "bg-warn-bg text-warn border-warn-line" },
  CONTATADO: { label: "Contatado", className: "bg-sky2-bg text-sky2 border-sky2-line" },
  FOLLOW_UP: { label: "Follow-up", className: "bg-warn-bg text-warn border-warn-line" },
  RESPONDEU: { label: "Respondeu", className: "bg-teal2-bg text-teal2 border-teal2-line" },
  REUNIAO: { label: "Reunião", className: "bg-violet-100 text-violet-700 border-violet-200" },
  GANHO: { label: "Ganho", className: "bg-ok-bg text-ok border-ok-line" },
  PERDIDO: { label: "Perdido", className: "bg-paper text-ink-faint border-line" },
};

export const CRM_STAGE_ORDER: CrmStage[] = [
  "NOVO",
  "QUALIFICADO",
  "DEMO_PRONTA",
  "CONTATO_PENDENTE",
  "CONTATADO",
  "FOLLOW_UP",
  "RESPONDEU",
  "REUNIAO",
  "GANHO",
  "PERDIDO",
];

export const ISSUE_SEVERITIES: Record<IssueSeverity, { label: string; className: string }> = {
  ALTA: { label: "Alta", className: "bg-bad-bg text-bad border-bad-line" },
  MEDIA: { label: "Média", className: "bg-warn-bg text-warn border-warn-line" },
  BAIXA: { label: "Baixa", className: "bg-paper text-ink-muted border-line" },
};

export function normalizeSeverity(s: string | null): IssueSeverity {
  const up = (s ?? "").toUpperCase();
  if (up === "ALTA" || up === "MEDIA" || up === "BAIXA") return up;
  return "MEDIA";
}

// Componentes do score como o backend grava (score_service.compute)
export const SCORE_COMPONENT_LABELS: Record<string, { label: string; hint: string }> = {
  site_oportunidade: {
    label: "Oportunidade de site",
    hint: "Quanto pior a presença digital, maior a oportunidade",
  },
  reviews: { label: "Volume de avaliações", hint: "Negócio movimentado tem mais a ganhar com site" },
  nota: { label: "Nota no Google", hint: "Boa reputação facilita a venda" },
  contato: { label: "Facilidade de contato", hint: "Telefone + WhatsApp = abordagem direta" },
  segmento: { label: "Segmento", hint: "Peso do nicho na estratégia atual" },
};

export const CAMPAIGN_STATUSES: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-paper text-ink-muted border-line" },
  RUNNING: { label: "Ativa", className: "bg-violet-100 text-violet-700 border-violet-200" },
  PAUSED: { label: "Pausada", className: "bg-warn-bg text-warn border-warn-line" },
  DONE: { label: "Concluída", className: "bg-ok-bg text-ok border-ok-line" },
};

export const JOB_STATUSES: Record<JobStatus, { label: string; className: string }> = {
  PENDING: { label: "Pendente", className: "bg-paper text-ink-muted border-line" },
  RUNNING: { label: "Executando", className: "bg-sky2-bg text-sky2 border-sky2-line" },
  DONE: { label: "Concluído", className: "bg-ok-bg text-ok border-ok-line" },
  ERROR: { label: "Erro", className: "bg-bad-bg text-bad border-bad-line" },
};
