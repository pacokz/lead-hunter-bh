import { Badge } from "@/components/ui/badge";
import {
  CRM_STAGES,
  ISSUE_SEVERITIES,
  normalizeSeverity,
  SCORE_BANDS,
  SITE_CATEGORIES,
} from "@/lib/domain";
import type { CrmStage, ScoreBand, SiteCategory } from "@/lib/types";

export function ScoreBandBadge({ band }: { band: ScoreBand }) {
  const cfg = SCORE_BANDS[band];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function SiteCategoryBadge({ category }: { category?: SiteCategory | null }) {
  if (!category) {
    return <Badge className="border-dashed border-line bg-transparent text-ink-faint">Não auditado</Badge>;
  }
  const cfg = SITE_CATEGORIES[category];
  if (!cfg) return <Badge className="bg-paper text-ink-muted border-line">{category}</Badge>;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function CrmStageBadge({ stage }: { stage: CrmStage }) {
  const cfg = CRM_STAGES[stage];
  if (!cfg) return <Badge className="bg-paper text-ink-muted border-line">{stage}</Badge>;
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function IssueSeverityBadge({ severity }: { severity: string | null }) {
  const cfg = ISSUE_SEVERITIES[normalizeSeverity(severity)];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
