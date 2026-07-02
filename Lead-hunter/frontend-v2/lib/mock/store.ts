// Store mock em memória. TODOS os dados aqui são fictícios (marcados na UI).
// O score é derivado com as mesmas regras do backend real, pra componentes
// somarem o total e a UI ficar coerente.

import type {
  AppSettings,
  Campaign,
  CrmStage,
  Demo,
  FollowUp,
  Interaction,
  Lead,
  OperatorId,
  OutreachDraft,
  Score,
  SiteAudit,
  SiteCategory,
} from "../types";
import { bandForScore } from "../domain";

const now = Date.now();
const h = 3_600_000;
const d = 24 * h;

function iso(offsetMs: number) {
  return new Date(now + offsetMs).toISOString();
}

// ---------------------------------------------------------------- score

const SITE_POINTS: Record<SiteCategory, number> = {
  SEM_SITE: 40,
  FORA_DO_AR: 38,
  REDE_SOCIAL: 34,
  SITE_OBSOLETO: 30,
  SITE_FRACO: 22,
  SITE_RAZOAVEL: 12,
  SITE_BOM: 2,
};

const SEGMENT_POINTS: Record<string, number> = {
  Odontologia: 15,
  "Estética": 14,
  "Saúde": 13,
  Advocacia: 12,
  Arquitetura: 12,
  Pet: 11,
  "Alimentação": 10,
  Automotivo: 10,
  Contabilidade: 9,
  Fitness: 11,
};

function reviewPoints(reviews: number) {
  if (reviews >= 500) return 20;
  if (reviews >= 200) return 17;
  if (reviews >= 100) return 14;
  if (reviews >= 50) return 10;
  if (reviews >= 20) return 6;
  return 2;
}

function ratingPoints(rating: number) {
  return Math.max(0, Math.min(15, Math.round((rating - 3) * 7.5)));
}

function contactPoints(hasPhone: boolean, hasWhatsapp: boolean, hasInstagram: boolean) {
  if (hasPhone && hasWhatsapp) return 10;
  if (hasPhone) return 7;
  if (hasInstagram) return 3;
  return 0;
}

function buildScore(lead: {
  category: string;
  rating: number;
  reviews: number;
  phone?: string;
  audit: SiteAudit;
}): Score {
  const site = SITE_POINTS[lead.audit.category];
  const rev = reviewPoints(lead.reviews);
  const rat = ratingPoints(lead.rating);
  const con = contactPoints(!!lead.phone, lead.audit.hasWhatsapp, !!lead.audit.instagram);
  const seg = SEGMENT_POINTS[lead.category] ?? 8;
  const total = site + rev + rat + con + seg;
  return {
    total,
    band: bandForScore(total),
    computedAt: iso(-6 * h),
    components: [
      { key: "site", label: "Oportunidade de site", points: site, max: 40, hint: "Quanto pior a presença digital, maior a oportunidade" },
      { key: "reviews", label: "Volume de avaliações", points: rev, max: 20, hint: "Negócio movimentado tem mais a ganhar com site" },
      { key: "rating", label: "Nota no Google", points: rat, max: 15, hint: "Boa reputação facilita a venda" },
      { key: "contact", label: "Facilidade de contato", points: con, max: 10, hint: "Telefone + WhatsApp = abordagem direta" },
      { key: "segment", label: "Segmento", points: seg, max: 15, hint: "Peso do nicho na estratégia atual" },
    ],
  };
}

// ---------------------------------------------------------------- leads

interface LeadSeed {
  id: string;
  name: string;
  category: string;
  region: string;
  rating: number;
  reviews: number;
  phone?: string;
  address: string;
  audit: SiteAudit;
  foundDaysAgo: number;
}

function audit(
  category: SiteCategory,
  opts: Partial<Omit<SiteAudit, "category">> & { daysAgo?: number } = {}
): SiteAudit {
  const { daysAgo = 2, ...rest } = opts;
  return {
    category,
    hasWhatsapp: false,
    issues: [],
    auditedAt: iso(-daysAgo * d),
    ...rest,
  };
}

