"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./api";

export const qk = {
  stats: ["stats"] as const,
  leads: ["leads"] as const,
  lead: (id: string) => ["leads", id] as const,
  drafts: (leadId: string) => ["drafts", leadId] as const,
  interactions: (leadId: string) => ["interactions", leadId] as const,
  followUps: ["follow-ups"] as const,
  demos: ["demos"] as const,
  campaigns: ["campaigns"] as const,
  settings: ["settings"] as const,
};

export const useStats = () => useQuery({ queryKey: qk.stats, queryFn: api.getStats });
export const useLeads = () => useQuery({ queryKey: qk.leads, queryFn: api.getLeads });
export const useLead = (id: string) =>
  useQuery({ queryKey: qk.lead(id), queryFn: () => api.getLead(id) });
export const useDrafts = (leadId: string) =>
  useQuery({ queryKey: qk.drafts(leadId), queryFn: () => api.getDrafts(leadId) });
export const useInteractions = (leadId: string) =>
  useQuery({ queryKey: qk.interactions(leadId), queryFn: () => api.getInteractions(leadId) });
export const useFollowUps = () => useQuery({ queryKey: qk.followUps, queryFn: api.getFollowUps });
export const useDemos = () => useQuery({ queryKey: qk.demos, queryFn: api.getDemos });
export const useCampaigns = () => useQuery({ queryKey: qk.campaigns, queryFn: api.getCampaigns });
export const useSettings = () => useQuery({ queryKey: qk.settings, queryFn: api.getSettings });

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: readonly (readonly string[])[]) =>
    Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function usePromoteToCrm() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.promoteToCrm,
    onSuccess: () => invalidate(qk.leads, qk.stats),
  });
}

export function useSetCrmStage() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.setCrmStage,
    onSuccess: () => invalidate(qk.leads, qk.stats),
  });
}

export function useSetCrmOwner() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.setCrmOwner,
    onSuccess: () => invalidate(qk.leads),
  });
}

export function useAddInteraction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.addInteraction,
    onSuccess: (it) => invalidate(qk.interactions(it.leadId), qk.leads),
  });
}

export function useGenerateDraft() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ leadId, channel }: { leadId: string; channel: "WHATSAPP" | "INSTAGRAM" }) =>
      api.generateDraft(leadId, channel),
    onSuccess: (draft) => invalidate(qk.drafts(draft.leadId)),
  });
}

export function useAddFollowUp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.addFollowUp,
    onSuccess: () => invalidate(qk.followUps, qk.stats),
  });
}

export function useCompleteFollowUp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.completeFollowUp,
    onSuccess: () => invalidate(qk.followUps, qk.stats),
  });
}

export function useRequestDemo() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.requestDemo,
    onSuccess: () => invalidate(qk.demos, qk.leads, qk.stats),
  });
}

export function usePublishDemo() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.publishDemo,
    onSuccess: () => invalidate(qk.demos, qk.stats),
  });
}

export function useRerunQa() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.rerunQa,
    onSuccess: () => invalidate(qk.demos),
  });
}

export function useCreateCampaign() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.createCampaign,
    onSuccess: () => invalidate(qk.campaigns),
  });
}

export function useRunJob() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.runJob,
    onSuccess: () => invalidate(qk.campaigns, qk.settings, qk.leads, qk.stats),
  });
}

export function useSaveScoreWeights() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: api.saveScoreWeights,
    onSuccess: () => invalidate(qk.settings),
  });
}

export function useAddSetting() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ kind, value }: { kind: "categories" | "regions"; value: string }) =>
      api.addSetting(kind, value),
    onSuccess: () => invalidate(qk.settings),
  });
}

export function useRemoveSetting() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ kind, value }: { kind: "categories" | "regions"; value: string }) =>
      api.removeSetting(kind, value),
    onSuccess: () => invalidate(qk.settings),
  });
}
