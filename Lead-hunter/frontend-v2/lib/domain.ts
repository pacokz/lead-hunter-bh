import type {
  CrmStage,
  DemoStatus,
  IssueSeverity,
  Operator,
  OperatorId,
  QaSeverity,
  ScoreBand,
  SiteCategory,
} from "./types";

export const OPERATORS: Record<OperatorId, Operator> = {
  samuel: { id: "samuel", name: "Samuel Armanelli", shortName: "Samuel", initials: "SA" },
  jose: { id: "jose", name: "José Vinícius", shortName: "José", initials: "JV" },
};

export const OPERATOR_LIST = Object.values(OPERATORS);

export const SCORE_BANDS: Record<ScoreBand, { label: string; className: string; dot: string }> = {
  PRIORIDADE: {
    label: "Prioridade",
    className: "bg-violet-500 text-white border-violet-500",
    dot: "bg-violet-500",
  },
  ALTO_POTENCIAL: {
    label: "Alto potencial",
    className: "bg-ok-bg text-ok border-ok-line",
    dot: "bg-ok",
  },
  REVISAR: {
    label: "Revisar",
    className: "bg-warn-bg text-warn border-warn-line",
    dot: "bg-warn",
  },
  BAIXO_POTENCIAL: {
    label: "Baixo potencial",
    className: "bg-paper text-ink-muted border-line",
    dot: "bg-ink-faint",
  },
  DESCARTAR: {
    label: "Descartar",
    className: "bg-bad-bg text-bad border-bad-line",
    dot: "bg-bad",
  },
};

export function bandForScore(total: number): ScoreBand {
  if (total >= 85) return "PRIORIDADE";
  if (total >= 70) return "ALTO_POTENCIAL";
  if (total >= 60) return "REVISAR";
  if (total >= 40) return "BAIXO_POTENCIAL";
  return "DESCARTAR";
}

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

export const DEMO_STATUSES: Record<DemoStatus, { label: string; className: string }> = {
  RASCUNHO: { label: "Rascunho", className: "bg-paper text-ink-muted border-line" },
  EM_QA: { label: "Em QA", className: "bg-warn-bg text-warn border-warn-line" },
  APROVADA: { label: "Aprovada", className: "bg-ok-bg text-ok border-ok-line" },
  PUBLICADA: { label: "Publicada", className: "bg-violet-500 text-white border-violet-500" },
};

export const ISSUE_SEVERITIES: Record<IssueSeverity, { label: string; className: string }> = {
  ALTA: { label: "Alta", className: "bg-bad-bg text-bad border-bad-line" },
  MEDIA: { label: "Média", className: "bg-warn-bg text-warn border-warn-line" },
  BAIXA: { label: "Baixa", className: "bg-paper text-ink-muted border-line" },
};

export const QA_SEVERITIES: Record<QaSeverity, { label: string; className: string }> = {
  BLOCKER: { label: "Blocker", className: "bg-bad-bg text-bad border-bad-line" },
  MAJOR: { label: "Major", className: "bg-warn-bg text-warn border-warn-line" },
  MINOR: { label: "Minor", className: "bg-paper text-ink-muted border-line" },
};

export function demoIsBlocked(issues: { severity: QaSeverity }[] | undefined, craftScore?: number) {
  const hasBlocker = (issues ?? []).some((i) => i.severity === "BLOCKER");
  const lowCraft = craftScore !== undefined && craftScore < 7;
  return hasBlocker || lowCraft;
}
