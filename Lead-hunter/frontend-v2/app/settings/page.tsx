"use client";

import { useEffect, useState } from "react";
import { Plus, RotateCcw, Save, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ErrorState, Skeleton } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import {
  useAddSetting,
  useRemoveSetting,
  useSaveScoreWeights,
  useSettings,
} from "@/lib/queries";
import type { ScoreWeights } from "@/lib/types";
import { cn } from "@/lib/utils";

const WEIGHT_LABELS: Record<keyof ScoreWeights, { label: string; hint: string }> = {
  siteOpportunity: { label: "Oportunidade de site", hint: "Peso do estado da presença digital (sem site pontua mais)" },
  reviews: { label: "Volume de avaliações", hint: "Negócios movimentados valem mais" },
  rating: { label: "Nota no Google", hint: "Reputação facilita a venda" },
  contact: { label: "Facilidade de contato", hint: "Telefone e WhatsApp disponíveis" },
  segment: { label: "Segmento", hint: "Prioridade estratégica do nicho" },
};

export default function SettingsPage() {
  const settings = useSettings();

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Configurações"
        description="Cota da API, pesos do score e listas de segmentos e regiões usadas nas campanhas."
      />

      {settings.isPending ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-56 w-full rounded-card" />
          ))}
        </div>
      ) : settings.isError ? (
        <ErrorState onRetry={() => settings.refetch()} />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
          <QuotaCard quota={settings.data.quota} />
          <WeightsCard weights={settings.data.scoreWeights} />
          <ListCard
            kind="categories"
            title="Segmentos"
            subtitle="Categorias de negócio buscadas nas campanhas"
            items={settings.data.categories}
            placeholder="Ex.: Imobiliárias"
          />
          <ListCard
            kind="regions"
            title="Regiões de atuação"
            subtitle="Bairros/regiões de BH cobertos pela prospecção"
            items={settings.data.regions}
            placeholder="Ex.: Cidade Nova"
          />
        </div>
      )}
    </div>
  );
}

function QuotaCard({ quota }: { quota: { dailyUsed: number; dailyLimit: number; monthlyUsed: number; monthlyLimit: number } }) {
  return (
    <Card>
      <CardHeader
        title="Cota da Google Places API"
        subtitle="Limites definidos no backend pra segurar custo. Buscas novas são manuais de propósito."
      />
      <div className="space-y-4 px-4 pb-4">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-soft">Hoje</p>
            <p className="tnum text-xs font-semibold text-ink">
              {quota.dailyUsed} de {quota.dailyLimit} requisições
            </p>
          </div>
          <Progress value={quota.dailyUsed} max={quota.dailyLimit} />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-medium text-ink-soft">Mês corrente</p>
            <p className="tnum text-xs font-semibold text-ink">
              {quota.monthlyUsed} de {quota.monthlyLimit} requisições
            </p>
          </div>
          <Progress value={quota.monthlyUsed} max={quota.monthlyLimit} />
        </div>
        <p className="rounded-ctrl bg-paper px-3 py-2 text-2xs leading-relaxed text-ink-muted">
          Auditoria e score não gastam cota — só a busca de lugares. O limite é editado no
          backend, não aqui, pra evitar acidente.
        </p>
      </div>
    </Card>
  );
}

function WeightsCard({ weights }: { weights: ScoreWeights }) {
  const save = useSaveScoreWeights();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ScoreWeights>(weights);

  useEffect(() => setDraft(weights), [weights]);

  const total = Object.values(draft).reduce((a, b) => a + b, 0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(weights);
  const valid = total === 100;

  return (
    <Card>
      <CardHeader
        title="Pesos do score"
        subtitle="Os componentes precisam somar 100. O cálculo em si é determinístico no backend."
        action={
          <span
            className={cn(
              "tnum rounded-full border px-2 py-0.5 text-2xs font-semibold",
              valid ? "border-ok-line bg-ok-bg text-ok" : "border-bad-line bg-bad-bg text-bad"
            )}
          >
            Σ {total}
          </span>
        }
      />
      <div className="space-y-3 px-4 pb-4">
        {(Object.keys(WEIGHT_LABELS) as (keyof ScoreWeights)[]).map((key) => (
          <div key={key} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-soft">{WEIGHT_LABELS[key].label}</p>
              <p className="truncate text-2xs text-ink-faint">{WEIGHT_LABELS[key].hint}</p>
            </div>
            <div className="w-20 shrink-0">
              <Input
                type="number"
                min={0}
                max={60}
                value={draft[key]}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [key]: Math.max(0, parseInt(e.target.value || "0", 10)) }))
                }
                className="tnum h-8 text-center"
                aria-label={`Peso de ${WEIGHT_LABELS[key].label}`}
              />
            </div>
          </div>
        ))}
        <div className="flex items-center justify-end gap-2 border-t border-line-soft pt-3">
          {dirty && (
            <Button size="sm" variant="ghost" onClick={() => setDraft(weights)}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Descartar
            </Button>
          )}
          <Button
            size="sm"
            variant="primary"
            disabled={!dirty || !valid}
            title={!valid ? "Os pesos precisam somar 100" : undefined}
            loading={save.isPending}
            onClick={async () => {
              await save.mutateAsync(draft);
              toast("success", "Pesos salvos — o próximo run de score usa os novos valores");
            }}
          >
            <Save className="h-3.5 w-3.5" aria-hidden />
            Salvar pesos
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ListCard({
  kind,
  title,
  subtitle,
  items,
  placeholder,
}: {
  kind: "categories" | "regions";
  title: string;
  subtitle: string;
  items: string[];
  placeholder: string;
}) {
  const add = useAddSetting();
  const remove = useRemoveSetting();
  const { toast } = useToast();
  const [value, setValue] = useState("");

  async function submit() {
    const v = value.trim();
    if (!v) return;
    if (items.some((i) => i.toLowerCase() === v.toLowerCase())) {
      toast("error", "Já existe na lista");
      return;
    }
    await add.mutateAsync({ kind, value: v });
    setValue("");
    toast("success", `"${v}" adicionado`);
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
        {items.length === 0 ? (
          <p className="py-4 text-center text-xs text-ink-muted">Lista vazia.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {items.map((item) => (
              <li
                key={item}
                className="group inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink-soft"
              >
                {item}
                <button
                  aria-label={`Remover ${item}`}
                  onClick={async () => {
                    await remove.mutateAsync({ kind, value: item });
                    toast("success", `"${item}" removido`);
                  }}
                  className="rounded-full p-0.5 text-ink-faint transition-colors hover:bg-bad-bg hover:text-bad"
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
