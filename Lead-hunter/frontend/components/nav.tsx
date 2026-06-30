"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Megaphone, ListChecks, Settings, KanbanSquare, CalendarClock } from "lucide-react";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/crm", label: "CRM", icon: KanbanSquare },
  { href: "/follow-ups", label: "Follow-ups", icon: CalendarClock },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/search-jobs", label: "Jobs", icon: ListChecks },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Nav() {
  const path = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <div className="text-lg font-bold text-slate-900">Lead Hunter</div>
        <div className="text-xs text-slate-500">Belo Horizonte</div>
      </div>
      <nav className="flex flex-col gap-1 px-3">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