const seeds: LeadSeed[] = [
  {
    id: "ld_001", name: "Clínica Vitalle Odonto", category: "Odontologia", region: "Savassi",
    rating: 5.0, reviews: 312, phone: "(31) 3222-1840", address: "R. Pernambuco, 1122 — Savassi",
    foundDaysAgo: 4,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true, instagram: "@vitalleodonto",
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado (nem no Google, nem por heurística de domínio)" }],
    }),
  },
  {
    id: "ld_002", name: "Espaço Corpo & Pele", category: "Estética", region: "Lourdes",
    rating: 4.9, reviews: 208, phone: "(31) 99812-4471", address: "R. da Bahia, 2941 — Lourdes",
    foundDaysAgo: 4,
    audit: audit("REDE_SOCIAL", {
      hasWhatsapp: true, instagram: "@espacocorpoepele",
      issues: [
        { severity: "ALTA", label: "Presença digital é só o Instagram — sem domínio próprio" },
        { severity: "MEDIA", label: "Link da bio aponta para agregador genérico" },
      ],
    }),
  },
  {
    id: "ld_003", name: "Dr. Henrique Sales Advocacia", category: "Advocacia", region: "Funcionários",
    rating: 4.8, reviews: 87, phone: "(31) 3287-5510", address: "Av. Afonso Pena, 3130 — Funcionários",
    foundDaysAgo: 6,
    audit: audit("FORA_DO_AR", {
      url: "http://henriquesalesadv.com.br",
      issues: [
        { severity: "ALTA", label: "Domínio registrado mas servidor não responde (timeout)" },
        { severity: "MEDIA", label: "Certificado SSL expirado em 2024" },
      ],
    }),
  },
  {
    id: "ld_004", name: "Bella Farofa Gourmet", category: "Alimentação", region: "Centro",
    rating: 4.9, reviews: 540, phone: "(31) 98741-2203", address: "R. dos Caetés, 466 — Centro",
    foundDaysAgo: 8,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true, instagram: "@bellafarofa",
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado — vendas só por WhatsApp" }],
    }),
  },
  {
    id: "ld_005", name: "Auto Center Pampulha", category: "Automotivo", region: "Pampulha",
    rating: 4.7, reviews: 431, phone: "(31) 3491-8827", address: "Av. Fleming, 890 — Pampulha",
    foundDaysAgo: 8,
    audit: audit("SITE_OBSOLETO", {
      url: "http://autocenterpampulha.com.br",
      issues: [
        { severity: "ALTA", label: "Layout não responsivo — ilegível no celular" },
        { severity: "MEDIA", label: "Última atualização visível: 2019" },
        { severity: "MEDIA", label: "Sem HTTPS" },
        { severity: "BAIXA", label: "Fotos em baixa resolução" },
      ],
    }),
  },
  {
    id: "ld_006", name: "Studio Ana Nutri", category: "Saúde", region: "Sion",
    rating: 5.0, reviews: 96, phone: "(31) 99655-0912", address: "R. Grão Pará, 726 — Sion",
    foundDaysAgo: 3,
    audit: audit("REDE_SOCIAL", {
      hasWhatsapp: true, instagram: "@studioananutri",
      issues: [{ severity: "ALTA", label: "Sem site — atendimento agendado por DM" }],
    }),
  },
  {
    id: "ld_007", name: "Odonto Prime BH", category: "Odontologia", region: "Buritis",
    rating: 4.6, reviews: 154, phone: "(31) 3378-4401", address: "Av. Prof. Mário Werneck, 1550 — Buritis",
    foundDaysAgo: 5,
    audit: audit("SITE_FRACO", {
      url: "https://odontoprimebh.com.br",
      issues: [
        { severity: "MEDIA", label: "Template genérico sem identidade da marca" },
        { severity: "MEDIA", label: "Carregamento lento no 4G (LCP 6,2s)" },
        { severity: "BAIXA", label: "Sem botão de WhatsApp visível" },
      ],
    }),
  },
  {
    id: "ld_008", name: "Barbearia Dom Navalha", category: "Estética", region: "Castelo",
    rating: 4.9, reviews: 618, phone: "(31) 98430-7788", address: "R. Castelo de Windsor, 331 — Castelo",
    foundDaysAgo: 10,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true, instagram: "@domnavalha.bh",
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado — agenda lotada só pelo Instagram" }],
    }),
  },
  {
    id: "ld_009", name: "Contab Minas Assessoria", category: "Contabilidade", region: "Centro",
    rating: 4.5, reviews: 63, phone: "(31) 3271-9034", address: "Av. Amazonas, 718 — Centro",
    foundDaysAgo: 12,
    audit: audit("SITE_RAZOAVEL", {
      url: "https://contabminas.com.br",
      issues: [
        { severity: "MEDIA", label: "Conteúdo desatualizado (tabela de impostos de 2023)" },
        { severity: "BAIXA", label: "Formulário de contato sem confirmação de envio" },
      ],
    }),
  },
  {
    id: "ld_010", name: "Pet Villa Clínica Veterinária", category: "Pet", region: "Belvedere",
    rating: 4.8, reviews: 275, phone: "(31) 3286-6120", address: "Av. Luiz Paulo Franco, 403 — Belvedere",
    foundDaysAgo: 7,
    audit: audit("FORA_DO_AR", {
      url: "http://petvillabh.com.br",
      hasWhatsapp: true,
      issues: [
        { severity: "ALTA", label: "Site retorna erro 500 desde a primeira auditoria" },
      ],
    }),
  },
  {
    id: "ld_011", name: "Arquitetura Vila Horizonte", category: "Arquitetura", region: "Santa Efigênia",
    rating: 5.0, reviews: 41, phone: "(31) 99977-3141", address: "R. Piauí, 1201 — Santa Efigênia",
    foundDaysAgo: 9,
    audit: audit("REDE_SOCIAL", {
      instagram: "@vilahorizonte.arq",
      issues: [
        { severity: "ALTA", label: "Portfólio só no Instagram — sem site próprio" },
        { severity: "BAIXA", label: "Sem telefone comercial visível no perfil" },
      ],
    }),
  },
  {
    id: "ld_012", name: "Academia Corpus Fit", category: "Fitness", region: "Buritis",
    rating: 4.4, reviews: 389, phone: "(31) 3372-5560", address: "R. Eli Seabra Filho, 510 — Buritis",
    foundDaysAgo: 11,
    audit: audit("SITE_OBSOLETO", {
      url: "http://corpusfit.com.br",
      hasWhatsapp: true,
      issues: [
        { severity: "ALTA", label: "Site em Flash parcialmente quebrado" },
        { severity: "MEDIA", label: "Grade de horários de 2022" },
      ],
    }),
  },
  {
    id: "ld_013", name: "Clínica Sorriso do Cerrado", category: "Odontologia", region: "Pampulha",
    rating: 4.7, reviews: 502, phone: "(31) 3494-2210", address: "Av. Portugal, 2077 — Pampulha",
    foundDaysAgo: 5,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true,
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado" }],
    }),
  },
  {
    id: "ld_014", name: "Empório Sabor da Serra", category: "Alimentação", region: "Sion",
    rating: 4.8, reviews: 733, phone: "(31) 98122-9034", address: "R. Haití, 55 — Sion",
    foundDaysAgo: 15,
    audit: audit("SITE_FRACO", {
      url: "https://emporiosabordaserra.com.br",
      hasWhatsapp: true, instagram: "@sabordaserra.bh",
      issues: [
        { severity: "MEDIA", label: "Cardápio em PDF escaneado" },
        { severity: "MEDIA", label: "Sem pedido online — concorrentes têm" },
      ],
    }),
  },
  {
    id: "ld_015", name: "Ótica Panorama Centro", category: "Saúde", region: "Centro",
    rating: 4.3, reviews: 128, phone: "(31) 3224-7716", address: "R. Espírito Santo, 900 — Centro",
    foundDaysAgo: 14,
    audit: audit("SITE_RAZOAVEL", {
      url: "https://oticapanorama.com.br",
      issues: [{ severity: "BAIXA", label: "Catálogo sem preços nem estoque" }],
    }),
  },
  {
    id: "ld_016", name: "Mecânica Irmãos Rocha", category: "Automotivo", region: "Santa Efigênia",
    rating: 4.9, reviews: 267, phone: "(31) 3241-8890", address: "R. Conselheiro Rocha, 1430 — Santa Efigênia",
    foundDaysAgo: 6,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true,
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado — referência do bairro só no boca a boca" }],
    }),
  },
  {
    id: "ld_017", name: "Espaço Yoga Mantra", category: "Fitness", region: "Lourdes",
    rating: 5.0, reviews: 58, address: "R. Curitiba, 2233 — Lourdes",
    foundDaysAgo: 13,
    audit: audit("REDE_SOCIAL", {
      instagram: "@yogamantra.bh",
      issues: [
        { severity: "ALTA", label: "Sem site e sem telefone público — só DM" },
      ],
    }),
  },
  {
    id: "ld_018", name: "Dra. Camila Reis Dermatologia", category: "Saúde", region: "Savassi",
    rating: 4.9, reviews: 176, phone: "(31) 3261-4470", address: "R. Antônio de Albuquerque, 749 — Savassi",
    foundDaysAgo: 4,
    audit: audit("SITE_OBSOLETO", {
      url: "http://dracamilareis.com.br",
      hasWhatsapp: true, instagram: "@dracamilareis",
      issues: [
        { severity: "ALTA", label: "Site de 2017 sem versão mobile" },
        { severity: "MEDIA", label: "Agendamento é um formulário que ninguém responde (reclamação em review)" },
      ],
    }),
  },
  {
    id: "ld_019", name: "Café Alameda 47", category: "Alimentação", region: "Funcionários",
    rating: 4.6, reviews: 812, phone: "(31) 99340-1276", address: "Alameda Oscar Niemeyer, 47 — Vale do Sereno",
    foundDaysAgo: 16,
    audit: audit("SITE_BOM", {
      url: "https://cafealameda47.com.br",
      hasWhatsapp: true, instagram: "@cafealameda47",
      issues: [],
    }),
  },
  {
    id: "ld_020", name: "Advocacia Prado & Lima", category: "Advocacia", region: "Lourdes",
    rating: 4.7, reviews: 44, phone: "(31) 3292-6604", address: "R. Felipe dos Santos, 901 — Lourdes",
    foundDaysAgo: 9,
    audit: audit("SITE_FRACO", {
      url: "https://pradolima.adv.br",
      issues: [
        { severity: "MEDIA", label: "Site de uma página só, sem áreas de atuação" },
        { severity: "BAIXA", label: "Foto de banco de imagem no hero" },
      ],
    }),
  },
  {
    id: "ld_021", name: "Studio Pilates Vertical", category: "Fitness", region: "Belvedere",
    rating: 4.8, reviews: 91, phone: "(31) 98876-3320", address: "R. Senhora do Porto, 220 — Belvedere",
    foundDaysAgo: 3,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true, instagram: "@pilatesvertical",
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado" }],
    }),
  },
  {
    id: "ld_022", name: "Doceria Flor de Minas", category: "Alimentação", region: "Castelo",
    rating: 4.9, reviews: 356, phone: "(31) 99128-8455", address: "R. Castelo da Beira, 176 — Castelo",
    foundDaysAgo: 7,
    audit: audit("REDE_SOCIAL", {
      hasWhatsapp: true, instagram: "@flordeminasdoceria",
      issues: [
        { severity: "ALTA", label: "Encomendas só por Instagram — perde pedido fora do horário" },
      ],
    }),
  },
  {
    id: "ld_023", name: "Vet Center Buritis 24h", category: "Pet", region: "Buritis",
    rating: 4.5, reviews: 689, phone: "(31) 3377-2900", address: "Av. Cel. José Dias Bicalho, 88 — Buritis",
    foundDaysAgo: 10,
    audit: audit("SITE_OBSOLETO", {
      url: "http://vetcenterburitis.com.br",
      hasWhatsapp: true,
      issues: [
        { severity: "ALTA", label: "Página inicial mistura conteúdo de 3 clínicas antigas" },
        { severity: "MEDIA", label: "Telefone do site diferente do Google" },
      ],
    }),
  },
  {
    id: "ld_024", name: "Escritório Contábil Andrade", category: "Contabilidade", region: "Savassi",
    rating: 4.2, reviews: 27, phone: "(31) 3227-1180", address: "R. Sergipe, 1440 — Savassi",
    foundDaysAgo: 18,
    audit: audit("SEM_SITE", {
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado" }],
    }),
  },
  {
    id: "ld_025", name: "Clínica Face & Corpo Estética", category: "Estética", region: "Sion",
    rating: 4.7, reviews: 243, phone: "(31) 99902-5567", address: "R. Rio Verde, 85 — Sion",
    foundDaysAgo: 2,
    audit: audit("FORA_DO_AR", {
      url: "http://faceecorpo.com.br",
      hasWhatsapp: true, instagram: "@faceecorpo.bh",
      issues: [
        { severity: "ALTA", label: "Domínio expirado — página de estacionamento do registrador" },
      ],
    }),
  },
  {
    id: "ld_026", name: "Restaurante Tacho Mineiro", category: "Alimentação", region: "Pampulha",
    rating: 4.6, reviews: 1240, phone: "(31) 3496-7702", address: "Av. Otacílio Negrão de Lima, 3350 — Pampulha",
    foundDaysAgo: 20,
    audit: audit("SITE_RAZOAVEL", {
      url: "https://tachomineiro.com.br",
      hasWhatsapp: true,
      issues: [
        { severity: "MEDIA", label: "Reserva por telefone apenas — sem integração online" },
      ],
    }),
  },
  {
    id: "ld_027", name: "Dr. Otávio Nunes Ortodontia", category: "Odontologia", region: "Funcionários",
    rating: 4.8, reviews: 68, phone: "(31) 3226-9915", address: "R. dos Otoni, 442 — Funcionários",
    foundDaysAgo: 1,
    audit: audit("SEM_SITE", {
      hasWhatsapp: true, instagram: "@drotavionunes",
      issues: [{ severity: "ALTA", label: "Nenhum site encontrado" }],
    }),
  },
  {
    id: "ld_028", name: "Salão Raízes Afro", category: "Estética", region: "Centro",
    rating: 4.9, reviews: 417, phone: "(31) 98564-1099", address: "R. Curitiba, 832 — Centro",
    foundDaysAgo: 5,
    audit: audit("REDE_SOCIAL", {
      hasWhatsapp: true, instagram: "@raizesafro.bh",
      issues: [
        { severity: "ALTA", label: "Só Instagram — agenda por DM com fila de espera" },
      ],
    }),
  },
];

