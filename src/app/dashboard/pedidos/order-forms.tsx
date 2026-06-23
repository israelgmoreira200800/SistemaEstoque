"use client";

import { useActionState } from "react";
import { changeOrderStatusAction, createOrderAction, type OrderActionState } from "./actions";

const initialState: OrderActionState = {};

function Feedback({ state }: { state: OrderActionState }) {
  if (state.error) return <p className="catalog-feedback catalog-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="catalog-feedback catalog-success" role="status">{state.success}</p>;
  return null;
}

export function OrderForm({ items }: { items: { id: string; name: string; unit: string }[] }) {
  const [state, action, pending] = useActionState(createOrderAction, initialState);
  return (
    <form action={action} className="item-form">
      <div className="form-row four-columns">
        <label>Cliente<input name="customerName" placeholder="Nome do cliente" /></label>
        <label>Documento<input name="documentNumber" placeholder="Pedido, OS..." /></label>
        <label>Item<select name="itemId" defaultValue="" required><option value="" disabled>Selecione</option>{items.map((item) => <option value={item.id} key={item.id}>{item.name} ({item.unit})</option>)}</select></label>
        <label>Quantidade<input name="quantity" inputMode="decimal" required /></label>
      </div>
      <Feedback state={state} />
      <button className="primary-button form-submit" disabled={pending || items.length === 0}>{pending ? "Criando…" : "Criar pedido"}</button>
    </form>
  );
}

export function OrderStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [state, action, pending] = useActionState(changeOrderStatusAction, initialState);
  return (
    <form action={action} className="inline-status-form">
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={currentStatus} aria-label="Status do pedido">
        <option value="OPEN">Aberto</option>
        <option value="APPROVED">Aprovado</option>
        <option value="IN_PRODUCTION">Em produção</option>
        <option value="READY">Pronto</option>
        <option value="SHIPPED">Enviado</option>
        <option value="CANCELED">Cancelado</option>
      </select>
      <button className="text-button" disabled={pending}>{pending ? "Aguarde…" : "Salvar"}</button>
      <Feedback state={state} />
    </form>
  );
}

