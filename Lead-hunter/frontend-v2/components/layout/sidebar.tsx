"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarClock,
  KanbanSquare,
  LayoutDashboard,
  MonitorSmartphone,
  Radar,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BalmorLogo } from "./balmor-logo";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/crm", label: "CRM", icon: KanbanSquare },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/demos", label: "Demos", icon: MonitorSmartphone },
  { href: "/campaigns", label: "Campanhas", icon: Radar },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col bg-carbon">
      <div className="px-5 pb-6 pt-5">
        <Link href="/" className="inline-block rounded-ctrl" aria-label="Lead Hunter BH — início">
          <BalmorLogo />
        </Link>
      </div>

      <p className="px-5 pb-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-carbon-muted">
        Lead Hunter BH
      </p>

      <nav className="flex-1 space-y-0.5 px-3" aria-label="Navegação principal">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex h-9 items-center gap-2.5 rounded-ctrl px-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-carbon-raised text-white"
                  : "text-carbon-muted hover:bg-carbon-raised/60 hover:text-white"
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-violet-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-violet-300" : "text-carbon-muted group-hover:text-violet-300"
                )}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-carbon-line px-5 py-4">
        <p className="text-[10px] leading-relaxed text-carbon-muted">
          Ferramenta interna · dados mock
          <br />
          <span className="text-carbon-muted/70">Balmor © 2026</span>
        </p>
      </div>
    </aside>
  );
}