// alguns leads recém-buscados, ainda sem auditoria/score
interface RawLeadSeed {
  id: string;
  name: string;
  category: string;
  region: string;
  rating: number;
  reviews: number;
  phone?: string;
  address: string;
  foundDaysAgo: number;
}

const rawSeeds: RawLeadSeed[] = [
  { id: "ld_029", name: "Padaria Pão da Serra", category: "Alimentação", region: "Castelo", rating: 4.7, reviews: 933, phone: "(31) 3474-5522", address: "Av. Tancredo Neves, 1010 — Castelo", foundDaysAgo: 0 },
  { id: "ld_030", name: "Clínica OdontoVida Centro", category: "Odontologia", region: "Centro", rating: 4.4, reviews: 210, phone: "(31) 3222-8874", address: "Av. Augusto de Lima, 233 — Centro", foundDaysAgo: 0 },
  { id: "ld_031", name: "Estética Bella Luz", category: "Estética", region: "Buritis", rating: 4.8, reviews: 145, address: "R. Manoel Macedo, 62 — Buritis", foundDaysAgo: 0 },
];

function crm(
  stage: CrmStage,
  owner: OperatorId,
  promotedBy: OperatorId,
  promotedDaysAgo: number,
  stageChangedDaysAgo: number
) {
  return {
    stage,
    owner,
    promotedBy,
    promotedAt: iso(-promotedDaysAgo * d),
    stageChangedAt: iso(-stageChangedDaysAgo * d),
  };
}

