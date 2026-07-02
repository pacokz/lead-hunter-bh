// Camada de API estubada. Cada função espelha um endpoint FastAPI plausível
// (comentado ao lado) e resolve contra o store mock com latência simulada.
// Pra ligar no backend real: trocar o corpo por fetch() mantendo a assinatura.

import {
  campaigns,
  demos,
  drafts,
  followUps,
  interactions,
  leads,
  nextId,
  settings,
} from "./mock/store";
import { bandForScore, demoIsBlocked } from "./domain";
import { sleep } from "./utils";
import type {
  AppSettings,
  Campaign,
  CrmStage,
  DashboardStats,
  Demo,
  FollowUp,
  Interaction,
  InteractionKind,
  Lead,
  OperatorId,
  OutreachDraft,
  ScoreWeights,
} from "./types";

const LATENCY = () => 220 + Math.random() * 260;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

// GET /stats
export async function getStats(): Promise<DashboardStats> {
  await sleep(LATENCY());
  const today = new Date().toDateString();
  return {
    leadsFound: leads.length + 152, // total histórico simulado
    leadsAudited: leads.filter((l) => l.audit).length + 121,
    inCrm: leads.filter((l) => l.crm && l.crm.stage !== "PERDIDO").length,
    demosReady: demos.filter((d) => d.status === "APROVADA" || d.status === "PUBLICADA").length,
    followUpsToday: followUps.filter(
      (f) => !f.done && new Date(f.dueAt).toDateString() === today
    ).length,
  };
}

// GET /leads/ranked
export async function getLeads(): Promise<Lead[]> {
  await sleep(LATENCY());
  return clone(leads).sort((a, b) => (b.score?.total ?? -1) - (a.score?.total ?? -1));
}

// GET /leads/{id}/context
export async function getLead(id: string): Promise<Lead> {
  await sleep(LATENCY());
  const lead = leads.find((l) => l.id === id);
  if (!lead) throw new Error(`Lead ${id} não encontrado`);
  return clone(lead);
}

// GET /leads/{id}/outreach
export async function getDrafts(leadId: string): Promise<OutreachDraft[]> {
  await sleep(LATENCY());
  return clone(drafts.filter((d) => d.leadId === leadId));
}

// POST /leads/{id}/outreach
export async function generateDraft(leadId: string, channel: "WHATSAPP" | "INSTAGRAM"): Promise<OutreachDraft> {
  await sleep(600);
  const lead = leads.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead não encontrado");
  const gancho =
    lead.audit?.category === "SEM_SITE"
      ? "ainda não tem um site — e com essa reputação, é cliente indo pro concorrente que aparece primeiro"
      : lead.audit?.category === "FORA_DO_AR"
        ? "está com o site fora do ar — quem clica no Google hoje encontra um erro"
        : lead.audit?.category === "REDE_SOCIAL"
          ? "atende só pelo Instagram — um site próprio captura quem pesquisa no Google"
          : "tem um site que não faz jus à reputação de vocês";
  const text =
    channel === "WHATSAPP"
      ? `Oi! Aqui é o Samuel, da Balmor 👋\n\nEncontrei ${lead.name} no Google — nota ${lead.rating.toFixed(1)} com ${lead.reviews} avaliações, parabéns! Reparei que vocês ${gancho}.\n\nMontei uma prévia de como poderia ficar o site de vocês (leva 30s pra abrir):\n{link_demo}\n\nSe fizer sentido, te explico como funciona. Sem compromisso!`
      : `Oi, tudo bem? Vi o perfil de vocês e as ${lead.reviews} avaliações no Google 👏 Fiz uma prévia de site pra ${lead.name} — posso mandar o link?`;
  const draft: OutreachDraft = {
    id: nextId("od"),
    leadId,
    channel,
    text,
    generatedAt: new Date().toISOString(),
  };
  drafts.unshift(draft);
  return clone(draft);
}

