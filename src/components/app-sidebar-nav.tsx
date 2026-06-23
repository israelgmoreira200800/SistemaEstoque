"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  Factory,
  Gauge,
  History,
  PackageMinus,
  PackagePlus,
  Settings,
  Users,
} from "lucide-react";

const iconMap = {
  boxes: Boxes,
  clipboardList: ClipboardList,
  factory: Factory,
  gauge: Gauge,
  history: History,
  packageMinus: PackageMinus,
  packagePlus: PackagePlus,
  settings: Settings,
  users: Users,
};

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebarNav({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar-nav" aria-label="Navegação principal">
      <div className="nav-label-row">
        <p className="nav-label">Comando</p>
        <span className="nav-live-indicator" title="Sistema online">
          <span />
          Online
        </span>
      </div>

      <div className="nav-stack">
        {items.map(({ href, label, icon }, index) => {
          const Icon = iconMap[icon];
          const active = isActivePath(pathname, href);

          return (
            <Link
              href={href}
              key={href}
              className="nav-item"
              aria-current={active ? "page" : undefined}
              style={{ "--nav-index": index } as React.CSSProperties}
              title={label}
            >
              <span className="nav-active-rail" aria-hidden="true" />
              <Icon aria-hidden="true" size={19} />
              <span>{label}</span>
              <span className="nav-glow" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
