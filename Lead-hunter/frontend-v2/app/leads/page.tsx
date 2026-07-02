"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Instagram, Phone, Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState, ErrorState, TableSkeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { ScoreBandBadge, SiteCategoryBadge, CrmStageBadge } from "@/components/domain/badges";
import { OperatorAvatar } from "@/components/domain/operator";
import { Rating } from "@/components/domain/rating";
import { useLeads, usePromoteToCrm, useSettings } from "@/lib/queries";
import { useOperator } from "@/lib/operator";
import { SCORE_BANDS, OPERATOR_LIST, OPERATORS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import type { Lead, ScoreBand, SiteCategory } from "@/lib/types";
import { SITE_CATEGORIES } from "@/lib/domain";

const ALL = "__all__";

export default function LeadsPage() {
  const leads = useLeads();
  const settings = useSettings();
  const promote = usePromoteToCrm();
  const { operatorId } = useOperator();
  const { toast } = useToast();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [region, setRegion] = useState(ALL);
  const [band, setBand] = useState(ALL);
  const [site, setSite] = useState(ALL);
  const [crmFilter, setCrmFilter] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const hasFilters =
    search !== "" || [category, region, band, site, crmFilter, owner].some((f) => f !== ALL);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (leads.data ?? []).filter((l) => {
      if (q && !l.name.toLowerCase().includes(q) && !l.address.toLowerCase().includes(q))
        return false;
      if (category !== ALL && l.category !== category) return false;
      if (region !== ALL && l.region !== region) return false;
      if (band !== ALL && l.score?.band !== band) return false;
      if (site !== ALL && l.audit?.category !== site) return false;
      if (crmFilter === "in" && !l.crm) return false;
      if (crmFilter === "out" && l.crm) return false;
      if (owner !== ALL && l.crm?.owner !== owner) return false;
      return true;
    });
  }, [leads.data, search, category, region, band, site, crmFilter, owner]);

  const selectable = filtered.filter((l) => !l.crm && l.score);
  const allSelected = selectable.length > 0 && selectable.every((l) => selected.has(l.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(selectable.map((l) => l.id)));
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
    for (const leadId of ids) {
      await promote.mutateAsync({ leadId, by: operatorId });
    }
    toast("success", `${ids.length} lead${ids.length > 1 ? "s" : ""} promovido${ids.length > 1 ? "s" : ""} pro CRM por ${OPERATORS[operatorId].shortName}`);
    setSelected(new Set());
  }

  function clearFilters() {
    setSearch("");
    setCategory(ALL);
    setRegion(ALL);
    setBand(ALL);
    setSite(ALL);
    setCrmFilter(ALL);
    setOwner(ALL);
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Leads"
        description="Ranqueados por score de oportunidade — quanto maior, melhor o candidato."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3 py-2.5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou endereço..."
              className="h-8 w-60 pl-8"
              aria-label="Buscar leads"
            />
          </div>
          <span className="mx-1 hidden h-5 w-px bg-line md:block" aria-hidden />
          <SlidersHorizontal className="hidden h-3.5 w-3.5 text-ink-faint md:block" aria-hidden />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8" aria-label="Filtrar por categoria">
            <option value={ALL}>Categoria</option>
            {(settings.data?.categories ?? []).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
          <Select value={region} onChange={(e) => setRegion(e.target.value)} className="h-8" aria-label="Filtrar por região">
            <option value={ALL}>Região</option>
            {(settings.data?.regions ?? []).map((r) => (
              <option key={r} value={r}>{r}</option>
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
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="h-8" aria-label="Filtrar por responsável">
            <option value={ALL}>Responsável</option>
            {OPERATOR_LIST.map((op) => (
              <option key={op.id} value={op.id}>{op.shortName}</option>
            ))}
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" aria-hidden />
              Limpar
            </Button>
          )}
          <span className="tnum ml-auto text-xs text-ink-muted">
            {leads.data ? `${filtered.length} de ${leads.data.length}` : "..."}
          </span>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-3 border-b border-violet-200 bg-violet-50 px-4 py-2 animate-fade-up">
            <p className="tnum text-sm font-medium text-violet-700">
              {selected.size} selecionado{selected.size > 1 ? "s" : ""}
            </p>
            <Button
              variant="primary"
              size="sm"
              loading={promote.isPending}
              onClick={promoteSelected}
            >
              Promover pro CRM
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Cancelar
            </Button>
            <p className="ml-auto text-2xs text-violet-600">
              Responsável: {OPERATORS[operatorId].shortName} (operador ativo)
            </p>
          </div>
        )}

        {leads.isPending ? (
          <TableSkeleton rows={10} cols={7} />
        ) : leads.isError ? (
          <ErrorState onRetry={() => leads.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? "Nenhum lead com esses filtros" : "Nenhum lead ainda"}
            description={
              hasFilters
                ? "Afrouxe os filtros ou limpe tudo pra ver a lista completa."
                : "Crie uma campanha de busca pra começar a encontrar negócios."
            }
            action={
              hasFilters ? (
                <Button size="sm" onClick={clearFilters}>Limpar filtros</Button>
              ) : (
                <Button variant="primary" size="sm" onClick={() => router.push("/campaigns")}>
                  Criar campanha
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Selecionar todos os leads elegíveis"
                    className="accent-violet-500"
                  />
                </Th>
                <Th className="w-20">Score</Th>
                <Th>Negócio</Th>
                <Th>Site</Th>
                <Th>Reputação</Th>
                <Th>Contato</Th>
                <Th>CRM</Th>
                <Th className="w-8"><span className="sr-only">Abrir</span></Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  checked={selected.has(lead.id)}
                  onToggle={() => toggle(lead.id)}
                  onOpen={() => router.push(`/leads/${lead.id}`)}
                />
              ))}
            </tbody>
          </Table>
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
  lead: Lead;
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
          disabled={!!lead.crm || !lead.score}
          onChange={onToggle}
          aria-label={`Selecionar ${lead.name}`}
          className="accent-violet-500 disabled:opacity-30"
        />
      </Td>
      <Td>
        {lead.score ? (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "tnum inline-flex h-7 w-9 items-center justify-center rounded-ctrl font-display text-sm font-bold",
                lead.score.band === "PRIORIDADE"
                  ? "bg-violet-500 text-white"
                  : "bg-line-soft text-ink"
              )}
            >
              {lead.score.total}
            </span>
          </div>
        ) : (
          <span className="text-xs text-ink-faint">—</span>
        )}
      </Td>
      <Td>
        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{lead.name}</p>
            <p className="text-2xs text-ink-muted">
              {lead.category} · {lead.region}
            </p>
          </div>
          {lead.score && lead.score.band === "PRIORIDADE" && <ScoreBandBadge band={lead.score.band} />}
        </div>
      </Td>
      <Td><SiteCategoryBadge category={lead.audit?.category} /></Td>
      <Td><Rating rating={lead.rating} reviews={lead.reviews} /></Td>
      <Td>
        <div className="flex items-center gap-1.5 text-ink-muted">
          {lead.phone && <Phone className="h-3.5 w-3.5" aria-label="Tem telefone" />}
          {lead.audit?.instagram && <Instagram className="h-3.5 w-3.5" aria-label="Tem Instagram" />}
          {!lead.phone && !lead.audit?.instagram && (
            <span className="text-xs text-ink-faint">—</span>
          )}
        </div>
      </Td>
      <Td>
        {lead.crm ? (
          <div className="flex items-center gap-1.5">
            <CrmStageBadge stage={lead.crm.stage} />
            <OperatorAvatar id={lead.crm.owner} size="sm" />
          </div>
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
