import { Bell, Search } from "lucide-react";

export function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="page-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="header-actions">
        <label className="global-search">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Busca global</span>
          <input disabled placeholder="Buscar em breve" />
          <kbd>⌘ K</kbd>
        </label>
        <button className="icon-button notification-button" aria-label="Notificações" disabled>
          <Bell size={19} />
        </button>
      </div>
    </header>
  );
}