export const leads: Lead[] = [
  ...seeds.map((s) => ({
    id: s.id,
    placeId: `mock_place_${s.id}`,
    name: s.name,
    category: s.category,
    region: s.region,
    rating: s.rating,
    reviews: s.reviews,
    phone: s.phone,
    address: s.address,
    audit: s.audit,
    score: buildScore(s),
    foundAt: iso(-s.foundDaysAgo * d),
  })),
  ...rawSeeds.map((s) => ({
    id: s.id,
    placeId: `mock_place_${s.id}`,
    name: s.name,
    category: s.category,
    region: s.region,
    rating: s.rating,
    reviews: s.reviews,
    phone: s.phone,
    address: s.address,
    foundAt: iso(-s.foundDaysAgo * d - 2 * h),
  })),
];

// CRM: 12 leads promovidos, espalhados pelos estágios reais
const crmAssignments: Array<[string, CrmStage, OperatorId, OperatorId, number, number]> = [
  ["ld_001", "DEMO_PRONTA", "samuel", "samuel", 3, 1],
  ["ld_002", "CONTATADO", "jose", "jose", 3, 1],
  ["ld_003", "NOVO", "samuel", "jose", 1, 1],
  ["ld_004", "FOLLOW_UP", "samuel", "samuel", 6, 2],
  ["ld_008", "RESPONDEU", "jose", "samuel", 8, 1],
  ["ld_010", "QUALIFICADO", "jose", "jose", 2, 2],
  ["ld_013", "CONTATO_PENDENTE", "samuel", "samuel", 4, 1],
  ["ld_016", "REUNIAO", "samuel", "samuel", 9, 2],
  ["ld_018", "QUALIFICADO", "jose", "samuel", 2, 1],
  ["ld_022", "CONTATADO", "jose", "jose", 5, 3],
  ["ld_025", "NOVO", "samuel", "samuel", 0, 0],
  ["ld_028", "GANHO", "samuel", "samuel", 14, 2],
];

