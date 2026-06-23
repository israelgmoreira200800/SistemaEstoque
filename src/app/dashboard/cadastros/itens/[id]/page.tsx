import Link from "next/link";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requirePermission } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ConversionForm, ConversionStatusForm, ItemEditForm } from "./item-forms";

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("item.view");
  const { id } = await params;
  const [item, units, categories] = await Promise.all([
    prisma.item.findFirst({ where: { id, companyId: session.company.id }, include: { unit: true, unitConversions: { include: { sourceUnit: true }, orderBy: { createdAt: "asc" } } } }),
    prisma.unit.findMany({ where: { companyId: session.company.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.itemCategory.findMany({ where: { companyId: session.company.id, status: "ACTIVE" }, orderBy: { name: "asc" } }),
  ]);
  if (!item) notFound();
  const alternativeUnits = units.filter((unit) => unit.id !== item.unitId);
  const editableItem = {
    id: item.id, name: item.name, type: item.type, unitId: item.unitId,
    categoryId: item.categoryId, sku: item.sku, barcode: item.barcode,
    minimumStock: item.minimumStock.toString(), description: item.description, status: item.status,
  };
  return <><PageHeader title={item.name} subtitle="Manutenção do item e unidades alternativas." /><main className="page-body"><Link href="/dashboard/itens" className="back-link"><ArrowLeft size={15} /> Voltar aos itens</Link><section className="content-card catalog-card item-detail-card"><div className="card-heading"><div><span className="eyebrow">Dados do item</span><h3>Informações gerais</h3></div><span className={`status-badge ${item.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{item.status === "ACTIVE" ? "Ativo" : "Inativo"}</span></div><ItemEditForm item={editableItem} units={units.map(({ id: unitId, name, symbol }) => ({ id: unitId, name, symbol }))} categories={categories.map(({ id: categoryId, name }) => ({ id: categoryId, name }))} /></section><section className="content-card catalog-card item-create-card"><div className="card-heading"><div><span className="eyebrow"><RefreshCcw size={14} /> Conversões</span><h3>Unidades alternativas</h3></div></div><ConversionForm itemId={item.id} stockSymbol={item.unit.symbol} units={alternativeUnits.map(({ id: unitId, name, symbol }) => ({ id: unitId, name, symbol }))} /><div className="conversion-list">{item.unitConversions.map((conversion) => <article className="record-row" key={conversion.id}><span className="metric-icon metric-violet"><RefreshCcw size={17} /></span><div><strong>1 {conversion.sourceUnit.symbol} = {conversion.factorToStockUnit.toString()} {item.unit.symbol}</strong><small>{conversion.sourceUnit.name} para {item.unit.name}</small></div><span className={`status-badge ${conversion.status === "INACTIVE" ? "status-inactive" : ""}`}><span />{conversion.status === "ACTIVE" ? "Ativa" : "Inativa"}</span><ConversionStatusForm id={conversion.id} active={conversion.status === "ACTIVE"} /></article>)}{item.unitConversions.length === 0 && <p className="empty-state">Nenhuma unidade alternativa configurada.</p>}</div></section></main></>;
}
