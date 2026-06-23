import Link from "next/link";
import { Clock3, Settings, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";

export default async function SettingsPage() {
  const session = await requirePermission("settings.manage");
  const items = [
    { icon: Settings, label: "Empresa", value: session.company.name },
    { icon: Clock3, label: "Fuso horário", value: session.company.timezone },
    { icon: ShieldCheck, label: "Modelo de acesso", value: "Usuários, cargos e permissões" },
  ];
  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros gerais da instalação." />
      <main className="page-body">
        <section className="settings-grid">
          {items.map(({ icon: Icon, label, value }) => <article className="content-card setting-card" key={label}><span className="metric-icon metric-blue"><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong></div></article>)}
        </section>
        <section className="content-card notice-card"><ShieldCheck /><div><h3>Acessos avançados</h3><p>Criação de usuários, cargos, setores e permissões individuais fica na área de <Link className="table-action" href="/dashboard/usuarios">Usuários</Link>.</p></div></section>
      </main>
    </>
  );
}

