import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Factory,
  History,
  PackageMinus,
  PackagePlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity } from "@/lib/stock/quantity";

const actionLabels: Record<string, string> = {
  "auth.login.succeeded": "Login realizado",
  "auth.logout": "Sessão encerrada",
  "system.seed.completed": "Ambiente inicial preparado",
  "stock.increased": "Estoque aumentado",
  "stock.decreased": "Estoque reduzido",
  "stock.adjustment.requested": "Ajuste solicitado",
  "stock.adjustment.approved": "Ajuste aprovado",
  "stock.adjustment.rejected": "Ajuste rejeitado",
  "production.finished": "Produção registrada",
  "order.created": "Pedido criado",
  "order.shipped": "Pedido expedido",
  "report.exported": "Relatorio exportado",
  "role.updated": "Cargo atualizado",
  "user.permission_override.changed": "Permissão individual alterada",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function DashboardPage() {
  const session = await requirePermission("dashboard.view");
  const [members, items, balances, orders, latestMovements, latestActivity] = await Promise.all([
    prisma.user.count({ where: { companyId: session.company.id, status: "ACTIVE" } }),
    prisma.item.count({ where: { companyId: session.company.id, status: "ACTIVE" } }),
    prisma.stockBalance.findMany({
      where: { companyId: session.company.id, item: { companyId: session.company.id } },
      include: { item: { include: { unit: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.customerOrder.count({ where: { companyId: session.company.id, status: { not: "CANCELED" } } }),
    prisma.stockMovement.findMany({
      where: { companyId: session.company.id, item: { companyId: session.company.id } },
      include: { item: { include: { unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.auditLog.findMany({
      where: { companyId: session.company.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const firstName = session.user.name.split(" ")[0];
  const shortcuts = [
    { href: "/dashboard/itens", label: "Novo item", icon: Boxes, permission: "item.create" },
    { href: "/dashboard/entradas", label: "Registrar entrada", icon: PackagePlus, permission: "stock.entry" },
    { href: "/dashboard/saidas", label: "Registrar saída", icon: PackageMinus, permission: "stock.exit" },
    { href: "/dashboard/ajustes", label: "Solicitar ajuste", icon: ClipboardCheck, permissions: ["stock.adjust", "stock.inventory"] },
    { href: "/dashboard/producao", label: "Registrar produção", icon: Factory, permission: "production.finish" },
    { href: "/dashboard/pedidos", label: "Novo pedido", icon: ClipboardList, permission: "order.create" },
    { href: "/dashboard/relatorios", label: "Ver relatorios", icon: BarChart3, permission: "report.view" },
  ].filter((shortcut) => {
    const permissions =
      "permissions" in shortcut && shortcut.permissions
        ? shortcut.permissions
        : [shortcut.permission];
    return permissions.some((permission) => session.permissions.has(permission));
  });

  return (
    <>
      <PageHeader title={`Olá, ${firstName}`} subtitle="Painel de comando da operação." />
      <main className="page-body">
        <section className="welcome-banner">
          <div>
            <span className="eyebrow"><Boxes size={14} /> Central operacional</span>
            <h2>Decisões de estoque com contexto, rastro e velocidade.</h2>
            <p>Monitore movimentações, produção, pedidos e acessos sem perder o vínculo entre saldo e ação.</p>
          </div>
          <div className="banner-telemetry" aria-hidden="true">
            <span>Saldo</span>
            <strong>{balances.length}</strong>
            <small>itens monitorados</small>
          </div>
        </section>

        <section className="quick-actions" aria-label="Atalhos principais">
          {shortcuts.map(({ href, label, icon: Icon }) => (
            <Link className="quick-action-card" href={href} key={href}>
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          ))}
        </section>

        <section className="metric-grid" aria-label="Indicadores">
          <article className="metric-card"><span className="metric-icon metric-blue"><Users size={20} /></span><div><small>Usuários ativos</small><strong>{members}</strong><p>com acesso ao sistema</p></div></article>
          <article className="metric-card"><span className="metric-icon metric-violet"><Boxes size={20} /></span><div><small>Itens ativos</small><strong>{items}</strong><p>cadastrados</p></div></article>
          <article className="metric-card"><span className="metric-icon metric-green"><PackagePlus size={20} /></span><div><small>Itens com saldo</small><strong>{balances.length}</strong><p>no estoque principal</p></div></article>
          <article className="metric-card"><span className="metric-icon metric-amber"><ClipboardList size={20} /></span><div><small>Pedidos abertos</small><strong>{orders}</strong><p>não cancelados</p></div></article>
        </section>

        <div className="dashboard-grid">
          <section className="content-card activity-card">
            <div className="card-heading"><div><span className="eyebrow"><History size={14} /> Estoque</span><h3>Últimas movimentações</h3></div><Link href="/dashboard/historico">Ver tudo <ArrowUpRight size={15} /></Link></div>
            <div className="activity-list">
              {latestMovements.map((movement) => (
                <article key={movement.id} className="activity-item">
                  <span className="activity-dot" />
                  <div><strong>{movement.item.name}</strong><p>{movement.type} · {formatQuantity(movement.quantity)} {movement.item.unit.symbol} · {formatDate(movement.createdAt)}</p></div>
                </article>
              ))}
              {latestMovements.length === 0 && <p className="empty-state">Nenhuma movimentação registrada.</p>}
            </div>
          </section>

          <section className="content-card activity-card">
            <div className="card-heading"><div><span className="eyebrow">Atividades</span><h3>Auditoria recente</h3></div><Link href="/dashboard/historico">Ver histórico <ArrowUpRight size={15} /></Link></div>
            <div className="activity-list">
              {latestActivity.map((activity) => (
                <article key={activity.id} className="activity-item">
                  <span className="activity-dot" />
                  <div><strong>{actionLabels[activity.action] ?? activity.action}</strong><p>{activity.user?.name ?? "Sistema"} · {formatDate(activity.createdAt)}</p></div>
                </article>
              ))}
              {latestActivity.length === 0 && <p className="empty-state">Nenhuma atividade registrada.</p>}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

