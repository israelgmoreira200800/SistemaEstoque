import Link from "next/link";
import {
  Activity,
  Building2,
  Clock3,
  Database,
  KeyRound,
  Ruler,
  Settings,
  ShieldCheck,
  Tags,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default async function SettingsPage() {
  const session = await requirePermission("settings.manage");
  const [userCount, roleCount, unitCount, categoryCount, itemCount, lastAudit] = await Promise.all([
    prisma.user.count({ where: { companyId: session.company.id } }),
    prisma.role.count({ where: { companyId: session.company.id, status: "ACTIVE" } }),
    prisma.unit.count({ where: { companyId: session.company.id, status: "ACTIVE" } }),
    prisma.itemCategory.count({ where: { companyId: session.company.id, status: "ACTIVE" } }),
    prisma.item.count({ where: { companyId: session.company.id, status: "ACTIVE" } }),
    prisma.auditLog.findFirst({
      where: { companyId: session.company.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, action: true },
    }),
  ]);

  const identity = [
    { icon: Building2, label: "Empresa", value: session.company.name },
    { icon: Clock3, label: "Fuso horário", value: session.company.timezone },
    { icon: ShieldCheck, label: "Modelo de acesso", value: "Cargos + permissões individuais" },
    { icon: Database, label: "Escopo", value: "Empresa única, estoque principal" },
  ];

  const operational = [
    { label: "Usuários cadastrados", value: userCount, icon: Users },
    { label: "Cargos ativos", value: roleCount, icon: KeyRound },
    { label: "Unidades ativas", value: unitCount, icon: Ruler },
    { label: "Categorias ativas", value: categoryCount, icon: Tags },
  ];

  return (
    <>
      <PageHeader title="Configurações" subtitle="Central de parâmetros, segurança e manutenção da instalação." />
      <main className="page-body settings-page">
        <section className="settings-hero content-card">
          <div>
            <span className="eyebrow"><Settings size={14} /> Instalação</span>
            <h2>{session.company.name}</h2>
            <p>Esta área concentra informações estruturais do sistema e atalhos para os cadastros que realmente alteram a operação.</p>
          </div>
          <span className="settings-health"><Activity size={15} /> Operacional</span>
        </section>

        <section className="settings-grid">
          {identity.map(({ icon: Icon, label, value }) => (
            <article className="content-card setting-card" key={label}>
              <span className="metric-icon metric-blue"><Icon size={20} /></span>
              <div><small>{label}</small><strong>{value}</strong></div>
            </article>
          ))}
        </section>

        <section className="settings-panel-grid">
          <article className="content-card settings-panel">
            <div className="card-heading"><div><span className="eyebrow">Operação</span><h3>Base cadastrada</h3></div></div>
            <div className="settings-kpi-grid">
              {operational.map(({ icon: Icon, label, value }) => (
                <div className="settings-kpi" key={label}>
                  <Icon size={16} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="table-note">Itens ativos: {itemCount}. Use cadastros para unidades, categorias, itens e conversões.</p>
          </article>

          <article className="content-card settings-panel">
            <div className="card-heading"><div><span className="eyebrow">Auditoria</span><h3>Última atividade</h3></div></div>
            <div className="settings-audit-box">
              <Activity size={18} />
              <div>
                <strong>{lastAudit?.action ?? "Nenhuma atividade registrada"}</strong>
                <small>{lastAudit ? formatDate(lastAudit.createdAt) : "Aguardando eventos do sistema"}</small>
              </div>
            </div>
            <Link className="table-action" href="/dashboard/historico">Ver histórico completo</Link>
          </article>
        </section>

        <section className="settings-shortcuts">
          <Link className="content-card settings-shortcut" href="/dashboard/usuarios">
            <Users size={20} />
            <span><strong>Usuários e permissões</strong><small>Cargos, setores e overrides individuais</small></span>
          </Link>
          <Link className="content-card settings-shortcut" href="/dashboard/cadastros">
            <Tags size={20} />
            <span><strong>Cadastros</strong><small>Itens, categorias, unidades e conversões</small></span>
          </Link>
          <Link className="content-card settings-shortcut" href="/dashboard/historico">
            <Activity size={20} />
            <span><strong>Auditoria e histórico</strong><small>Movimentações de estoque e eventos administrativos</small></span>
          </Link>
        </section>
      </main>
    </>
  );
}
