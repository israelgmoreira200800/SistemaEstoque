import { ClipboardCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateStockAdjustmentDelta } from "@/lib/stock/adjustments";
import { formatQuantity, toNumber } from "@/lib/stock/quantity";
import type { Prisma } from "@/generated/prisma/client";
import {
  AdjustmentRequestForm,
  AdjustmentRequestTable,
  type AdjustmentRequestRow,
} from "./adjustment-forms";

const kindLabels = {
  ADJUSTMENT: "Ajuste",
  INVENTORY: "Inventario",
} as const;

const statusLabels = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
  CANCELED: "Cancelada",
} as const;

const statusClassNames = {
  PENDING: "status-pending",
  APPROVED: "",
  REJECTED: "status-rejected",
  CANCELED: "status-inactive",
} as const;

function formatDateTime(date?: Date | null) {
  if (!date) return undefined;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatSignedQuantity(value: unknown, unit: string) {
  const numeric = toNumber(value);
  if (numeric === 0) return `0 ${unit}`;
  const sign = numeric > 0 ? "+" : "-";
  return `${sign}${formatQuantity(Math.abs(numeric))} ${unit}`;
}

type StockAdjustmentWithRelations = Prisma.StockAdjustmentRequestGetPayload<{
  include: {
    item: { include: { unit: true; stockBalance: true } };
    requestedBy: { select: { name: true } };
    reviewedBy: { select: { name: true } };
  };
}>;

function mapRequest(request: StockAdjustmentWithRelations): AdjustmentRequestRow {
  const unit = request.item.unit.symbol;
  const initialDelta = calculateStockAdjustmentDelta({
    currentQuantity: request.currentQuantity,
    requestedQuantity: request.requestedQuantity,
  });

  return {
    id: request.id,
    status: request.status,
    statusLabel: statusLabels[request.status],
    statusClassName: statusClassNames[request.status],
    kindLabel: kindLabels[request.kind],
    itemName: request.item.name,
    unit,
    currentQuantity: formatQuantity(request.currentQuantity),
    requestedQuantity: formatQuantity(request.requestedQuantity),
    currentBalance: formatQuantity(request.item.stockBalance?.quantityOnHand ?? 0),
    initialDelta: formatSignedQuantity(initialDelta.delta, unit),
    appliedDelta: request.appliedDelta == null ? undefined : formatSignedQuantity(request.appliedDelta, unit),
    requestedBy: request.requestedBy?.name ?? "Sistema",
    reviewedBy: request.reviewedBy?.name,
    createdAt: formatDateTime(request.createdAt) ?? "",
    reviewedAt: formatDateTime(request.reviewedAt),
    documentNumber: request.documentNumber ?? undefined,
    reason: request.reason ?? undefined,
    reviewNote: request.reviewNote ?? undefined,
  };
}

export default async function StockAdjustmentsPage() {
  const session = await requireSession();
  const canAdjust = session.permissions.has("stock.adjust");
  const canInventory = session.permissions.has("stock.inventory");
  const canApprove = session.permissions.has("stock.adjust_approve");

  if (!canAdjust && !canInventory && !canApprove) {
    redirect("/dashboard?erro=sem-permissao");
  }

  const [items, pendingRequests, reviewedRequests] = await Promise.all([
    prisma.item.findMany({
      where: { companyId: session.company.id, status: "ACTIVE" },
      include: { unit: true, stockBalance: true },
      orderBy: { name: "asc" },
    }),
    prisma.stockAdjustmentRequest.findMany({
      where: { companyId: session.company.id, status: "PENDING", item: { companyId: session.company.id } },
      include: {
        item: { include: { unit: true, stockBalance: true } },
        requestedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.stockAdjustmentRequest.findMany({
      where: { companyId: session.company.id, status: { not: "PENDING" }, item: { companyId: session.company.id } },
      include: {
        item: { include: { unit: true, stockBalance: true } },
        requestedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { reviewedAt: "desc" },
      take: 30,
    }),
  ]);

  const kindOptions = [
    ...(canAdjust ? [{ value: "ADJUSTMENT" as const, label: "Ajuste" }] : []),
    ...(canInventory ? [{ value: "INVENTORY" as const, label: "Inventario" }] : []),
  ];

  return (
    <>
      <PageHeader title="Ajustes e inventario" subtitle="Solicitacoes revisadas antes de alterar o saldo." />
      <main className="page-body">
        {kindOptions.length > 0 && (
          <section className="content-card catalog-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow"><ClipboardCheck size={14} /> Nova solicitacao</span>
                <h3>Novo saldo contado</h3>
              </div>
            </div>
            <AdjustmentRequestForm
              items={items.map((item) => ({
                id: item.id,
                name: item.name,
                unit: item.unit.symbol,
                balance: formatQuantity(item.stockBalance?.quantityOnHand ?? 0),
              }))}
              kindOptions={kindOptions}
            />
          </section>
        )}

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Pendencias</span>
              <h3>{pendingRequests.length} solicitacao{pendingRequests.length === 1 ? "" : "es"}</h3>
            </div>
          </div>
          <AdjustmentRequestTable
            requests={pendingRequests.map(mapRequest)}
            canApprove={canApprove}
            emptyMessage="Nenhuma solicitacao pendente."
          />
        </section>

        <section className="content-card table-card catalog-table item-create-card">
          <div className="card-heading">
            <div>
              <span className="eyebrow">Ultimas revisoes</span>
              <h3>{reviewedRequests.length} solicitacao{reviewedRequests.length === 1 ? "" : "es"}</h3>
            </div>
          </div>
          <AdjustmentRequestTable
            requests={reviewedRequests.map(mapRequest)}
            canApprove={false}
            emptyMessage="Nenhuma revisao registrada."
          />
        </section>
      </main>
    </>
  );
}