for (const [id, stage, owner, promotedBy, pDays, sDays] of crmAssignments) {
  const lead = leads.find((l) => l.id === id)!;
  lead.crm = crm(stage, owner, promotedBy, pDays, sDays);
}

// ---------------------------------------------------------------- demos

export const demos: Demo[] = [
  {
    id: "dm_001",
    leadId: "ld_001",
    leadName: "Clínica Vitalle Odonto",
    slug: "vitalle-odonto",
    status: "PUBLICADA",
    publishedUrl: "https://vitalle-odonto.vercel.app",
    qa: { checkedAt: iso(-1 * d), craftScore: 8.5, issues: [] },
    createdBy: "samuel",
    createdAt: iso(-2 * d),
    themeSeed: 3,
  },
  {
    id: "dm_002",
    leadId: "ld_008",
    leadName: "Barbearia Dom Navalha",
    slug: "dom-navalha",
    status: "APROVADA",
    qa: {
      checkedAt: iso(-5 * h),
      craftScore: 7.8,
      issues: [{ severity: "MINOR", viewport: "mobile", description: "Espaçamento apertado entre cards de serviços" }],
    },
    createdBy: "jose",
    createdAt: iso(-1 * d),
    themeSeed: 7,
  },
  {
    id: "dm_003",
    leadId: "ld_004",
    leadName: "Bella Farofa Gourmet",
    slug: "bella-farofa",
    status: "EM_QA",
    qa: {
      checkedAt: iso(-2 * h),
      craftScore: 6.1,
      issues: [
        { severity: "BLOCKER", viewport: "mobile", description: "Overflow horizontal de 96px na seção de produtos" },
        { severity: "MAJOR", viewport: "desktop", description: "CTA do hero com contraste 2,3:1 (mínimo 4,5:1)" },
        { severity: "MINOR", viewport: "tablet", description: "Galeria quebra grade com 5 fotos" },
      ],
    },
    createdBy: "samuel",
    createdAt: iso(-8 * h),
    themeSeed: 1,
  },
  {
    id: "dm_004",
    leadId: "ld_002",
    leadName: "Espaço Corpo & Pele",
    slug: "corpo-e-pele",
    status: "EM_QA",
    qa: {
      checkedAt: iso(-3 * h),
      craftScore: 7.4,
      issues: [
        { severity: "MAJOR", viewport: "mobile", description: "Botão de WhatsApp cobre o preço no rodapé" },
      ],
    },
    createdBy: "jose",
    createdAt: iso(-10 * h),
    themeSeed: 5,
  },
  {
    id: "dm_005",
    leadId: "ld_016",
    leadName: "Mecânica Irmãos Rocha",
    slug: "irmaos-rocha",
    status: "RASCUNHO",
    createdBy: "samuel",
    createdAt: iso(-3 * h),
    themeSeed: 9,
  },
];

