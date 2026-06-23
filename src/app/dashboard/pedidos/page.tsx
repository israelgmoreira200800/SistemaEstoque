import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity } from "@/lib/stock/quantity";
import { OrderForm, OrderStatusForm } from "./order-forms";

const statusLabels: Record<string, string> = {
  OPEN: "Aberto",
  APPROVED: "Aprovado",
  IN_PRODUCTION: "Em produção",
  READY: "Pronto",
  SHIPPED: "Enviado",
  CANCELED: "Cancelado",
};

export default async function OrdersPage() {
  const session = await requirePermission("order.view");
  const [items, orders] = await Promise.all([
    prisma.item.findMany({
      where: { companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.customerOrder.findMany({
      where: { companyId: session.company.id },
      include: {
        items: { include: { item: { include: { unit: true } } } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <>
      <PageHeader title="Pedidos" subtitle="Registre e acompanhe pedidos simples." />
      <main className="page-body">
        {session.permissions.has("order.create") && (
          <section className="content-card catalog-card">
            <div className="card-heading"><div><span className="eyebrow"><ClipboardList size={14} /> Novo pedido</span><h3>Pedido de cliente</h3></div></div>
            <OrderForm items={items.map((item) => ({ id: item.id, name: item.name, unit: item.unit.symbol }))} />
          </section>
        )}

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Pedidos recentes</span><h3>{orders.length} pedido{orders.length === 1 ? "" : "s"}</h3></div></div>
          <div className="data-table order-table">
            <div className="table-row table-head"><span>Pedido</span><span>Itens</span><span>Status</span><span>Responsável</span><span>Ação</span></div>
            {orders.map((order) => (
              <div className="table-row" key={order.id}>
                <span><strong>{order.customerName ?? "Cliente não informado"}</strong><small>{order.documentNumber ?? new Intl.DateTimeFormat("pt-BR").format(order.createdAt)}</small></span>
                <span>{order.items.map((orderItem) => `${formatQuantity(orderItem.quantity)} ${orderItem.item.unit.symbol} ${orderItem.item.name}`).join(", ")}</span>
                <span><span className={`status-badge ${order.status === "CANCELED" ? "status-inactive" : ""}`}><span />{statusLabels[order.status]}</span></span>
                <span>{order.createdBy?.name ?? "Sistema"}</span>
                <span>{session.permissions.has("order.change_status") ? <OrderStatusForm id={order.id} currentStatus={order.status} /> : "—"}</span>
              </div>
            ))}
            {orders.length === 0 && <p className="empty-state">Nenhum pedido registrado.</p>}
          </div>
        </section>
      </main>
    </>
  );
}

