import Link from "next/link";
import Image from "next/image";
import { LogOut } from "lucide-react";
import type { AuthSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/dashboard/actions";
import { AppSidebarNav, type SidebarNavItem } from "@/components/app-sidebar-nav";

const mainNavigation = [
  { href: "/dashboard", label: "Visão geral", icon: "gauge", permission: "dashboard.view" },
  { href: "/dashboard/itens", label: "Itens", icon: "boxes", permission: "item.view" },
  { href: "/dashboard/entradas", label: "Entradas", icon: "packagePlus", permission: "stock.entry" },
  { href: "/dashboard/saidas", label: "Saídas", icon: "packageMinus", permission: "stock.exit" },
  { href: "/dashboard/producao", label: "Produção", icon: "factory", permission: "production.view" },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: "clipboardList", permission: "order.view" },
  { href: "/dashboard/historico", label: "Histórico", icon: "history", permission: "stock.view" },
  { href: "/dashboard/usuarios", label: "Usuários", icon: "users", permission: "user.view" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: "settings", permission: "settings.manage" },
] as const;

export function AppSidebar({ session }: { session: AuthSession }) {
  const initials = session.user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const visibleNavigation: SidebarNavItem[] = mainNavigation
    .filter(({ permission }) => session.permissions.has(permission))
    .map(({ href, label, icon }) => ({ href, label, icon }));

  return (
    <aside className="app-sidebar">
      <Link className="brand-lockup sidebar-brand" href="/dashboard">
        <span className="brand-mark"><Image src="/brand/vertice-mark.svg" alt="" width={36} height={36} priority /></span>
        <span>Vertice</span>
      </Link>

      <div className="company-switcher">
        <span className="company-avatar">{session.company.name[0]?.toUpperCase()}</span>
        <span><small>Operação</small><strong>{session.company.name}</strong></span>
      </div>

      <AppSidebarNav items={visibleNavigation} />

      <div className="sidebar-user">
        <span className="user-avatar">{initials}</span>
        <span className="user-copy"><strong>{session.user.name}</strong><small>{session.roles[0] ?? "Usuário"}</small></span>
        <form action={logoutAction}>
          <button className="icon-button" title="Sair" aria-label="Sair do sistema" type="submit">
            <LogOut size={18} />
          </button>
        </form>
      </div>
    </aside>
  );
}

