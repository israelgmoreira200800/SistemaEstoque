"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Boxes,
  ClipboardList,
  Factory,
  History,
  PackageMinus,
  PackagePlus,
  Search,
  Settings,
  Users,
} from "lucide-react";

const searchableRoutes = [
  { label: "Itens", description: "Buscar por nome, SKU ou código", href: "/dashboard/itens", icon: Boxes },
  { label: "Entradas", description: "Registrar recebimentos", href: "/dashboard/entradas", icon: PackagePlus },
  { label: "Saídas", description: "Registrar baixa de estoque", href: "/dashboard/saidas", icon: PackageMinus },
  { label: "Produção", description: "Fichas técnicas e produção", href: "/dashboard/producao", icon: Factory },
  { label: "Pedidos", description: "Pedidos e status", href: "/dashboard/pedidos", icon: ClipboardList },
  { label: "Histórico", description: "Movimentações e auditoria", href: "/dashboard/historico", icon: History },
  { label: "Usuários", description: "Acessos e permissões", href: "/dashboard/usuarios", icon: Users },
  { label: "Configurações", description: "Parâmetros da instalação", href: "/dashboard/configuracoes", icon: Settings },
];

const notifications = [
  {
    title: "Conferir estoque mínimo",
    description: "Revise itens cadastrados e saldos recentes.",
    href: "/dashboard/itens",
  },
  {
    title: "Auditoria disponível",
    description: "Eventos administrativos e movimentações ficam no histórico.",
    href: "/dashboard/historico",
  },
  {
    title: "Permissões granulares",
    description: "Gerencie cargos e overrides na área de usuários.",
    href: "/dashboard/usuarios",
  },
];

export function HeaderActions() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchableRoutes.slice(0, 4);
    return searchableRoutes.filter((route) =>
      `${route.label} ${route.description}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    setSearchOpen(false);
    if (!term) {
      router.push("/dashboard/itens");
      return;
    }
    router.push(`/dashboard/itens?${new URLSearchParams({ q: term })}`);
  }

  return (
    <div className="header-actions">
      <div className="header-search-wrap">
        <form className="global-search" onSubmit={submitSearch}>
          <Search aria-hidden="true" size={17} />
          <label className="sr-only" htmlFor="global-search-input">Busca global</label>
          <input
            id="global-search-input"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Buscar itens ou abrir área"
          />
          <kbd>Enter</kbd>
        </form>

        {searchOpen && (
          <div className="header-popover search-popover">
            <div className="popover-heading">
              <strong>{query.trim() ? "Resultados" : "Atalhos rápidos"}</strong>
              <button type="button" onClick={() => setSearchOpen(false)}>Fechar</button>
            </div>
            <div className="search-results">
              {matches.length > 0 ? matches.map(({ href, label, description, icon: Icon }) => (
                <Link className="search-result" href={href} key={href} onClick={() => setSearchOpen(false)}>
                  <Icon size={16} />
                  <span><strong>{label}</strong><small>{description}</small></span>
                </Link>
              )) : (
                <p className="empty-state">Nenhuma área encontrada. Pressione Enter para buscar em itens.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="notification-wrap">
        <button
          className="icon-button notification-button"
          aria-label="Notificações"
          aria-expanded={notificationsOpen}
          type="button"
          onClick={() => setNotificationsOpen((open) => !open)}
        >
          <Bell size={19} />
          <span className="notification-dot" />
        </button>

        {notificationsOpen && (
          <div className="header-popover notification-popover">
            <div className="popover-heading">
              <strong>Notificações</strong>
              <button type="button" onClick={() => setNotificationsOpen(false)}>Fechar</button>
            </div>
            <div className="notification-list">
              {notifications.map((notification) => (
                <Link
                  className="notification-item"
                  href={notification.href}
                  key={notification.title}
                  onClick={() => setNotificationsOpen(false)}
                >
                  <span />
                  <div><strong>{notification.title}</strong><small>{notification.description}</small></div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
