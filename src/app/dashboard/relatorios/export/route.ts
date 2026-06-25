import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { buildCsv } from "@/lib/reports/csv";
import { availableQuantity, formatQuantity } from "@/lib/stock/quantity";

export const dynamic = "force-dynamic";

const exportTypes = ["estoque", "movimentacoes", "pedidos", "producoes"] as const;
type ReportExportType = (typeof exportTypes)[number];

type ReportFile = {
  csv: string;
  filename: string;
  rowCount: number;
};

const itemTypeLabels: Record<string, string> = {
  RAW_MATERIAL: "Materia-prima",
  PACKAGING: "Embalagem",
  COMPONENT: "Componente",
  INTERMEDIATE: "Intermediario",
  FINISHED_PRODUCT: "Produto acabado",
  RESALE: "Revenda",
  INTERNAL_CONSUMPTION: "Consumo interno",
};

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

function isReportExportType(value: string | null): value is ReportExportType {
  return value !== null && exportTypes.includes(value as ReportExportType);
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function reportFilename(type: ReportExportType) {
  return `relatorio-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
}

function getIpAddress(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

async function buildStockReport(companyId: string): Promise<ReportFile> {
  const items = await prisma.item.findMany({
    where: { companyId },
    include: { category: true, stockBalance: true, unit: true },
    orderBy: { name: "asc" },
  });

  const csv = buildCsv(items, [
    { header: "Item", value: (item) => item.name },
    { header: "SKU", value: (item) => item.sku },
    { header: "Tipo", value: (item) => itemTypeLabels[item.type] ?? item.type },
    { header: "Categoria", value: (item) => item.category?.name },
    { header: "Unidade", value: (item) => item.unit.symbol },
    { header: "Status", value: (item) => (item.status === "ACTIVE" ? "Ativo" : "Inativo") },
    { header: "Saldo em maos", value: (item) => formatQuantity(item.stockBalance?.quantityOnHand ?? 0) },
    { header: "Reservado", value: (item) => formatQuantity(item.stockBalance?.quantityReserved ?? 0) },
    { header: "Bloqueado", value: (item) => formatQuantity(item.stockBalance?.quantityBlocked ?? 0) },
    { header: "Disponivel", value: (item) => formatQuantity(availableQuantity(item.stockBalance)) },
    { header: "Estoque minimo", value: (item) => formatQuantity(item.minimumStock) },
  ]);

  return { csv, filename: reportFilename("estoque"), rowCount: items.length };
}

async function buildMovementsReport(companyId: string): Promise<ReportFile> {
  const movements = await prisma.stockMovement.findMany({
    where: { companyId, item: { companyId } },
    include: { createdBy: { select: { name: true } }, item: { include: { unit: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = buildCsv(movements, [
    { header: "Data", value: (movement) => formatDateTime(movement.createdAt) },
    { header: "Tipo", value: (movement) => movementLabels[movement.type] ?? movement.type },
    { header: "Item", value: (movement) => movement.item.name },
    { header: "Quantidade", value: (movement) => formatQuantity(movement.quantity) },
    { header: "Unidade", value: (movement) => movement.item.unit.symbol },
    { header: "Saldo apos", value: (movement) => formatQuantity(movement.balanceAfter) },
    { header: "Documento", value: (movement) => movement.documentNumber },
    { header: "Responsavel", value: (movement) => movement.createdBy?.name ?? "Sistema" },
    { header: "Observacao", value: (movement) => movement.note },
  ]);

  return { csv, filename: reportFilename("movimentacoes"), rowCount: movements.length };
}

async function buildOrdersReport(companyId: string): Promise<ReportFile> {
  const orders = await prisma.customerOrder.findMany({
    where: { companyId },
    include: {
      createdBy: { select: { name: true } },
      items: {
        where: { companyId, item: { companyId } },
        include: { item: { include: { unit: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  type OrderWithItems = (typeof orders)[number];
  type OrderItemWithItem = OrderWithItems["items"][number];
  type OrderReportRow = { order: OrderWithItems; orderItem: OrderItemWithItem | null };

  const rows: OrderReportRow[] = orders.flatMap((order): OrderReportRow[] =>
    order.items.length > 0
      ? order.items.map((orderItem) => ({ order, orderItem }))
      : [{ order, orderItem: null }],
  );

  const csv = buildCsv<OrderReportRow>(rows, [
    { header: "Data", value: ({ order }) => formatDateTime(order.createdAt) },
    { header: "Cliente", value: ({ order }) => order.customerName ?? "Cliente nao informado" },
    { header: "Documento", value: ({ order }) => order.documentNumber },
    { header: "Status", value: ({ order }) => orderStatusLabels[order.status] ?? order.status },
    { header: "Item", value: ({ orderItem }) => orderItem?.item.name },
    { header: "Quantidade", value: ({ orderItem }) => (orderItem ? formatQuantity(orderItem.quantity) : "") },
    { header: "Unidade", value: ({ orderItem }) => orderItem?.item.unit.symbol },
    { header: "Responsavel", value: ({ order }) => order.createdBy?.name ?? "Sistema" },
  ]);

  return { csv, filename: reportFilename("pedidos"), rowCount: rows.length };
}

async function buildProductionsReport(companyId: string): Promise<ReportFile> {
  const productions = await prisma.production.findMany({
    where: { companyId, product: { companyId } },
    include: { createdBy: { select: { name: true } }, product: { include: { unit: true } } },
    orderBy: { createdAt: "desc" },
  });

  const csv = buildCsv(productions, [
    { header: "Data", value: (production) => formatDateTime(production.createdAt) },
    { header: "Produto", value: (production) => production.product.name },
    { header: "Quantidade", value: (production) => formatQuantity(production.quantity) },
    { header: "Unidade", value: (production) => production.product.unit.symbol },
    { header: "Status", value: (production) => (production.status === "COMPLETED" ? "Concluida" : "Cancelada") },
    { header: "Responsavel", value: (production) => production.createdBy?.name ?? "Sistema" },
  ]);

  return { csv, filename: reportFilename("producoes"), rowCount: productions.length };
}

const reportBuilders: Record<ReportExportType, (companyId: string) => Promise<ReportFile>> = {
  estoque: buildStockReport,
  movimentacoes: buildMovementsReport,
  pedidos: buildOrdersReport,
  producoes: buildProductionsReport,
};

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }
  if (!session.permissions.has("report.export")) {
    return NextResponse.json({ error: "Sem permissao para exportar relatorios." }, { status: 403 });
  }

  const type = request.nextUrl.searchParams.get("tipo");
  if (!isReportExportType(type)) {
    return NextResponse.json({ error: "Tipo de relatorio invalido." }, { status: 400 });
  }

  const report = await reportBuilders[type](session.company.id);

  await prisma.auditLog.create({
    data: {
      companyId: session.company.id,
      userId: session.user.id,
      action: "report.exported",
      entityType: "report",
      entityId: type,
      ipAddress: getIpAddress(request),
      metadata: { type, rowCount: report.rowCount },
    },
  });

  return new Response(`\uFEFF${report.csv}`, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${report.filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
