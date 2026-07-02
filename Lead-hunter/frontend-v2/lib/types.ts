// Contratos espelhando o backend FastAPI (estubados — ver lib/api.ts).

export type OperatorId = "samuel" | "jose";

export interface Operator {
  id: OperatorId;
  name: string;
  shortName: string;
  initials: string;
}

export type ScoreBand =
  | "PRIORIDADE"
  | "ALTO_POTENCIAL"
  | "REVISAR"
  | "BAIXO_POTENCIAL"
  | "DESCARTAR";

export type SiteCategory =
  | "SEM_SITE"
  | "FORA_DO_AR"
  | "REDE_SOCIAL"
  | "SITE_OBSOLETO"
  | "SITE_FRACO"
  | "SITE_RAZOAVEL"
  | "SITE_BOM";

export type CrmStage =
  | "NOVO"
  | "QUALIFICADO"
  | "DEMO_PRONTA"
  | "CONTATO_PENDENTE"
  | "CONTATADO"
  | "FOLLOW_UP"
  | "RESPONDEU"
  | "REUNIAO"
  | "GANHO"
  | "PERDIDO";

export type IssueSeverity = "ALTA" | "MEDIA" | "BAIXA";

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  hint: string;
}

export interface Score {
  total: number;
  band: ScoreBand;
  components: ScoreComponent[];
  computedAt: string;
}

export interface AuditIssue {
  severity: IssueSeverity;
  label: string;
}

export interface SiteAudit {
  category: SiteCategory;
  url?: string;
  instagram?: string;
  hasWhatsapp: boolean;
  issues: AuditIssue[];
  auditedAt: string;
}

export interface CrmInfo {
  stage: CrmStage;
  owner: OperatorId;
  promotedBy: OperatorId;
  promotedAt: string;
  stageChangedAt: string;
}

export interface Lead {
  id: string;
  placeId: string;
  name: string;
  category: string;
  region: string;
  rating: number;
  reviews: number;
  phone?: string;
  address: string;
  score?: Score;
  audit?: SiteAudit;
  crm?: CrmInfo;
  demoId?: string;
  foundAt: string;
}

export type InteractionKind = "WHATSAPP" | "INSTAGRAM" | "LIGACAO" | "NOTA";

export interface Interaction {
  id: string;
  leadId: string;
  kind: InteractionKind;
  note: string;
  by: OperatorId;
  at: string;
}

export interface OutreachDraft {
  id: string;
  leadId: string;
  channel: "WHATSAPP" | "INSTAGRAM";
  text: string;
  generatedAt: string;
}

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  dueAt: string;
  note: string;
  owner: OperatorId;
  createdBy: OperatorId;
  done: boolean;
  doneBy?: OperatorId;
  doneAt?: string;
}

export type DemoStatus = "RASCUNHO" | "EM_QA" | "APROVADA" | "PUBLICADA";

export type QaSeverity = "BLOCKER" | "MAJOR" | "MINOR";

export interface QaIssue {
  severity: QaSeverity;
  viewport: "desktop" | "tablet" | "mobile";
  description: string;
}

export interface DemoQa {
  checkedAt: string;
  craftScore: number;
  issues: QaIssue[];
}

export interface Demo {
  id: string;
  leadId: string;
  leadName: string;
  slug: string;
  status: DemoStatus;
  publishedUrl?: string;
  qa?: DemoQa;
  createdBy: OperatorId;
  createdAt: string;
  themeSeed: number;
}

export type JobStatus = "PENDENTE" | "EXECUTANDO" | "CONCLUIDO" | "ERRO";

export interface SearchJob {
  id: string;
  campaignId: string;
  page: number;
  status: JobStatus;
  found: number;
  newLeads: number;
  executedAt?: string;
  error?: string;
}

export type CampaignStatus = "ATIVA" | "CONCLUIDA" | "PAUSADA";

export interface Campaign {
  id: string;
  category: string;
  region: string;
  term: string;
  status: CampaignStatus;
  createdBy: OperatorId;
  createdAt: string;
  jobs: SearchJob[];
}

export interface Quota {
  dailyUsed: number;
  dailyLimit: number;
  monthlyUsed: number;
  monthlyLimit: number;
}

export interface DashboardStats {
  leadsFound: number;
  leadsAudited: number;
  inCrm: number;
  demosReady: number;
  followUpsToday: number;
}

export interface ScoreWeights {
  siteOpportunity: number;
  reviews: number;
  rating: number;
  contact: number;
  segment: number;
}

export interface AppSettings {
  quota: Quota;
  scoreWeights: ScoreWeights;
  categories: string[];
  regions: string[];
}
