import Link from "next/link";
import { Bot, ExternalLink, MonitorSmartphone, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";

export default function DemosPage() {
  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Demos"
        description="Prévias de site geradas por lead — a peça de conversão do pitch."
      />

      <Card>
        <CardHeader
          title="As demos são geradas pelos agentes"
          subtitle="Este fluxo ainda não passa pelo backend — por isso não aparece aqui."
        />
        <div className="space-y-3 px-4 pb-5 text-sm text-ink-soft">
          <p className="flex items-start gap-2.5">
            <Bot className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            Peça no Discord: o <strong>Nanami</strong> pesquisa referências e escreve o BRIEF, a{" "}
            <strong>Nobara</strong> gera o site e publica na Vercel. O link fica em{" "}
            <span className="tnum">https://&lt;slug-do-lead&gt;.vercel.app</span>.
          </p>
          <p className="flex items-start gap-2.5">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            Publicação tem gate de QA automático (4 viewports + craft score mínimo 7) — demo com
            problema grave não sobe.
          </p>
          <p className="flex items-start gap-2.5">
            <MonitorSmartphone className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" aria-hidden />
            Quando a demo estiver no ar, registre no lead (interação) e mova o card pra{" "}
            <Link href="/crm" className="font-medium text-violet-600 hover:text-violet-700">
              Demo pronta no CRM
            </Link>
            .
          </p>
          <p className="rounded-ctrl bg-paper px-3 py-2.5 text-xs text-ink-muted">
            Integração futura: expor as demos (status, QA, link) numa API do backend pra esta tela
            listar tudo — incluindo o botão &ldquo;GERAR SITE&rdquo; com upload de fotos do
            Instagram do lead.
            <ExternalLink className="ml-1 inline h-3 w-3 align-[-1px]" aria-hidden />
          </p>
        </div>
      </Card>
    </div>
  );
}
