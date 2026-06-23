import Link from "next/link";
import {
  Boxes,
  ClipboardList,
  Factory,
  Gauge,
  History,
  LogOut,
  PackageMinus,
  PackagePlus,
  Settings,
  Users,
} from "lucide-react";
import type { AuthSession } from "@/lib/auth/session";
import { logoutAction } from "@/app/dashboard/actions";

const mainNavigation = [
  { href: "/dashboard", label: "Visão geral", icon: Gauge, permission: "dashboard.view" },
  { href: "/dashboard/itens", label: "Itens", icon: Boxes, permission: "item.view" },
  { href: "/dashboard/entradas", label: "Entradas", icon: PackagePlus, permission: "stock.entry" },
  { href: "/dashboard/saidas", label: "Saídas", icon: PackageMinus, permission: "stock.exit" },
  { href: "/dashboard/producao", label: "Produção", icon: Factory, permission: "production.view" },
  { href: "/dashboard/pedidos", label: "Pedidos", icon: ClipboardList, permission: "order.view" },
  { href: "/dashboard/historico", label: "Histórico", icon: History, permission: "stock.view" },
  { href: "/dashboard/usuarios", label: "Usuários", icon: Users, permission: "user.view" },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Settings, permission: "settings.manage" },
];

export function AppSidebar({ session }: { session: AuthSession }) {
  const initials = session.user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const visibleNavigation = mainNavigation.filter(({ permission }) =>
    session.permissions.has(permission),
  );

  return (
    <aside className="app-sidebar">
      <Link className="brand-lockup sidebar-brand" href="/dashboard">
        <span className="brand-mark"><Boxes aria-hidden="true" size={22} /></span>
        <span>Vértice</span>
      </Link>

      <div className="company-switcher">
        <span className="company-avatar">{session.company.name[0]?.toUpperCase()}</span>
        <span><small>Empresa</small><strong>{session.company.name}</strong></span>
      </div>

      <nav className="sidebar-nav" aria-label="Navegação principal">
        <p className="nav-label">Menu</p>
        {visibleNavigation.map(({ href, label, icon: Icon }) => (
          <Link href={href} key={href} className="nav-item">
            <Icon aria-hidden="true" size={19} /><span>{label}</span>
          </Link>
        ))}
      </nav>

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