// GET /leads/{id}/interactions
export async function getInteractions(leadId: string): Promise<Interaction[]> {
  await sleep(LATENCY());
  return clone(
    interactions
      .filter((i) => i.leadId === leadId)
      .sort((a, b) => b.at.localeCompare(a.at))
  );
}

// POST /leads/{id}/interactions
export async function addInteraction(input: {
  leadId: string;
  kind: InteractionKind;
  note: string;
  by: OperatorId;
}): Promise<Interaction> {
  await sleep(LATENCY());
  const it: Interaction = { id: nextId("it"), at: new Date().toISOString(), ...input };
  interactions.push(it);
  return clone(it);
}

// POST /crm/promote
export async function promoteToCrm(input: { leadId: string; by: OperatorId }): Promise<Lead> {
  await sleep(LATENCY());
  const lead = leads.find((l) => l.id === input.leadId);
  if (!lead) throw new Error("Lead não encontrado");
  if (!lead.crm) {
    lead.crm = {
      stage: "NOVO",
      owner: input.by,
      promotedBy: input.by,
      promotedAt: new Date().toISOString(),
      stageChangedAt: new Date().toISOString(),
    };
  }
  return clone(lead);
}

// POST /leads/{id}/crm/stage
export async function setCrmStage(input: {
  leadId: string;
  stage: CrmStage;
  by: OperatorId;
}): Promise<Lead> {
  await sleep(LATENCY());
  const lead = leads.find((l) => l.id === input.leadId);
  if (!lead?.crm) throw new Error("Lead não está no CRM");
  lead.crm.stage = input.stage;
  lead.crm.stageChangedAt = new Date().toISOString();
  return clone(lead);
}

// PATCH /leads/{id}/crm/owner
export async function setCrmOwner(input: { leadId: string; owner: OperatorId }): Promise<Lead> {
  await sleep(LATENCY());
  const lead = leads.find((l) => l.id === input.leadId);
  if (!lead?.crm) throw new Error("Lead não está no CRM");
  lead.crm.owner = input.owner;
  return clone(lead);
}

