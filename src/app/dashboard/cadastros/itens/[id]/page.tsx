import Link from "next/link";
import { ArrowLeft, Boxes, RefreshCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { formatQuantity } from "@/lib/stock/quantity";
import {
  BomComponentForm,
  BomComponentStatusForm,
  ConversionForm,
  ConversionStatusForm,
  ItemEditForm,
} from "./item-forms";

const producibleTypes = ["FINISHED_PRODUCT", "INTERMEDIATE", "RESALE"];

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("item.view");
  const { id } = await params;
  const [item, units, categories, componentItems] = await Promise.all([
    prisma.item.findFirst({
      where: { id, companyId: session.company.id },
      include: {
        unit: true,
        unitConversions: { include: { sourceUnit: true }, orderBy: { createdAt: "asc" } },
        productRecipe: {
          where: { companyId: session.company.id },
          include: { componentItem: { include: { unit: true } } },
          orderBy: { createdAt: "asc" },
        },
        usedAsComponent: {
          where: { companyId: session.company.id, product: { companyId: session.company.id } },
          include: { product: { include: { unit: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.unit.findMany({ where: { companyId: session.company.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.itemCategory.findMany({ where: { companyId: session.company.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.item.findMany({
      where: { id: { not: id }, companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!item) notFound();

  const alternativeUnits = units.filter((unit) => unit.id !== item.unitId);
  const editableItem = {
    id: item.id,
    name: item.name,
    type: item.type,
    unitId: item.unitId,
    categoryId: item.categoryId,
    sku: item.sku,
    barcode: item.barcode,
    minimumStock: item.minimumStock.toString(),
    description: item.description,
    status: item.status,
  };
  const canViewBom =
    session.permissions.has("bom.view") ||
    session.permissions.has("recipe.view") ||
    session.permissions.has("item.update") ||
    session.permissions.has("permission.manage");
  const canManageBom =
    session.permissions.has("bom.create") ||
    session.permissions.has("bom.update") ||
    session.permissions.has("recipe.create") ||
    session.permissions.has("recipe.update") ||
    session.permissions.has("item.update") ||
    session.permissions.has("permission.manage");
  const canInactivateBom =
    session.permissions.has("bom.inactivate") ||
    session.permissions.has("recipe.inactivate") ||
    session.permissions.has("item.update") ||
    session.permissions.has("permission.manage");
  const isProducible = producibleTypes.includes(item.type);

  return (
    <>
      <PageHeader title={item.name} subtitle="Manutencao do item, unidades alternativas e ficha tecnica." />
      <main className="page-body">
        <Link href="/dashboard/itens" className="back-link"><ArrowLeft size={15} /> Voltar aos itens</Link>

        <section className="content-card catalog-card item-detail-card">
          <div className="card-heading"><div><span className="eyebrow">Dados do item</span><h3>Informacoes gerais</h3></div><span className={`status-badge ${item.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{item.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></div>
          <ItemEditForm item={editableItem} units={units.map(({ id: unitId, name, symbol }) => ({ id: unitId, name, symbol }))} categories={categories.map(({ id: categoryId, name }) => ({ id: categoryId, name }))} />
        </section>

        {canViewBom && isProducible && (
          <section className="content-card catalog-card item-create-card">
            <div className="card-heading"><div><span className="eyebrow"><Boxes size={14} /> Ficha tecnica</span><h3>Componentes do produto</h3></div></div>
            {canManageBom && (
              <BomComponentForm
                productId={item.id}
                items={componentItems.map((component) => ({ id: component.id, name: component.name, unit: component.unit.symbol }))}
              />
            )}
            {!canManageBom && <p className="table-note">Seu perfil pode consultar a ficha tecnica, mas nao pode adicionar componentes.</p>}
            <div className="conversion-list">
              {item.productRecipe.map((component) => (
                <article className="record-row" key={component.id}>
                  <span className={`metric-icon ${component.status === "ACTIVE" ? "metric-green" : "metric-muted"}`}><Boxes size={17} /></span>
                  <div><strong>{component.componentItem.name}</strong><small>{formatQuantity(component.quantity)} {component.componentItem.unit.symbol} por {item.unit.symbol} produzido</small></div>
                  <span className={`status-badge ${component.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{component.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
                  {component.status === "ACTIVE" && canInactivateBom && <BomComponentStatusForm id={component.id} />}
                </article>
              ))}
              {item.productRecipe.length === 0 && <p className="empty-state">Nenhum componente cadastrado.</p>}
            </div>
          </section>
        )}

        {canViewBom && item.usedAsComponent.length > 0 && (
          <section className="content-card table-card catalog-table item-create-card">
            <div className="card-heading"><div><span className="eyebrow">Uso como componente</span><h3>Produtos que usam este item</h3></div></div>
            <div className="data-table bom-usage-table">
              <div className="table-row table-head"><span>Produto</span><span>Quantidade</span><span>Status</span><span /></div>
              {item.usedAsComponent.map((usage) => (
                <div className="table-row" key={usage.id}>
                  <span data-label="Produto">{usage.product.name}</span>
                  <span data-label="Quantidade">{formatQuantity(usage.quantity)} {item.unit.symbol}</span>
                  <span data-label="Status">{usage.status === "ACTIVE" ? "Ativo" : "Inativo"}</span>
                  <Link className="table-action" data-label="Ação" href={`/dashboard/itens/${usage.productId}`}>Abrir</Link>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="content-card catalog-card item-create-card">
          <div className="card-heading"><div><span className="eyebrow"><RefreshCcw size={14} /> Conversoes</span><h3>Unidades alternativas</h3></div></div>
          <ConversionForm itemId={item.id} stockSymbol={item.unit.symbol} units={alternativeUnits.map(({ id: unitId, name, symbol }) => ({ id: unitId, name, symbol }))} />
          <div className="conversion-list">
            {item.unitConversions.map((conversion) => (
              <article className="record-row" key={conversion.id}>
                <span className="metric-icon metric-violet"><RefreshCcw size={17} /></span>
                <div><strong>1 {conversion.sourceUnit.symbol} = {conversion.factorToStockUnit.toString()} {item.unit.symbol}</strong><small>{conversion.sourceUnit.name} para {item.unit.name}</small></div>
                <span className={`status-badge ${conversion.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{conversion.status === "ACTIVE" ? "Ativa" : "Inativa"}</span>
                <ConversionStatusForm id={conversion.id} active={conversion.status === "ACTIVE"} />
              </article>
            ))}
            {item.unitConversions.length === 0 && <p className="empty-state">Nenhuma unidade alternativa configurada.</p>}
          </div>
        </section>
      </main>
    </>
  );
}
