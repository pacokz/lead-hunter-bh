"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useAddCategory,
  useAddRegion,
  useBackendSettings,
  useBackendStats,
  useCategories,
  useRegions,
} from "@/lib/queries";

export default function SettingsPage() {
  const settings = useBackendSettings();
  const stats = useBackendStats();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Configurações"
        description="Cota da API, critérios de qualificação e listas de segmentos e regiões usadas nas campanhas."
      />

      {settings.isPending ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-card" />
          ))}
        </div>
      ) : settings.isError ? (
        <ErrorState message={String(settings.error)} onRetry={() => settings.refetch()} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader
              title="Cota da Google Places API"
              subtitle="Limites definidos no backend (.env) pra segurar custo. Buscas novas são manuais de propósito."
            />
            <div className="space-y-4 px-4 pb-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-soft">Hoje</p>
                  <p className="tnum text-xs font-semibold text-ink">
                    {stats.data?.api_today ?? "—"} de {settings.data.api_daily_limit} requisições
                  </p>
                </div>
                <Progress value={stats.data?.api_today ?? 0} max={settings.data.api_daily_limit} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-soft">Mês corrente</p>
                  <p className="tnum text-xs font-semibold text-ink">
                    {stats.data?.api_month ?? "—"} de {settings.data.api_monthly_limit} requisições
                  </p>
                </div>
                <Progress value={stats.data?.api_month ?? 0} max={settings.data.api_monthly_limit} />
              </div>
              <div className="flex items-center gap-2 border-t border-line-soft pt-3">
                <Badge
                  className={
                    settings.data.google_key_set
                      ? "border-ok-line bg-ok-bg text-ok"
                      : "border-bad-line bg-bad-bg text-bad"
                  }
                >
                  {settings.data.google_key_set ? "Google API key configurada" : "Sem Google API key"}
                </Badge>
                <Badge className="border-line bg-paper text-ink-muted">
                  ambiente: {settings.data.app_env}
                </Badge>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Critérios de qualificação"
              subtitle="Definidos no backend — a UI só exibe. Score determinístico, sem edição manual."
            />
            <div className="space-y-2.5 px-4 pb-4">
              <CriteriaRow
                label="Nota mínima no Google"
                value={settings.data.min_rating.toFixed(1)}
                hint="Abaixo disso o lead é desqualificado"
              />
              <CriteriaRow
                label="Mínimo de avaliações"
                value={String(settings.data.min_reviews)}
                hint="Garante negócio movimentado"
              />
              <CriteriaRow
                label="Score mínimo pro CRM"
                value={String(settings.data.min_score)}
                hint="Corte do 'Promover qualificados'"
              />
            </div>
          </Card>

          <ListCard
            title="Segmentos"
            subtitle="Categorias de negócio buscadas nas campanhas"
            placeholder="Ex.: Imobiliárias"
            useList={useCategories}
            useAdd={useAddCategory}
          />
          <ListCard
            title="Regiões de atuação"
            subtitle="Bairros/regiões de BH cobertos pela prospecção"
            placeholder="Ex.: Cidade Nova"
            useList={useRegions}
            useAdd={useAddRegion}
          />
        </div>
      )}
    </div>
  );
}

function CriteriaRow({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-ctrl border border-line-soft bg-paper/60 px-3 py-2">
      <div>
        <p className="text-xs font-medium text-ink-soft">{label}</p>
        <p className="text-2xs text-ink-faint">{hint}</p>
      </div>
      <span className="tnum font-display text-base font-bold text-ink">{value}</span>
    </div>
  );
}

function ListCard({
  title,
  subtitle,
  placeholder,
  useList,
  useAdd,
}: {
  title: string;
  subtitle: string;
  placeholder: string;
  useList: typeof useCategories | typeof useRegions;
  useAdd: typeof useAddCategory | typeof useAddRegion;
}) {
  const list = useList();
  const add = useAdd();
  const { toast } = useToast();
  const [value, setValue] = useState("");

  async function submit() {
    const v = value.trim();
    if (!v) return;
    try {
      await add.mutateAsync(v);
      setValue("");
      toast("success", `"${v}" adicionado`);
    } catch (e) {
      toast("error", e instanceof Error && e.message.includes("409") ? "Já existe na lista" : "Erro ao adicionar");
    }
  }

  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} />
      <div className="px-4 pb-4">
        <div className="mb-3 flex gap-2">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={placeholder}
            aria-label={`Adicionar em ${title}`}
          />
          <Button variant="primary" loading={add.isPending} onClick={submit} disabled={!value.trim()}>
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar
          </Button>
        </div>
        {list.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : list.isError ? (
          <p className="py-2 text-center text-xs text-bad">Erro ao carregar lista.</p>
        ) : list.data.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-muted">Lista vazia.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {list.data.map((item) => (
              <li
                key={item.id}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft"
              >
                {item.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