// GET /follow-ups
export async function getFollowUps(): Promise<FollowUp[]> {
  await sleep(LATENCY());
  return clone(followUps).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// POST /follow-ups
export async function addFollowUp(input: {
  leadId: string;
  dueAt: string;
  note: string;
  owner: OperatorId;
  createdBy: OperatorId;
}): Promise<FollowUp> {
  await sleep(LATENCY());
  const lead = leads.find((l) => l.id === input.leadId);
  if (!lead) throw new Error("Lead não encontrado");
  const fu: FollowUp = {
    id: nextId("fu"),
    leadName: lead.name,
    done: false,
    ...input,
  };
  followUps.push(fu);
  return clone(fu);
}

// POST /follow-ups/{id}/done
export async function completeFollowUp(input: { id: string; by: OperatorId }): Promise<FollowUp> {
  await sleep(LATENCY());
  const fu = followUps.find((f) => f.id === input.id);
  if (!fu) throw new Error("Follow-up não encontrado");
  fu.done = true;
  fu.doneBy = input.by;
  fu.doneAt = new Date().toISOString();
  return clone(fu);
}

// GET /demos
export async function getDemos(): Promise<Demo[]> {
  await sleep(LATENCY());
  return clone(demos).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// POST /leads/{id}/demo
export async function requestDemo(input: { leadId: string; by: OperatorId }): Promise<Demo> {
  await sleep(900);
  const lead = leads.find((l) => l.id === input.leadId);
  if (!lead) throw new Error("Lead não encontrado");
  if (lead.demoId) throw new Error("Este lead já tem uma demo");
  const slug = lead.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const demo: Demo = {
    id: nextId("dm"),
    leadId: lead.id,
    leadName: lead.name,
    slug,
    status: "RASCUNHO",
    createdBy: input.by,
    createdAt: new Date().toISOString(),
    themeSeed: Math.floor(Math.random() * 12),
  };
  demos.unshift(demo);
  lead.demoId = demo.id;
  return clone(demo);
}

// POST /demos/{id}/publish  (gate de QA replicado no servidor)
export async function publishDemo(input: { id: string; by: OperatorId }): Promise<Demo> {
  await sleep(1100);
  const demo = demos.find((d) => d.id === input.id);
  if (!demo) throw new Error("Demo não encontrada");
  if (demoIsBlocked(demo.qa?.issues, demo.qa?.craftScore)) {
    throw new Error("QA bloqueou a publicação: resolva os problemas graves antes");
  }
  if (!demo.qa) throw new Error("Rode o QA antes de publicar");
  demo.status = "PUBLICADA";
  demo.publishedUrl = `https://${demo.slug}.vercel.app`;
  return clone(demo);
}

// POST /demos/{id}/qa  (re-roda o QA — mock melhora o resultado)
export async function rerunQa(input: { id: string }): Promise<Demo> {
  await sleep(1400);
  const demo = demos.find((d) => d.id === input.id);
  if (!demo) throw new Error("Demo não encontrada");
  const previous = demo.qa;
  demo.qa = {
    checkedAt: new Date().toISOString(),
    craftScore: previous ? Math.min(9.2, previous.craftScore + 1.4) : 7.6,
    issues: (previous?.issues ?? []).filter((i) => i.severity === "MINOR"),
  };
  if (demo.status === "RASCUNHO" || demo.status === "EM_QA") {
    demo.status = demoIsBlocked(demo.qa.issues, demo.qa.craftScore) ? "EM_QA" : "APROVADA";
  }
  return clone(demo);
}

// GET /campaigns
export async function getCampaigns(): Promise<Campaign[]> {
  await sleep(LATENCY());
  return clone(campaigns).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// POST /campaigns
export async function createCampaign(input: {
  category: string;
  region: string;
  by: OperatorId;
}): Promise<Campaign> {
  await sleep(700);
  const id = nextId("cp");
  const campaign: Campaign = {
    id,
    category: input.category,
    region: input.region,
    term: `${input.category.toLowerCase()} em ${input.region}`,
    status: "ATIVA",
    createdBy: input.by,
    createdAt: new Date().toISOString(),
    jobs: [1, 2, 3].map((page) => ({
      id: nextId("jb"),
      campaignId: id,
      page,
      status: "PENDENTE" as const,
      found: 0,
      newLeads: 0,
    })),
  };
  campaigns.unshift(campaign);
  return clone(campaign);
}

// POST /jobs/{id}/execute
export async function runJob(input: { id: string }): Promise<Campaign> {
  await sleep(1600);
  const campaign = campaigns.find((c) => c.jobs.some((j) => j.id === input.id));
  if (!campaign) throw new Error("Job não encontrado");
  const job = campaign.jobs.find((j) => j.id === input.id)!;
  job.status = "CONCLUIDO";
  job.found = 12 + Math.floor(Math.random() * 9);
  job.newLeads = Math.floor(job.found * (0.4 + Math.random() * 0.3));
  job.executedAt = new Date().toISOString();
  job.error = undefined;
  settings.quota.dailyUsed += 1;
  settings.quota.monthlyUsed += 1;
  if (campaign.jobs.every((j) => j.status === "CONCLUIDO")) campaign.status = "CONCLUIDA";
  return clone(campaign);
}

// GET /settings
export async function getSettings(): Promise<AppSettings> {
  await sleep(LATENCY());
  return clone(settings);
}

// PUT /settings/score-weights
export async function saveScoreWeights(weights: ScoreWeights): Promise<AppSettings> {
  await sleep(500);
  settings.scoreWeights = { ...weights };
  return clone(settings);
}

// POST /settings/categories | /settings/regions
export async function addSetting(kind: "categories" | "regions", value: string): Promise<AppSettings> {
  await sleep(400);
  if (!settings[kind].includes(value)) settings[kind].push(value);
  return clone(settings);
}

export async function removeSetting(kind: "categories" | "regions", value: string): Promise<AppSettings> {
  await sleep(400);
  settings[kind] = settings[kind].filter((v) => v !== value);
  return clone(settings);
}

export { bandForScore };
