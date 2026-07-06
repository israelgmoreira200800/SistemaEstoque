import { Factory } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { availableQuantity, formatQuantity, toNumber } from "@/lib/stock/quantity";
import { ProductionForm } from "./production-forms";

export default async function ProductionPage() {
  const session = await requirePermission("production.view");
  const [products, productions] = await Promise.all([
    prisma.item.findMany({
      where: {
        companyId: session.company.id,
        status: "ACTIVE",
        type: { in: ["FINISHED_PRODUCT", "INTERMEDIATE", "RESALE"] },
      },
      include: {
        unit: true,
        productRecipe: {
          where: {
            companyId: session.company.id,
            status: "ACTIVE",
            componentItem: { companyId: session.company.id, status: "ACTIVE" },
          },
          include: { componentItem: { include: { unit: true, stockBalance: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.production.findMany({
      where: { companyId: session.company.id, product: { companyId: session.company.id } },
      include: { product: { include: { unit: true } }, createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const productOptions = products.map((product) => ({
    id: product.id,
    name: product.name,
    unit: product.unit.symbol,
    components: product.productRecipe.map((component) => ({
      itemId: component.componentItemId,
      name: component.componentItem.name,
      unit: component.componentItem.unit.symbol,
      quantity: toNumber(component.quantity),
      balance: availableQuantity(component.componentItem.stockBalance),
    })),
  }));

  return (
    <>
      <PageHeader title="Producao" subtitle="Registre producao com baixa automatica pela ficha tecnica cadastrada." />
      <main className="page-body">
        {session.permissions.has("production.finish") && (
          <section className="content-card catalog-card">
            <div className="card-heading"><div><span className="eyebrow"><Factory size={14} /> Registrar producao</span><h3>Produzir item acabado</h3></div></div>
            <ProductionForm products={productOptions} />
          </section>
        )}

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Producoes recentes</span><h3>{productions.length} registro{productions.length === 1 ? "" : "s"}</h3></div></div>
          <div className="data-table stock-table">
            <div className="table-row table-head"><span>Data</span><span>Produto</span><span>Quantidade</span><span>Responsavel</span><span>Status</span></div>
            {productions.map((production) => (
              <div className="table-row" key={production.id}>
                <span data-label="Data">{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(production.createdAt)}</span>
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
