// Cliente da API real (FastAPI). O navegador chama /backend-api/* e o Next
// repassa pro backend via rewrite (next.config.mjs) — sem CORS, backend não exposto.

import type {
  BackendSettings,
  BackendStats,
  Campaign,
  Category,
  CrmCard,
  CrmStage,
  DashboardStats,
  FollowUp,
  FollowUpAgenda,
  Interaction,
  LeadContext,
  OutreachDraft,
  RankedLead,
  Region,
  SearchJob,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "/backend-api";

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

async function send<T>(method: "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

// ---------------------------------------------------------------- dashboard

export const getBackendStats = () => getJSON<BackendStats>("/stats");

export async function getStats(): Promise<DashboardStats> {
  const [stats, crm, upcoming] = await Promise.all([
    getJSON<BackendStats>("/stats"),
    getJSON<CrmCard[]>("/crm"),
    getJSON<FollowUpAgenda[]>("/follow-ups/upcoming"),
  ]);
  const today = new Date().toDateString();
  return {
    leadsFound: stats.total_places,
    leadsAudited: stats.audited,
    prioritarios: stats.prioritarios,
    inCrm: crm.filter((c) => c.stage !== "PERDIDO").length,
    followUpsToday: upcoming.filter(
      (f) => !f.done && f.scheduled_at && new Date(f.scheduled_at).toDateString() === today
    ).length,
  };
}

// ---------------------------------------------------------------- leads

export const getLeads = () => getJSON<RankedLead[]>("/leads/ranked?limit=500");

export const getLeadContext = (placeId: string) =>
  getJSON<LeadContext>(`/leads/${encodeURIComponent(placeId)}/context`);

// ---------------------------------------------------------------- crm

export const getCrmBoard = () => getJSON<CrmCard[]>("/crm");

export const promoteQualified = () =>
  send<{ promoted: number; place_ids: string[] }>("POST", "/crm/promote");

export const setCrmStage = (input: { placeId: string; stage: CrmStage }) =>
  send<CrmCard>(
    "POST",
    `/leads/${encodeURIComponent(input.placeId)}/crm/stage?stage=${input.stage}`
  );

// ---------------------------------------------------------------- outreach

export const getDrafts = (placeId: string) =>
  getJSON<OutreachDraft[]>(`/leads/${encodeURIComponent(placeId)}/outreach`);

export const generateDraft = (input: { placeId: string; channel: "WHATSAPP" | "INSTAGRAM" }) =>
  send<OutreachDraft>(
    "POST",
    `/leads/${encodeURIComponent(input.placeId)}/outreach?channel=${input.channel}`
  );

// ---------------------------------------------------------------- atividade

export const getInteractions = (placeId: string) =>
  getJSON<Interaction[]>(`/leads/${encodeURIComponent(placeId)}/interactions`);

export const addInteraction = (input: {
  placeId: string;
  channel: string | null;
  content: string;
}) =>
  send<Interaction>("POST", `/leads/${encodeURIComponent(input.placeId)}/interactions`, {
    channel: input.channel,
    direction: "outbound",
    content: input.content,
  });

export const getUpcomingFollowUps = () =>
  getJSON<FollowUpAgenda[]>("/follow-ups/upcoming?limit=200");

export const getLeadFollowUps = (placeId: string) =>
  getJSON<FollowUp[]>(`/leads/${encodeURIComponent(placeId)}/follow-ups`);

export const addFollowUp = (input: { placeId: string; scheduledAt: string; note: string }) =>
  send<FollowUp>("POST", `/leads/${encodeURIComponent(input.placeId)}/follow-ups`, {
    type: "mensagem",
    scheduled_at: input.scheduledAt,
    note: input.note,
  });

export const completeFollowUp = (id: number) =>
  send<FollowUp>("POST", `/follow-ups/${id}/done`);

// ---------------------------------------------------------------- campanhas

export const getCampaigns = () => getJSON<Campaign[]>("/campaigns");

export const getJobs = () => getJSON<SearchJob[]>("/jobs");

export const createCampaign = (input: {
  category: string;
  region: string;
  maxPages: number;
}) =>
  send<Campaign>("POST", "/campaigns", {
    name: `${input.category} — ${input.region}`,
    category: input.category,
    terms: [input.category],
    regions: [input.region],
    max_pages: input.maxPages,
  });

export const runJob = (id: number) => send<SearchJob>("POST", `/jobs/${id}/execute`);

export const runPipeline = () =>
  send<{ audited: number; scored: number }>("POST", "/pipeline/run");

// ---------------------------------------------------------------- settings

export const getBackendSettings = () => getJSON<BackendSettings>("/settings");
export const getCategories = () => getJSON<Category[]>("/categories");
export const getRegions = () => getJSON<Region[]>("/regions");

export const addCategory = (name: string) =>
  send<Category>("POST", "/categories", { name, priority: 0 });

export const addRegion = (name: string) => send<Region>("POST", "/regions", { name });
