"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
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
import {
  useCampaigns,
  useLeads,
  useMe,
  usePromoteQualified,
  usePromoteSingle,
} from "@/lib/queries";
import { SCORE_BANDS, SITE_CATEGORIES } from "@/lib/domain";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { RankedLead, ScoreBand, SiteCategory } from "@/lib/types";

const ALL = "__all__";
const PAGE_SIZE = 50;
type ContactTab = "all" | "todo" | "contacted";

export default function LeadsPage() {
  const leads = useLeads();
  const campaigns = useCampaigns();
  const me = useMe();
  const promote = usePromoteQualified();
  const promoteSingle = usePromoteSingle();
  const { toast } = useToast();
  const router = useRouter();

  const [tab, setTab] = useState<ContactTab>("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [band, setBand] = useState(ALL);
  const [site, setSite] = useState(ALL);
  const [crmFilter, setCrmFilter] = useState(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [tab, search, category, band, site, crmFilter]);

  const hasFilters = search !== "" || [category, band, site, crmFilter].some((f) => f !== ALL);

  // Nichos = categorias das campanhas já rodadas + categorias presentes nos
  // leads (não a lista bruta do Google) — mesmo critério da interface antiga.
  const niches = useMemo(() => {
    const set = new Set<string>();
    for (const c of campaigns.data ?? []) if (c.category) set.add(c.category);
    for (const l of leads.data ?? []) if (l.category) set.add(l.category);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [campaigns.data, leads.data]);

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

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectable = pageRows.filter((l) => !l.stage);
  const allSelected = selectable.length > 0 && selectable.every((l) => selected.has(l.place_id));

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) selectable.forEach((l) => next.delete(l.place_id));
      else selectable.forEach((l) => next.add(l.place_id));
      return next;
    });
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function promoteSelected() {
    const ids = [...selected];
    let ok = 0;
    for (const placeId of ids) {
      try {
        await promoteSingle.mutateAsync({ placeId, by: me.data?.operator?.id ?? null });
        ok += 1;
      } catch {
        // segue os demais; o toast final mostra o total
      }
    }
    setSelected(new Set());
    toast(ok > 0 ? "success" : "error", `${ok} de ${ids.length} promovido${ids.length > 1 ? "s" : ""} pro CRM`);
  }

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
              const res = await promote.mutateAsync(me.data?.operator?.id ?? null);
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
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8" aria-label="Filtrar por nicho">
            <option value={ALL}>Nicho</option>
            {niches.map((n) => (
              <option key={n} value={n}>{n}</option>
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

        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-violet-200 bg-violet-50 px-4 py-2 animate-fade-up">
            <p className="tnum text-sm font-medium text-violet-700">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </p>
            <Button variant="primary" size="sm" loading={promoteSingle.isPending} onClick={promoteSelected}>
              <KanbanSquare className="h-3.5 w-3.5" aria-hidden />
              Promover selecionados
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Cancelar
            </Button>
          </div>
        )}

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
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Selecionar leads fora do CRM desta página"
                      className="accent-violet-500"
                    />
                  </Th>
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
                {pageRows.map((lead) => (
                  <LeadRow
                    key={lead.place_id}
                    lead={lead}
                    checked={selected.has(lead.place_id)}
                    onToggle={() => toggle(lead.place_id)}
                    onOpen={() => router.push(`/leads/${encodeURIComponent(lead.place_id)}`)}
                  />
                ))}
              </tbody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-line-soft px-4 py-2.5">
                <p className="tnum text-xs text-ink-muted">
                  Página {safePage} de {totalPages} · {rows.length} leads
                </p>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden />
                    Anterior
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                    aria-label="Próxima página"
                  >
                    Próxima
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function LeadRow({
  lead,
  checked,
  onToggle,
  onOpen,
}: {
  lead: RankedLead;
  checked: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <Tr className="cursor-pointer" onClick={onOpen}>
      <Td onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          disabled={!!lead.stage}
          onChange={onToggle}
          aria-label={`Selecionar ${lead.name}`}
          title={lead.stage ? "Já está no CRM" : undefined}
          className="accent-violet-500 disabled:opacity-30"
        />
      </Td>
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
