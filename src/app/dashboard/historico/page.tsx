import { History } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity } from "@/lib/stock/quantity";

const movementLabels: Record<string, string> = {
  ENTRY: "Entrada",
  EXIT: "Saída",
  LOSS: "Perda",
  ADJUSTMENT: "Ajuste",
  INVENTORY: "Inventário",
  PRODUCTION_CONSUMPTION: "Consumo na produção",
  PRODUCTION_OUTPUT: "Produto produzido",
  ORDER_RESERVATION: "Reserva de pedido",
  SHIPMENT: "Expedição",
};

export default async function HistoryPage() {
  const session = await requirePermission("stock.view");
  const [movements, audits] = await Promise.all([
    prisma.stockMovement.findMany({
      where: { companyId: session.company.id, item: { companyId: session.company.id } },
      include: { item: { include: { unit: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    session.permissions.has("audit.view")
      ? prisma.auditLog.findMany({
          where: { companyId: session.company.id },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader title="Histórico" subtitle="Movimentações do estoque e auditoria do sistema." />
      <main className="page-body">
        <section className="content-card table-card catalog-table">
          <div className="card-heading"><div><span className="eyebrow"><History size={14} /> Estoque</span><h3>Últimas 100 movimentações</h3></div></div>
          <div className="data-table stock-table">
            <div className="table-row table-head"><span>Data</span><span>Tipo</span><span>Item</span><span>Quantidade</span><span>Saldo após</span></div>
            {movements.map((movement) => (
              <div className="table-row" key={movement.id}>
                <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(movement.createdAt)}</span>
                <span>{movementLabels[movement.type] ?? movement.type}</span>
                <span>{movement.item.name}</span>
                <span>{formatQuantity(movement.quantity)} {movement.item.unit.symbol}</span>
                <span>{formatQuantity(movement.balanceAfter)} {movement.item.unit.symbol}</span>
              </div>
            ))}
            {movements.length === 0 && <p className="empty-state">Nenhuma movimentação registrada.</p>}
          </div>
        </section>

        {session.permissions.has("audit.view") && (
          <section className="content-card table-card catalog-table item-create-card">
            <div className="card-heading"><div><span className="eyebrow">Auditoria</span><h3>Últimos eventos administrativos</h3></div></div>
            <div className="data-table audit-table">
              <div className="table-row table-head"><span>Data</span><span>Ação</span><span>Responsável</span><span>Origem</span></div>
              {audits.map((event) => (
                <div className="table-row" key={event.id}>
                  <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(event.createdAt)}</span>
                  <span><code>{event.action}</code></span>
                  <span>{event.user?.name ?? "Sistema"}</span>
                  <span>{event.ipAddress ?? "Interna"}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