for (const dm of demos) {
  const lead = leads.find((l) => l.id === dm.leadId);
  if (lead) lead.demoId = dm.id;
}

// ---------------------------------------------------------------- follow-ups

export const followUps: FollowUp[] = [
  {
    id: "fu_001", leadId: "ld_004", leadName: "Bella Farofa Gourmet",
    dueAt: iso(2 * h), note: "Retornar sobre a demo — ela pediu pra ver versão com cardápio",
    owner: "samuel", createdBy: "samuel", done: false,
  },
  {
    id: "fu_002", leadId: "ld_002", leadName: "Espaço Corpo & Pele",
    dueAt: iso(5 * h), note: "Confirmar se recebeu o link da prévia no WhatsApp",
    owner: "jose", createdBy: "jose", done: false,
  },
  {
    id: "fu_003", leadId: "ld_008", leadName: "Barbearia Dom Navalha",
    dueAt: iso(-1 * d), note: "Responderam pedindo preço — mandar proposta dos dois planos",
    owner: "jose", createdBy: "samuel", done: false,
  },
  {
    id: "fu_004", leadId: "ld_016", leadName: "Mecânica Irmãos Rocha",
    dueAt: iso(1 * d + 3 * h), note: "Reunião confirmada às 14h na oficina — levar demo no tablet",
    owner: "samuel", createdBy: "samuel", done: false,
  },
  {
    id: "fu_005", leadId: "ld_022", leadName: "Doceria Flor de Minas",
    dueAt: iso(3 * d), note: "Dar um tempo — disse que decide depois da Páscoa",
    owner: "jose", createdBy: "jose", done: false,
  },
  {
    id: "fu_006", leadId: "ld_028", leadName: "Salão Raízes Afro",
    dueAt: iso(-2 * d), note: "Enviar contrato assinado e cronograma do projeto",
    owner: "samuel", createdBy: "samuel", done: true, doneBy: "samuel", doneAt: iso(-2 * d + 4 * h),
  },
];

