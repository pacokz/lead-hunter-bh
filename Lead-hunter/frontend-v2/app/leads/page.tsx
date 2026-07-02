"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Instagram,
  KanbanSquare,
  Phone,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { CrmStageBadge, ScoreBandBadge, SiteCategoryBadge } from "@/components/domain/badges";
import { Rating } from "@/components/domain/rating";
import { useCategories, useLeads, usePromoteQualified } from "@/lib/queries";
import { SCORE_BANDS, SITE_CATEGORIES } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RankedLead, ScoreBand, SiteCategory } from "@/lib/types";

const ALL = "__all__";
type ContactTab = "all" | "todo" | "contacted";

export default function LeadsPage() {
  const leads = useLeads();
  const categories = useCategories();
  const promote = usePromoteQualified();
  const { toast } = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<ContactTab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [band, setBand] = useState(ALL);
  const [site, setSite] = useState(ALL);
  const [crmFilter, setCrmFilter] = useState(ALL);

  const hasFilters = search !== "" || [category, band, site, crmFilter].some((f) => f !== ALL);

  const base = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (leads.data ?? []).filter((l) => {
      if (q && !l.name.toLowerCase().includes(q)) return false;
      if (category !== ALL && l.category !== category) return false;
      if (band !== ALL && l.band !== band) return false;
      if (site !== ALL && l.site_class !== site) return false;
      if (crmFilter === "in" && !l.stage) return false;
      if (crmFilter === "out" && l.stage) return false;
      return true;
    });
  }, [leads.data, search, category, band, site, crmFilter]);

  const contacted = base.filter((l) => l.contacted);
  const toContact = base.filter((l) => !l.contacted);
  const rows =
    tab === "contacted"
      ? [...contacted].sort((a, b) =>
          (b.last_contact_at ?? "").localeCompare(a.last_contact_at ?? "")
        )
      : tab === "todo"
        ? toContact
        : base;

  function clearFilters() {
    setSearch("");
    setCategory(ALL);
    setBand(ALL);
    setSite(ALL);
    setCrmFilter(ALL);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Leads"
        description="Ranqueados por score de oportunidade — quanto maior, melhor o candidato."
        action={
          <Button
            variant="primary"
            loading={promote.isPending}
            title="Move todos os leads ALTO POTENCIAL e PRIORIDADE que ainda não estão no CRM"
            onClick={async () => {
              const res = await promote.mutateAsync();
              toast(
                "success",
                res.promoted > 0
                  ? `${res.promoted} lead${res.promoted > 1 ? "s" : ""} promovido${res.promoted > 1 ? "s" : ""} pro CRM`
                  : "Nenhum lead novo pra promover"
              );
            }}
          >
            <KanbanSquare className="h-4 w-4" aria-hidden />
            Promover qualificados
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: "Todos", count: base.length },
          { value: "todo", label: "A contatar", count: toContact.length },
          { value: "contacted", label: "Contatados", count: contacted.length },
        ]}
        className="mb-3"
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="h-8 w-60 pl-8"
              aria-label="Buscar leads"
            />
          </div>
          <span className="mx-1 hidden h-5 w-px bg-line md:block" aria-hidden />
          <SlidersHorizontal className="hidden h-3.5 w-3.5 text-ink-faint md:block" aria-hidden />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8" aria-label="Filtrar por categoria">
            <option value={ALL}>Categoria</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </Select>
          <Select value={band} onChange={(e) => setBand(e.target.value)} className="h-8" aria-label="Filtrar por faixa de score">
            <option value={ALL}>Faixa de score</option>
            {(Object.keys(SCORE_BANDS) as ScoreBand[]).map((b) => (
              <option key={b} value={b}>{SCORE_BANDS[b].label}</option>
            ))}
          </Select>
          <Select value={site} onChange={(e) => setSite(e.target.value)} className="h-8" aria-label="Filtrar por categoria do site">
            <option value={ALL}>Site</option>
            {(Object.keys(SITE_CATEGORIES) as SiteCategory[]).map((s) => (
              <option key={s} value={s}>{SITE_CATEGORIES[s].label}</option>
            ))}
          </Select>
          <Select value={crmFilter} onChange={(e) => setCrmFilter(e.target.value)} className="h-8" aria-label="Filtrar por status no CRM">
            <option value={ALL}>CRM</option>
            <option value="in">No CRM</option>
            <option value="out">Fora do CRM</option>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Limpar
            </Button>
          )}
          <span className="tnum ml-auto text-xs text-ink-muted">
            {leads.data ? `${rows.length} de ${leads.data.length}` : "..."}
          </span>
        </div>

        {leads.isPending ? (
          <TableSkeleton rows={10} cols={6} />
        ) : leads.isError ? (
          <ErrorState message={String(leads.error)} onRetry={() => leads.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Nenhum lead com esses filtros" : "Nenhum lead pontuado ainda"}
            description={
              hasFilters
                ? "Afrouxe os filtros ou limpe tudo pra ver a lista completa."
                : "Crie uma campanha e rode o pipeline (auditoria + score) pra popular esta lista."
            }
            action={
              hasFilters ? (
                <Button size="sm" onClick={clearFilters}>Limpar filtros</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => router.push("/campaigns")}>
                  Ir pra Campanhas
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-16">Score</Th>
                <Th>Negócio</Th>
                <Th>Site</Th>
                <Th>Reputação</Th>
                <Th>Contato</Th>
                <Th>CRM</Th>
                <Th className="w-8"><span className="sr-only">Abrir</span></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <LeadRow
                  key={lead.place_id}
                  lead={lead}
                  onOpen={() => router.push(`/leads/${encodeURIComponent(lead.place_id)}`)}
                />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function LeadRow({ lead, onOpen }: { lead: RankedLead; onOpen: () => void }) {
  return (
    <Tr className="cursor-pointer" onClick={onOpen}>
      <Td>
        <span
          className={cn(
            "tnum inline-flex h-7 w-9 items-center justify-center rounded-ctrl font-display text-sm font-bold",
            lead.band === "PRIORIDADE" ? "bg-violet-500 text-white" : "bg-line-soft text-ink"
          )}
        >
          {lead.score}
        </span>
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="max-w-[320px] truncate text-sm font-semibold text-ink">{lead.name}</p>
            {lead.category && <p className="text-2xs text-ink-muted">{lead.category}</p>}
          </div>
          {lead.band === "PRIORIDADE" && <ScoreBandBadge band={lead.band} />}
        </div>
      </Td>
      <Td><SiteCategoryBadge category={lead.site_class} /></Td>
      <Td>
        {lead.rating !== null ? (
          <Rating rating={lead.rating} reviews={lead.reviews_count ?? 0} />
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        )}
      </Td>
      <Td>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1.5 text-ink-muted">
            {lead.phone && <Phone className="h-3.5 w-3.5" aria-label="Tem telefone" />}
            {lead.instagram_handle && <Instagram className="h-3.5 w-3.5" aria-label="Tem Instagram" />}
          </span>
          {lead.contacted && (
            <Badge className="border-ok-line bg-ok-bg text-ok">
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              {lead.last_contact_at ? fmtDate(lead.last_contact_at) : "contatado"}
            </Badge>
          )}
        </div>
      </Td>
      <Td>
        {lead.stage ? (
          <CrmStageBadge stage={lead.stage} />
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        )}
      </Td>
      <Td>
        <ChevronRight className="h-4 w-4 text-ink-faint" aria-hidden />
      </Td>
    </Tr>
  );
}
