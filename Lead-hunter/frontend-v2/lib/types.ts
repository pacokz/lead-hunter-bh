// Tipos de visão da UI + contratos crus do backend FastAPI.

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

// ---------------------------------------------------------------- lista

export interface RankedLead {
  place_id: string;
  name: string;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  site_class: SiteCategory | null;
  score: number;
  band: ScoreBand;
  phone: string | null;
  instagram_handle: string | null;
  contacted: boolean;
  last_contact_at: string | null;
  stage: CrmStage | null;
}

// ---------------------------------------------------------------- detalhe

export interface ScoreComponent {
  component: string;
  weight: number;
  value: number;
}

export interface AuditIssue {
  type: string;
  severity: string | null;
  description: string | null;
}

export interface LeadContext {
  place: {
    place_id: string;
    name: string;
    category: string | null;
    address: string | null;
    phone: string | null;
    website: string | null;
    rating: number | null;
    reviews_count: number | null;
    instagram_handle: string | null;
    google_maps_uri: string | null;
    business_status: string | null;
  };
  pipeline_state: string | null;
  audit: {
    site_class: SiteCategory;
    https: boolean | null;
    responsive: boolean | null;
    http_status: number | null;
    final_url: string | null;
    response_time_s: number | null;
    title: string | null;
    meta_description: string | null;
    has_form: boolean | null;
    has_whatsapp: boolean | null;
    social_links: string[] | null;
    issues: AuditIssue[];
    screenshots: { viewport: string; path: string }[];
  } | null;
  score: {
    score: number;
    band: ScoreBand;
    components: ScoreComponent[];
  } | null;
}

// ---------------------------------------------------------------- crm

export interface CrmCard {
  place_id: string;
  name: string;
  stage: CrmStage;
  score: number | null;
  band: ScoreBand | null;
  site_class: SiteCategory | null;
  phone: string | null;
  instagram_handle: string | null;
  owner: string | null;
}

// ---------------------------------------------------------------- outreach / atividade

export interface OutreachDraft {
  id: number;
  place_id: string;
  channel: "WHATSAPP" | "INSTAGRAM" | "EMAIL";
  text: string;
  status: string;
}

export interface Interaction {
  id: number;
  place_id: string;
  channel: string | null;
  direction: string | null;
  content: string | null;
  created_at: string | null;
  created_by: string | null;
}

export interface FollowUp {
  id: number;
  place_id: string;
  type: string;
  scheduled_at: string | null;
  note: string | null;
  done: boolean;
  done_at: string | null;
  created_by: string | null;
}

export interface FollowUpAgenda extends FollowUp {
  place_name: string | null;
}

// ---------------------------------------------------------------- campanhas

export type CampaignStatus = "DRAFT" | "RUNNING" | "PAUSED" | "DONE";
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR";

export interface Campaign {
  id: number;
  name: string;
  category: string | null;
  status: CampaignStatus;
  max_pages: number;
}

export interface SearchJob {
  id: number;
  campaign_id: number;
  term: string;
  region: string;
  page: number;
  status: JobStatus;
  attempts: number;
  results_count: number;
  error: string | null;
}

// ---------------------------------------------------------------- stats / settings

export interface BackendStats {
  total_places: number;
  by_site_class: Record<string, number>;
  by_band: Record<string, number>;
  sem_site: number;
  sites_ruins: number;
  prioritarios: number;
  audited: number;
  scored: number;
  campaigns: number;
  jobs_error: number;
  api_today: number;
  api_month: number;
}

export interface BackendSettings {
  app_env: string;
  api_daily_limit: number;
  api_monthly_limit: number;
  min_rating: number;
  min_reviews: number;
  min_score: number;
  google_key_set: boolean;
}

export interface Category {
  id: number;
  name: string;
  priority: number;
  active: boolean;
}

export interface Region {
  id: number;
  name: string;
  active: boolean;
}

export interface DashboardStats {
  leadsFound: number;
  leadsAudited: number;
  prioritarios: number;
  inCrm: number;
  followUpsToday: number;
}

// ---------------------------------------------------------------- demos

export type DemoStatus = "RASCUNHO" | "EM_QA" | "APROVADA" | "PUBLICADA";

export interface Demo {
  slug: string;
  name: string;
  bairro: string | null;
  status: DemoStatus;
  published_url: string | null;
  craft_score: number | null;
  publishable: boolean | null;
  blockers: string[];
  craft_issues: string[];
  screenshots: Partial<Record<"desktop" | "tablet" | "mobile", string>>;
  preview_path: string | null;
  updated_at: string | null;
  place_id: string | null;
  lead_name: string | null;
}

export type DemoRequestStatus = "PENDING" | "IN_PROGRESS" | "PUBLISHED" | "CANCELLED";

export interface DemoRequest {
  id: number;
  place_id: string;
  place_name: string | null;
  status: DemoRequestStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
  files: string[];
}

// ---------------------------------------------------------------- identidade

export interface Me {
  email: string | null;
  authenticated: boolean;
  operator: {
    id: string;
    name: string;
    shortName: string;
    initials: string;
  } | null;
}