// ---------------------------------------------------------------- interações

export const interactions: Interaction[] = [
  { id: "it_001", leadId: "ld_002", kind: "WHATSAPP", note: "Primeira abordagem enviada com link da demo", by: "jose", at: iso(-1 * d) },
  { id: "it_002", leadId: "ld_004", kind: "WHATSAPP", note: "Abordagem enviada — visualizou, não respondeu", by: "samuel", at: iso(-2 * d) },
  { id: "it_003", leadId: "ld_004", kind: "WHATSAPP", note: "Respondeu! Pediu versão com cardápio na demo", by: "samuel", at: iso(-1 * d) },
  { id: "it_004", leadId: "ld_008", kind: "INSTAGRAM", note: "DM enviada com a prévia — respondeu em 20min pedindo preço", by: "jose", at: iso(-1 * d) },
  { id: "it_005", leadId: "ld_016", kind: "LIGACAO", note: "Liguei, falei com o Sr. Geraldo. Reunião marcada pra quinta 14h", by: "samuel", at: iso(-2 * d) },
  { id: "it_006", leadId: "ld_022", kind: "WHATSAPP", note: "Abordagem enviada", by: "jose", at: iso(-3 * d) },
  { id: "it_007", leadId: "ld_028", kind: "NOTA", note: "FECHADO! Pacote completo R$ 12.000 — site + painel", by: "samuel", at: iso(-2 * d) },
];

// ---------------------------------------------------------------- rascunhos

export const drafts: OutreachDraft[] = [
  {
    id: "od_001",
    leadId: "ld_001",
    channel: "WHATSAPP",
    text:
      "Oi! Aqui é o Samuel, da Balmor 👋\n\nEncontrei a Clínica Vitalle no Google — nota 5.0 com mais de 300 avaliações, parabéns! Reparei que vocês ainda não têm um site, e com essa reputação isso significa paciente novo indo pro concorrente que aparece primeiro.\n\nEu montei uma prévia de como poderia ficar o site de vocês (leva 30s pra abrir):\n{link_demo}\n\nSe fizer sentido, te explico como funciona. Sem compromisso!",
    generatedAt: iso(-2 * d),
  },
  {
    id: "od_002",
    leadId: "ld_001",
    channel: "INSTAGRAM",
    text:
      "Oi, tudo bem? Vi o perfil de vocês e o tanto de avaliação 5 estrelas no Google 👏 Fiz uma prévia de site pra Vitalle que valoriza essa reputação — posso mandar o link?",
    generatedAt: iso(-2 * d),
  },
  {
    id: "od_003",
    leadId: "ld_004",
    channel: "WHATSAPP",
    text:
      "Oi! Sou o Samuel, da Balmor. A Bella Farofa apareceu na minha pesquisa de melhores avaliados do Centro — 540 avaliações é muita coisa!\n\nHoje quem procura vocês no Google não acha um site com os produtos. Montei uma prévia de como resolveria isso: {link_demo}\n\nPosso te mostrar?",
    generatedAt: iso(-3 * d),
  },
];

