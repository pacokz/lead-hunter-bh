"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export const qk = {
  me: ["me"] as const,
  demos: ["demos"] as const,
  demoRequests: (placeId?: string) =>
    placeId ? (["demo-requests", placeId] as const) : (["demo-requests"] as const),
  stats: ["stats"] as const,
  backendStats: ["backend-stats"] as const,
  leads: ["leads"] as const,
  leadContext: (id: string) => ["lead-context", id] as const,
  drafts: (id: string) => ["drafts", id] as const,
  interactions: (id: string) => ["interactions", id] as const,
  followUps: ["follow-ups"] as const,
  followUpsHistory: ["follow-ups-history"] as const,
  leadFollowUps: (id: string) => ["lead-follow-ups", id] as const,
  crm: ["crm"] as const,
  campaigns: ["campaigns"] as const,
  jobs: ["jobs"] as const,
  settings: ["settings"] as const,
  categories: ["categories"] as const,
  regions: ["regions"] as const,
};

export const useMe = () =>
  useQuery({ queryKey: qk.me, queryFn: api.getMe, staleTime: Infinity });
export const useDemos = () => useQuery({ queryKey: qk.demos, queryFn: api.getDemos });
export const useDemoRequests = (placeId?: string) =>
  useQuery({
    queryKey: qk.demoRequests(placeId),
    queryFn: () => api.getDemoRequests(placeId ? { placeId } : undefined),
  });
export const useStats = () => useQuery({ queryKey: qk.stats, queryFn: api.getStats });
export const useBackendStats = () =>
  useQuery({ queryKey: qk.backendStats, queryFn: api.getBackendStats });
export const useLeads = () => useQuery({ queryKey: qk.leads, queryFn: api.getLeads });
export const useLeadContext = (id: string) =>
  useQuery({ queryKey: qk.leadContext(id), queryFn: () => api.getLeadContext(id) });
export const useDrafts = (id: string) =>
  useQuery({ queryKey: qk.drafts(id), queryFn: () => api.getDrafts(id) });
export const useInteractions = (id: string) =>
  useQuery({ queryKey: qk.interactions(id), queryFn: () => api.getInteractions(id) });
export const useFollowUps = () =>
  useQuery({ queryKey: qk.followUps, queryFn: api.getUpcomingFollowUps });
export const useFollowUpsHistory = () =>
  useQuery({ queryKey: qk.followUpsHistory, queryFn: api.getFollowUpsHistory });
export const useLeadFollowUps = (id: string) =>
  useQuery({ queryKey: qk.leadFollowUps(id), queryFn: () => api.getLeadFollowUps(id) });
export const useCrmBoard = () => useQuery({ queryKey: qk.crm, queryFn: api.getCrmBoard });
export const useCampaigns = () => useQuery({ queryKey: qk.campaigns, queryFn: api.getCampaigns });
export const useJobs = () => useQuery({ queryKey: qk.jobs, queryFn: api.getJobs });
export const useBackendSettings = () =>
  useQuery({ queryKey: qk.settings, queryFn: api.getBackendSettings });
export const useCategories = () =>
  useQuery({ queryKey: qk.categories, queryFn: api.getCategories });
export const useRegions = () => useQuery({ queryKey: qk.regions, queryFn: api.getRegions });

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function usePromoteQualified() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.promoteQualified,
    onSuccess: () => invalidate(qk.crm, qk.leads, qk.stats),
  });
}

export function useSetCrmStage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.setCrmStage,
    onSuccess: () => invalidate(qk.crm, qk.leads, qk.stats),
  });
}

export function useCreateDemoRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDemoRequest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demo-requests"] }),
  });
}

export function useSetDemoRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.setDemoRequestStatus,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demo-requests"] }),
  });
}

export function useUploadDemoAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.uploadDemoAssets,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["demo-requests"] }),
  });
}

export function usePromoteSingle() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.promoteSingle,
    onSuccess: () => invalidate(qk.crm, qk.leads, qk.stats),
  });
}

export function useSetCrmOwner() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.setCrmOwner,
    onSuccess: () => invalidate(qk.crm),
  });
}

export function useGenerateDraft() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.generateDraft,
    onSuccess: (draft) => invalidate(qk.drafts(draft.place_id)),
  });
}

export function useAddInteraction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.addInteraction,
    onSuccess: (it) => invalidate(qk.interactions(it.place_id), qk.leads),
  });
}

export function useAddFollowUp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.addFollowUp,
    onSuccess: (fu) => invalidate(qk.followUps, qk.leadFollowUps(fu.place_id), qk.stats),
  });
}

export function useCompleteFollowUp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.completeFollowUp,
    onSuccess: () => invalidate(qk.followUps, qk.stats),
  });
}

export function useCreateCampaign() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.createCampaign,
    onSuccess: () => invalidate(qk.campaigns, qk.jobs),
  });
}

export function useRunJob() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.runJob,
    onSuccess: () => invalidate(qk.jobs, qk.campaigns, qk.backendStats, qk.stats, qk.leads),
  });
}

export function useRunPipeline() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.runPipeline,
    onSuccess: () => invalidate(qk.leads, qk.stats, qk.backendStats),
  });
}

export function useAddCategory() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.addCategory,
    onSuccess: () => invalidate(qk.categories),
  });
}

export function useAddRegion() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.addRegion,
    onSuccess: () => invalidate(qk.regions),
  });
}
