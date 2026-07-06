"use client";

import { useActionState } from "react";
import {
  approveAdjustmentRequestAction,
  createAdjustmentRequestAction,
  rejectAdjustmentRequestAction,
  type AdjustmentActionState,
} from "./actions";

const initialState: AdjustmentActionState = {};

type AdjustmentKindOption = {
  value: "ADJUSTMENT" | "INVENTORY";
  label: string;
};

type AdjustmentItemOption = {
  id: string;
  name: string;
  unit: string;
  balance: string;
};

export type AdjustmentRequestRow = {
  id: string;
  status: string;
  statusLabel: string;
  statusClassName: string;
  kindLabel: string;
  itemName: string;
  unit: string;
  currentQuantity: string;
  requestedQuantity: string;
  currentBalance: string;
  initialDelta: string;
  appliedDelta?: string;
  requestedBy: string;
  reviewedBy?: string;
  createdAt: string;
  reviewedAt?: string;
  documentNumber?: string;
  reason?: string;
  reviewNote?: string;
};

function Feedback({ state }: { state: AdjustmentActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function AdjustmentRequestForm({
  items,
  kindOptions,
}: {
  items: AdjustmentItemOption[];
  kindOptions: AdjustmentKindOption[];
}) {
  const [state, action, pending] = useActionState(createAdjustmentRequestAction, initialState);

  return (
    <form action={action} className="item-form">
      <div className="form-row four-columns">
        <label>
          Item
          <select name="itemId" defaultValue="" required>
            <option value="" disabled>Selecione</option>
            {items.map((item) => (
              <option value={item.id} key={item.id}>
                {item.name} ({item.balance} {item.unit})
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select name="kind" defaultValue={kindOptions[0]?.value ?? ""} required>
            {kindOptions.map((option) => (
              <option value={option.value} key={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          Novo saldo
          <input name="requestedQuantity" inputMode="decimal" placeholder="Ex.: 10" required />
        </label>
        <label>
          Documento
          <input name="documentNumber" placeholder="Contagem, OS..." />
        </label>
      </div>
      <label>
        Motivo
        <textarea name="reason" rows={2} placeholder="Diferenca de contagem, avaria, conciliacao..." required />
      </label>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending || items.length === 0 || kindOptions.length === 0}>
        {pending ? "Enviando..." : "Solicitar aprovacao"}
      </button>
    </form>
  );
}

function AdjustmentReviewForms({ requestId }: { requestId: string }) {
  const [approveState, approveAction, approving] = useActionState(approveAdjustmentRequestAction, initialState);
  const [rejectState, rejectAction, rejecting] = useActionState(rejectAdjustmentRequestAction, initialState);

  return (
    <div className="adjustment-actions">
      <form action={approveAction} className="compact-form adjustment-review-form">
        <input type="hidden" name="id" value={requestId} />
        <input name="reviewNote" placeholder="Observacao" />
        <button className="secondary-button" disabled={approving || rejecting}>{approving ? "Aprovando..." : "Aprovar"}</button>
        <Feedback state={approveState} />
      </form>
      <form action={rejectAction} className="compact-form adjustment-review-form">
        <input type="hidden" name="id" value={requestId} />
        <input name="reviewNote" placeholder="Motivo da rejeicao" />
        <button className="secondary-button danger-text" disabled={approving || rejecting}>{rejecting ? "Rejeitando..." : "Rejeitar"}</button>
        <Feedback state={rejectState} />
      </form>
    </div>
  );
}

export function AdjustmentRequestTable({
  requests,
  canApprove,
  emptyMessage,
}: {
  requests: AdjustmentRequestRow[];
  canApprove: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="data-table adjustment-table">
      <div className="table-row table-head">
        <span>Status</span>
        <span>Item</span>
        <span>Tipo</span>
        <span>Saldos</span>
        <span>Solicitacao</span>
        <span>Revisao</span>
      </div>
      {requests.map((request) => (
        <div className="table-row" key={request.id}>
          <span data-label="Status"><span className={`status-badge ${request.statusClassName}`}><span />{request.statusLabel}</span></span>
          <span data-label="Item">
            <strong>{request.itemName}</strong>
            <small>{request.currentBalance} {request.unit} agora</small>
          </span>
          <span data-label="Tipo">{request.kindLabel}</span>
          <span data-label="Saldos">
            <strong>{request.currentQuantity} {"->"} {request.requestedQuantity} {request.unit}</strong>
            <small>{request.appliedDelta ?? request.initialDelta}</small>
          </span>
          <span data-label="Solicitação">
            <strong>{request.requestedBy}</strong>
            <small>{request.createdAt}{request.documentNumber ? ` · ${request.documentNumber}` : ""}</small>
            {request.reason && <small>{request.reason}</small>}
          </span>
          <span data-label="Revisão">
            {request.status === "PENDING" && canApprove ? (
              <AdjustmentReviewForms requestId={request.id} />
            ) : (
              <>
                <strong>{request.reviewedBy ?? "Pendente"}</strong>
                <small>{request.reviewedAt ?? "Aguardando revisao"}</small>
                {request.reviewNote && <small>{request.reviewNote}</small>}
              </>
            )}
          </span>
        </div>
      ))}
      {requests.length === 0 && <p className="empty-state">{emptyMessage}</p>}
    </div>
  );
}