// ---------------------------------------------------------------- campanhas

export const campaigns: Campaign[] = [
  {
    id: "cp_001", category: "Odontologia", region: "Savassi", term: "clínica odontológica na Savassi",
    status: "CONCLUIDA", createdBy: "samuel", createdAt: iso(-6 * d),
    jobs: [
      { id: "jb_001", campaignId: "cp_001", page: 1, status: "CONCLUIDO", found: 20, newLeads: 14, executedAt: iso(-6 * d) },
      { id: "jb_002", campaignId: "cp_001", page: 2, status: "CONCLUIDO", found: 20, newLeads: 9, executedAt: iso(-6 * d + h) },
      { id: "jb_003", campaignId: "cp_001", page: 3, status: "CONCLUIDO", found: 12, newLeads: 4, executedAt: iso(-6 * d + 2 * h) },
    ],
  },
  {
    id: "cp_002", category: "Estética", region: "Lourdes", term: "clínica de estética em Lourdes",
    status: "CONCLUIDA", createdBy: "jose", createdAt: iso(-4 * d),
    jobs: [
      { id: "jb_004", campaignId: "cp_002", page: 1, status: "CONCLUIDO", found: 20, newLeads: 11, executedAt: iso(-4 * d) },
      { id: "jb_005", campaignId: "cp_002", page: 2, status: "CONCLUIDO", found: 17, newLeads: 6, executedAt: iso(-4 * d + h) },
    ],
  },
  {
    id: "cp_003", category: "Alimentação", region: "Castelo", term: "restaurantes e docerias no Castelo",
    status: "ATIVA", createdBy: "samuel", createdAt: iso(-3 * h),
    jobs: [
      { id: "jb_006", campaignId: "cp_003", page: 1, status: "CONCLUIDO", found: 20, newLeads: 12, executedAt: iso(-2 * h) },
      { id: "jb_007", campaignId: "cp_003", page: 2, status: "EXECUTANDO", found: 0, newLeads: 0 },
      { id: "jb_008", campaignId: "cp_003", page: 3, status: "PENDENTE", found: 0, newLeads: 0 },
    ],
  },
  {
    id: "cp_004", category: "Pet", region: "Buritis", term: "clínica veterinária no Buritis",
    status: "PAUSADA", createdBy: "jose", createdAt: iso(-2 * d),
    jobs: [
      { id: "jb_009", campaignId: "cp_004", page: 1, status: "CONCLUIDO", found: 20, newLeads: 8, executedAt: iso(-2 * d) },
      { id: "jb_010", campaignId: "cp_004", page: 2, status: "ERRO", found: 0, newLeads: 0, error: "Cota diária atingida (RESOURCE_EXHAUSTED)" },
      { id: "jb_011", campaignId: "cp_004", page: 3, status: "PENDENTE", found: 0, newLeads: 0 },
    ],
  },
];

// ---------------------------------------------------------------- settings

export const settings: AppSettings = {
  quota: { dailyUsed: 38, dailyLimit: 100, monthlyUsed: 412, monthlyLimit: 1500 },
  scoreWeights: { siteOpportunity: 40, reviews: 20, rating: 15, contact: 10, segment: 15 },
  categories: [
    "Odontologia", "Estética", "Saúde", "Advocacia", "Arquitetura",
    "Pet", "Alimentação", "Automotivo", "Contabilidade", "Fitness",
  ],
  regions: [
    "Savassi", "Lourdes", "Funcionários", "Sion", "Buritis",
    "Castelo", "Pampulha", "Centro", "Santa Efigênia", "Belvedere",
  ],
};

let idCounter = 100;
export function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}
