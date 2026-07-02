import { Badge } from "@/components/ui/badge";
import {
  CRM_STAGES,
  DEMO_STATUSES,
  ISSUE_SEVERITIES,
  QA_SEVERITIES,
  SCORE_BANDS,
  SITE_CATEGORIES,
} from "@/lib/domain";
import type {
  CrmStage,
  DemoStatus,
  IssueSeverity,
  QaSeverity,
  ScoreBand,
  SiteCategory,
} from "@/lib/types";

export function ScoreBandBadge({ band }: { band: ScoreBand }) {
  const cfg = SCORE_BANDS[band];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function SiteCategoryBadge({ category }: { category?: SiteCategory }) {
  if (!category) {
    return <Badge className="border-dashed border-line bg-transparent text-ink-faint">Não auditado</Badge>;
  }
  const cfg = SITE_CATEGORIES[category];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function CrmStageBadge({ stage }: { stage: CrmStage }) {
  const cfg = CRM_STAGES[stage];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function DemoStatusBadge({ status }: { status: DemoStatus }) {
  const cfg = DEMO_STATUSES[status];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function IssueSeverityBadge({ severity }: { severity: IssueSeverity }) {
  const cfg = ISSUE_SEVERITIES[severity];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}

export function QaSeverityBadge({ severity }: { severity: QaSeverity }) {
  const cfg = QA_SEVERITIES[severity];
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}
