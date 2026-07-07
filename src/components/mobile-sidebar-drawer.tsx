"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/dashboard/actions";
import { AppSidebarNav, type SidebarNavItem } from "@/components/app-sidebar-nav";

export function MobileSidebarDrawer({
  companyName,
  initials,
  items,
  roleLabel,
  userName,
}: {
  companyName: string;
  initials: string;
  items: SidebarNavItem[];
  roleLabel: string;
  userName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    queueMicrotask(() => setOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="mobile-sidebar-drawer" data-open={open ? "true" : "false"}>
      <button
        className="mobile-menu-button"
        type="button"
        aria-label="Abrir menu de navegacao"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={21} aria-hidden="true" />
      </button>

      {open && (
        <>
          <button
            className="mobile-drawer-overlay"
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
          />
          <div className="mobile-drawer-panel" role="dialog" aria-modal="true" aria-label="Menu de navegacao">
            <div className="mobile-drawer-header">
              <Link className="brand-lockup brand-lockup-light" href="/dashboard" onClick={() => setOpen(false)}>
                <span className="brand-mark"><Image src="/brand/vertice-mark.svg" alt="" width={36} height={36} /></span>
                <span>Vertice</span>
              </Link>
              <button
                ref={closeButtonRef}
                className="mobile-drawer-close"
                type="button"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="company-switcher mobile-company-switcher">
              <span className="company-avatar">{companyName[0]?.toUpperCase()}</span>
              <span><small>Operacao</small><strong>{companyName}</strong></span>
            </div>
            <AppSidebarNav items={items} onNavigate={() => setOpen(false)} />
            <div className="sidebar-user mobile-sidebar-user">
              <span className="user-avatar">{initials}</span>
              <span className="user-copy"><strong>{userName}</strong><small>{roleLabel}</small></span>
              <form action={logoutAction}>
                <button className="icon-button" title="Sair" aria-label="Sair do sistema" type="submit">
                  <LogOut size={18} />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
