import { PackageMinus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity } from "@/lib/stock/quantity";
import { ExitForm } from "./exit-form";

export default async function ExitsPage() {
  const session = await requirePermission("stock.exit");
  const [items, movements] = await Promise.all([
    prisma.item.findMany({
      where: { companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true, stockBalance: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockMovement.findMany({
      where: { companyId: session.company.id, type: "EXIT" },
      include: { item: { include: { unit: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <>
      <PageHeader title="Saídas" subtitle="Registre vendas, consumo interno ou retirada de estoque." />
      <main className="page-body">
        <section className="content-card catalog-card">
          <div className="card-heading"><div><span className="eyebrow"><PackageMinus size={14} /> Nova saída</span><h3>Retirar do estoque</h3></div></div>
          <ExitForm items={items.map((item) => ({ id: item.id, name: item.name, unit: item.unit.symbol, balance: formatQuantity(item.stockBalance?.quantityOnHand ?? 0) }))} />
        </section>
        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Últimas saídas</span><h3>{movements.length} movimento{movements.length === 1 ? "" : "s"}</h3></div></div>
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
            {movements.length === 0 && <p className="empty-state">Nenhuma saída registrada.</p>}
          </div>
        </section>
      </main>
    </>
  );
}

