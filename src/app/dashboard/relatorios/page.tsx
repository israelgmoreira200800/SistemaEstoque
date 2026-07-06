import Link from "next/link";
import {
  ArrowDownToLine,
  BarChart3,
  Boxes,
  ClipboardList,
  Factory,
  History,
  PackagePlus,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { availableQuantity, formatQuantity, toNumber } from "@/lib/stock/quantity";

const movementLabels: Record<string, string> = {
  ENTRY: "Entrada",
  EXIT: "Saida",
  LOSS: "Perda",
  ADJUSTMENT: "Ajuste",
  INVENTORY: "Inventario",
  PRODUCTION_CONSUMPTION: "Consumo na producao",
  PRODUCTION_OUTPUT: "Produto produzido",
  ORDER_RESERVATION: "Reserva de pedido",
  SHIPMENT: "Expedicao",
};

const orderStatusLabels: Record<string, string> = {
  OPEN: "Aberto",
  APPROVED: "Aprovado",
  IN_PRODUCTION: "Em producao",
  READY: "Pronto",
  SHIPPED: "Expedido",
  CANCELED: "Cancelado",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function ReportsPage() {
  const session = await requirePermission("report.view");
  const canExport = session.permissions.has("report.export");
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [items, latestMovements, orders, productions, openOrders, movementsInPeriod] = await Promise.all([
    prisma.item.findMany({
      where: { companyId: session.company.id },
      include: { category: true, stockBalance: true, unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { companyId: session.company.id, item: { companyId: session.company.id } },
      include: { createdBy: { select: { name: true } }, item: { include: { unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.customerOrder.findMany({
      where: { companyId: session.company.id },
      include: {
        createdBy: { select: { name: true } },
        items: {
          where: { companyId: session.company.id, item: { companyId: session.company.id } },
          include: { item: { include: { unit: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.production.findMany({
      where: { companyId: session.company.id, product: { companyId: session.company.id } },
      include: { createdBy: { select: { name: true } }, product: { include: { unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.customerOrder.count({
      where: { companyId: session.company.id, status: { notIn: ["SHIPPED", "CANCELED"] } },
    }),
    prisma.stockMovement.count({
      where: {
        companyId: session.company.id,
        createdAt: { gte: thirtyDaysAgo },
        item: { companyId: session.company.id },
      },
    }),
  ]);

  const activeItems = items.filter((item) => item.status === "ACTIVE");
  const lowStockItems = activeItems.filter((item) => {
    const minimum = toNumber(item.minimumStock);
    return minimum > 0 && toNumber(item.stockBalance?.quantityOnHand ?? 0) <= minimum;
  });
  const monitoredItems = items.filter((item) => item.stockBalance);
  const stockPreview = [...items]
    .sort((left, right) => toNumber(right.stockBalance?.quantityOnHand ?? 0) - toNumber(left.stockBalance?.quantityOnHand ?? 0))
    .slice(0, 10);
  const exportLinks = [
    { href: "/dashboard/relatorios/export?tipo=estoque", label: "Estoque", description: "Itens, saldos e minimos", icon: Boxes },
    { href: "/dashboard/relatorios/export?tipo=movimentacoes", label: "Movimentacoes", description: "Entradas, saidas e ajustes", icon: History },
    { href: "/dashboard/relatorios/export?tipo=pedidos", label: "Pedidos", description: "Pedidos e itens vendidos", icon: ClipboardList },
    { href: "/dashboard/relatorios/export?tipo=producoes", label: "Producoes", description: "Produtos finalizados", icon: Factory },
  ];

  return (
    <>
      <PageHeader title="Relatorios" subtitle="Indicadores operacionais e exportacoes CSV por empresa." />
      <main className="page-body">
        <section className="metric-grid" aria-label="Indicadores de relatorios">
          <article className="metric-card"><span className="metric-icon metric-blue"><Boxes size={20} /></span><div><small>Itens ativos</small><strong>{activeItems.length}</strong><p>cadastros disponiveis</p></div></article>
          <article className="metric-card"><span className="metric-icon metric-amber"><TrendingDown size={20} /></span><div><small>Abaixo do minimo</small><strong>{lowStockItems.length}</strong><p>precisam de atencao</p></div></article>
          <article className="metric-card"><span className="metric-icon metric-green"><ClipboardList size={20} /></span><div><small>Pedidos abertos</small><strong>{openOrders}</strong><p>aguardam conclusao</p></div></article>
          <article className="metric-card"><span className="metric-icon metric-violet"><BarChart3 size={20} /></span><div><small>Mov. 30 dias</small><strong>{movementsInPeriod}</strong><p>eventos registrados</p></div></article>
        </section>

        <div className="dashboard-grid">
          <section className="content-card activity-card">
            <div className="card-heading"><div><span className="eyebrow"><ArrowDownToLine size={14} /> Exportacoes</span><h3>Arquivos CSV</h3></div></div>
            <div className="report-export-list">
              {exportLinks.map(({ href, label, description, icon: Icon }) =>
                canExport ? (
                  <Link className="report-export-link" href={href} key={href}>
                    <Icon size={18} />
                    <span><strong>{label}</strong><small>{description}</small></span>
                    <ArrowDownToLine size={16} />
                  </Link>
                ) : (
                  <span className="report-export-link report-export-disabled" key={href}>
                    <Icon size={18} />
                    <span><strong>{label}</strong><small>{description}</small></span>
                  </span>
                ),
              )}
            </div>
          </section>

          <section className="content-card activity-card">
            <div className="card-heading"><div><span className="eyebrow"><PackagePlus size={14} /> Estoque</span><h3>{monitoredItems.length} item{monitoredItems.length === 1 ? "" : "s"} monitorado{monitoredItems.length === 1 ? "" : "s"}</h3></div></div>
            <div className="activity-list">
              {lowStockItems.slice(0, 5).map((item) => (
                <article className="activity-item" key={item.id}>
                  <span className="activity-dot" />
                  <div><strong>{item.name}</strong><p>{formatQuantity(item.stockBalance?.quantityOnHand ?? 0)} {item.unit.symbol} em saldo; minimo {formatQuantity(item.minimumStock)} {item.unit.symbol}</p></div>
                </article>
              ))}
              {lowStockItems.length === 0 && <p className="empty-state">Nenhum item abaixo do minimo.</p>}
            </div>
          </section>
        </div>

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Saldos</span><h3>Maiores saldos atuais</h3></div></div>
          <div className="data-table report-stock-table">
            <div className="table-row table-head"><span>Item</span><span>Saldo</span><span>Disponivel</span><span>Minimo</span><span>Status</span></div>
            {stockPreview.map((item) => (
              <div className="table-row" key={item.id}>
                <span data-label="Item"><strong>{item.name}</strong><small>{item.category?.name ?? "Sem categoria"}</small></span>
                <span data-label="Saldo">{formatQuantity(item.stockBalance?.quantityOnHand ?? 0)} {item.unit.symbol}</span>
                <span data-label="Disponível">{formatQuantity(availableQuantity(item.stockBalance))} {item.unit.symbol}</span>
                <span data-label="Mínimo">{formatQuantity(item.minimumStock)} {item.unit.symbol}</span>
                <span data-label="Status"><span className={`status-badge ${item.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{item.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></span>
              </div>
            ))}
            {stockPreview.length === 0 && <p className="empty-state">Nenhum item cadastrado.</p>}
          </div>
        </section>

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Movimentacoes</span><h3>Ultimos eventos do estoque</h3></div></div>
          <div className="data-table report-movement-table">
            <div className="table-row table-head"><span>Data</span><span>Tipo</span><span>Item</span><span>Quantidade</span><span>Responsavel</span></div>
            {latestMovements.map((movement) => (
              <div className="table-row" key={movement.id}>
                <span data-label="Data">{formatDateTime(movement.createdAt)}</span>
                <span data-label="Tipo">{movementLabels[movement.type] ?? movement.type}</span>
                <span data-label="Item">{movement.item.name}</span>
                <span data-label="Quantidade">{formatQuantity(movement.quantity)} {movement.item.unit.symbol}</span>
                <span data-label="Responsável">{movement.createdBy?.name ?? "Sistema"}</span>
              </div>
            ))}
            {latestMovements.length === 0 && <p className="empty-state">Nenhuma movimentacao registrada.</p>}
          </div>
        </section>

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Pedidos</span><h3>Pedidos recentes</h3></div></div>
          <div className="data-table report-order-table">
            <div className="table-row table-head"><span>Pedido</span><span>Itens</span><span>Status</span><span>Responsavel</span><span>Data</span></div>
            {orders.map((order) => (
              <div className="table-row" key={order.id}>
                <span data-label="Pedido"><strong>{order.customerName ?? "Cliente nao informado"}</strong><small>{order.documentNumber ?? "Sem documento"}</small></span>
                <span data-label="Itens">{order.items.map((orderItem) => `${formatQuantity(orderItem.quantity)} ${orderItem.item.unit.symbol} ${orderItem.item.name}`).join(", ") || "Sem itens"}</span>
                <span data-label="Status"><span className={`status-badge ${order.status === "CANCELED" ? "status-inactive" : ""}`}><span />{orderStatusLabels[order.status] ?? order.status}</span></span>
                <span data-label="Responsável">{order.createdBy?.name ?? "Sistema"}</span>
                <span data-label="Data">{formatDateTime(order.createdAt)}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="empty-state">Nenhum pedido registrado.</p>}
          </div>
        </section>

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Producoes</span><h3>Producoes recentes</h3></div></div>
          <div className="data-table report-production-table">
            <div className="table-row table-head"><span>Data</span><span>Produto</span><span>Quantidade</span><span>Responsavel</span><span>Status</span></div>
            {productions.map((production) => (
              <div className="table-row" key={production.id}>
                <span data-label="Data">{formatDateTime(production.createdAt)}</span>
                <span data-label="Produto">{production.product.name}</span>
                <span data-label="Quantidade">{formatQuantity(production.quantity)} {production.product.unit.symbol}</span>
                <span data-label="Responsável">{production.createdBy?.name ?? "Sistema"}</span>
                <span data-label="Status">{production.status === "COMPLETED" ? "Concluida" : "Cancelada"}</span>
              </div>
            ))}
            {productions.length === 0 && <p className="empty-state">Nenhuma producao registrada.</p>}
          </div>
        </section>
      </main>
    </>
  );
}
