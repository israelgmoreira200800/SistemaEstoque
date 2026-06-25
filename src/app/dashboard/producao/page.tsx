import { Factory, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity, toNumber } from "@/lib/stock/quantity";
import { ComponentForm, ComponentStatusForm, ProductionForm } from "./production-forms";

export default async function ProductionPage() {
  const session = await requirePermission("production.view");
  const [items, products, components, productions] = await Promise.all([
    prisma.item.findMany({
      where: { companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
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
            componentItem: { companyId: session.company.id },
          },
          include: { componentItem: { include: { unit: true, stockBalance: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.productComponent.findMany({
      where: {
        companyId: session.company.id,
        status: "ACTIVE",
        product: { companyId: session.company.id },
        componentItem: { companyId: session.company.id },
      },
      include: { product: true, componentItem: { include: { unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
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
      balance: toNumber(component.componentItem.stockBalance?.quantityOnHand ?? 0),
    })),
  }));

  return (
    <>
      <PageHeader title="Produção" subtitle="Monte fichas técnicas e registre produção com baixa automática dos componentes." />
      <main className="page-body">
        {session.permissions.has("production.finish") && (
          <section className="content-card catalog-card">
            <div className="card-heading"><div><span className="eyebrow"><Factory size={14} /> Registrar produção</span><h3>Produzir item acabado</h3></div></div>
            <ProductionForm products={productOptions} />
          </section>
        )}

        {session.permissions.has("recipe.update") && (
          <section className="content-card catalog-card item-create-card">
            <div className="card-heading"><div><span className="eyebrow"><ListChecks size={14} /> Ficha técnica</span><h3>Adicionar componente</h3></div></div>
            <ComponentForm
              products={products.map((item) => ({ id: item.id, name: item.name }))}
              items={items.map((item) => ({ id: item.id, name: item.name, unit: item.unit.symbol }))}
            />
          </section>
        )}

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Componentes cadastrados</span><h3>{components.length} item{components.length === 1 ? "" : "s"}</h3></div></div>
          <div className="data-table stock-table">
            <div className="table-row table-head"><span>Produto</span><span>Componente</span><span>Qtd.</span><span>Unidade</span><span /></div>
            {components.map((component) => (
              <div className="table-row" key={component.id}>
                <span>{component.product.name}</span>
                <span>{component.componentItem.name}</span>
                <span>{formatQuantity(component.quantity)}</span>
                <span>{component.componentItem.unit.symbol}</span>
                <span>{session.permissions.has("recipe.inactivate") && <ComponentStatusForm id={component.id} />}</span>
              </div>
            ))}
            {components.length === 0 && <p className="empty-state">Nenhuma ficha técnica cadastrada.</p>}
          </div>
        </section>

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading"><div><span className="eyebrow">Produções recentes</span><h3>{productions.length} registro{productions.length === 1 ? "" : "s"}</h3></div></div>
          <div className="data-table stock-table">
            <div className="table-row table-head"><span>Data</span><span>Produto</span><span>Quantidade</span><span>Responsável</span><span>Status</span></div>
            {productions.map((production) => (
              <div className="table-row" key={production.id}>
                <span>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(production.createdAt)}</span>
                <span>{production.product.name}</span>
                <span>{formatQuantity(production.quantity)} {production.product.unit.symbol}</span>
                <span>{production.createdBy?.name ?? "Sistema"}</span>
                <span>{production.status === "COMPLETED" ? "Concluída" : "Cancelada"}</span>
              </div>
            ))}
            {productions.length === 0 && <p className="empty-state">Nenhuma produção registrada.</p>}
          </div>
        </section>
      </main>
    </>
  );
}
