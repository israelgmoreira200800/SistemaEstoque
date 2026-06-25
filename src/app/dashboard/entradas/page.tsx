import { PackagePlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity } from "@/lib/stock/quantity";
import { EntryForm } from "./entry-form";

export default async function EntriesPage() {
  const session = await requirePermission("stock.entry");
  const [items, movements] = await Promise.all([
    prisma.item.findMany({
      where: { companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { companyId: session.company.id, type: "ENTRY", item: { companyId: session.company.id } },
      include: { item: { include: { unit: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <PageHeader title="Entradas" subtitle="Registre compras, recebimentos e saldos iniciais." />
      <main className="page-body">
        <section className="content-card catalog-card">
          <div className="card-heading"><div><span className="eyebrow"><PackagePlus size={14} /> Nova entrada</span><h3>Adicionar ao estoque</h3></div></div>
          <EntryForm items={items.map((item) => ({ id: item.id, name: item.name, unit: item.unit.symbol }))} />
        </section>
        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Últimas entradas</span><h3>{movements.length} movimento{movements.length === 1 ? "" : "s"}</h3></div></div>
          <div className="data-table stock-table">
            <div className="table-row table-head"><span>Data</span><span>Item</span><span>Quantidade</span><span>Responsável</span><span>Documento</span></div>
            {movements.map((movement) => (
              <div className="table-row" key={movement.id}>
                <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(movement.createdAt)}</span>
                <span>{movement.item.name}</span>
                <span>{formatQuantity(movement.quantity)} {movement.item.unit.symbol}</span>
                <span>{movement.createdBy?.name ?? "Sistema"}</span>
                <span>{movement.documentNumber ?? "—"}</span>
              </div>
            ))}
            {movements.length === 0 && <p className="empty-state">Nenhuma entrada registrada.</p>}
          </div>
        </section>
      </main>
    </>
  );
}
