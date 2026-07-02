export const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${API}${path}`);
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export async function postJSON<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export type Stats = {
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
};

export type RankedLead = {
  place_id: string;
  name: string;
  category: string | null;
  rating: number | null;
  reviews_count: number | null;
  site_class: string | null;
  score: number;
  band: string;
  phone: string | null;
  instagram_handle: string | null;
  contacted: boolean;
  last_contact_at: string | null;
  stage: string | null;
};

export type LeadContext = {
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
    site_class: string;
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
    issues: { type: string; severity: string | null; description: string | null }[];
    screenshots: { viewport: string; path: string }[];
  } | null;
  score: {
    score: number;
    band: string;
    components: { component: string; weight: number; value: number }[];
  } | null;
};

export type Campaign = {
  id: number;
  name: string;
  category: string | null;
  status: string;
  max_pages: number;
};

export type Job = {
  id: number;
  campaign_id: number;
  term: string;
  region: string;
  page: number;
  status: string;
  attempts: number;
  results_count: number;
  error: string | null;
};

export type Settings = {
  app_env: string;
  api_daily_limit: number;
  api_monthly_limit: number;
  min_rating: number;
  min_reviews: number;
  min_score: number;
  google_key_set: boolean;
};

export type Category = { id: number; name: string; priority: number; active: boolean };
export type Region = { id: number; name: string; active: boolean };

export type CrmCard = {
  place_id: string;
  name: string;
  stage: string;
  score: number | null;
  band: string | null;
  site_class: string | null;
  phone: string | null;
  instagram_handle: string | null;
};

export type OutreachDraft = {
  id: number;
  place_id: string;
  channel: string;
  text: string;
  status: string;
};

export type Interaction = {
  id: number;
  place_id: string;
  channel: string | null;
  direction: string | null;
  content: string | null;
  created_at: string | null;
};

export type FollowUp = {
  id: number;
  place_id: string;
  type: string;
  scheduled_at: string | null;
  note: string | null;
  done: boolean;
  done_at: string | null;
};

export type FollowUpAgenda = FollowUp & { place_name: string | null };
